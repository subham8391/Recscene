import AVFoundation
import CoreMedia
import Foundation
import ScreenCaptureKit

/// Records one SCStream into a .mov through AVAssetWriter.
final class Recorder: NSObject, SCStreamOutput, SCStreamDelegate {
    let width: Int
    let height: Int
    private let stream: SCStream
    private let writer: AVAssetWriter
    private let videoInput: AVAssetWriterInput
    private let audioInput: AVAssetWriterInput?
    private let queue = DispatchQueue(label: "app.recscene.capture.stream")
    private var firstPTS: CMTime?
    private var lastPTS: CMTime?
    /// Total paused time removed from every timestamp after a resume (spec 22).
    private var offset = CMTime.zero
    private var paused = false
    private var pausedAt: CMTime?
    private var lastSample: CMSampleBuffer?
    private let frameInterval: CMTime
    private(set) var frames = 0
    var onFirstFrame: ((CMTime) -> Void)?
    var onStreamError: ((Error) -> Void)?

    init(resolved: Targets.Resolved, options: StartOptions, outputURL: URL) throws {
        let filter = resolved.filter
        let scale = CGFloat(filter.pointPixelScale)
        let rect = resolved.sourceRect ?? filter.contentRect
        // H.264 and HEVC want even dimensions.
        width = max(2, Int(rect.width * scale) & ~1)
        height = max(2, Int(rect.height * scale) & ~1)

        frameInterval = CMTime(value: 1, timescale: CMTimeScale(max(1, min(options.fps, 120))))
        let config = SCStreamConfiguration()
        config.width = width
        config.height = height
        if let source = resolved.sourceRect { config.sourceRect = source }
        config.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(max(1, min(options.fps, 120))))
        config.pixelFormat = kCVPixelFormatType_32BGRA
        config.showsCursor = options.showCursor
        config.queueDepth = 8
        config.capturesAudio = options.systemAudio
        config.excludesCurrentProcessAudio = true
        config.sampleRate = 48_000
        config.channelCount = 2

        writer = try AVAssetWriter(outputURL: outputURL, fileType: .mov)
        // Write a movie fragment every 2 s so an interrupted recording stays playable (spec 40).
        writer.movieFragmentInterval = CMTime(seconds: 2, preferredTimescale: 600)
        let codec: AVVideoCodecType = options.codec == "hevc" ? .hevc : .h264
        let bitrate = max(10_000_000, width * height * 6)
        var compression: [String: Any] = [
            AVVideoAverageBitRateKey: bitrate,
            AVVideoExpectedSourceFrameRateKey: options.fps,
            AVVideoMaxKeyFrameIntervalKey: options.fps * 2
        ]
        if codec == .h264 { compression[AVVideoProfileLevelKey] = AVVideoProfileLevelH264HighAutoLevel }
        videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: codec,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: compression
        ])
        videoInput.expectsMediaDataInRealTime = true
        writer.add(videoInput)

        if options.systemAudio {
            let a = AVAssetWriterInput(mediaType: .audio, outputSettings: [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 48_000,
                AVNumberOfChannelsKey: 2,
                AVEncoderBitRateKey: 192_000
            ])
            a.expectsMediaDataInRealTime = true
            writer.add(a)
            audioInput = a
        } else {
            audioInput = nil
        }

        stream = SCStream(filter: filter, configuration: config, delegate: nil)
        super.init()
        try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: queue)
        if options.systemAudio { try stream.addStreamOutput(self, type: .audio, sampleHandlerQueue: queue) }
    }

    func start() async throws {
        guard writer.startWriting() else { throw ProtocolError.writer(writer.error?.localizedDescription ?? "startWriting failed") }
        try await stream.startCapture()
    }

    func pause() {
        queue.sync {
            guard !paused else { return }
            paused = true
            pausedAt = CMClockGetTime(CMClockGetHostTimeClock())
        }
    }

    /// Every timestamp after this point is shifted back by the length of the pause.
    func resume() {
        queue.sync {
            guard paused, let since = pausedAt else { return }
            offset = CMTimeAdd(offset, CMTimeSubtract(CMClockGetTime(CMClockGetHostTimeClock()), since))
            paused = false
            pausedAt = nil
        }
    }

    /// Stops capture and throws the file away.
    func cancel() async {
        try? await stream.stopCapture()
        queue.sync {
            if writer.status == .writing { writer.cancelWriting() }
        }
    }

    /// Stops capture and finishes the file. Returns the duration in ms.
    func stop() async throws -> Double {
        try? await stream.stopCapture()
        return try await withCheckedThrowingContinuation { cont in
            queue.async {
                // A static screen sends no frames, so repeat the last one at the stop time: the file then lasts as long as the recording.
                if let last = self.lastSample, let lastRaw = self.lastPTS {
                    let endRaw = CMClockGetTime(CMClockGetHostTimeClock())
                    if CMTimeCompare(endRaw, CMTimeAdd(lastRaw, self.frameInterval)) > 0, let tail = self.shifted(last, to: CMTimeSubtract(endRaw, self.offset), duration: self.frameInterval, force: true), self.videoInput.isReadyForMoreMediaData, self.videoInput.append(tail) {
                        self.lastPTS = endRaw
                        self.frames += 1
                    }
                }
                self.videoInput.markAsFinished()
                self.audioInput?.markAsFinished()
                guard self.writer.status == .writing else {
                    cont.resume(throwing: ProtocolError.writer(self.writer.error?.localizedDescription ?? "writer status \(self.writer.status.rawValue)"))
                    return
                }
                self.writer.finishWriting {
                    if let error = self.writer.error {
                        cont.resume(throwing: ProtocolError.writer(error.localizedDescription))
                    } else if let first = self.firstPTS, let last = self.lastPTS {
                        cont.resume(returning: CMTimeGetSeconds(CMTimeSubtract(CMTimeSubtract(last, self.offset), first)) * 1000)
                    } else {
                        cont.resume(returning: 0)
                    }
                }
            }
        }
    }

    // MARK: SCStreamOutput

    func stream(_ stream: SCStream, didOutputSampleBuffer sample: CMSampleBuffer, of type: SCStreamOutputType) {
        guard sample.isValid, writer.status == .writing, !paused else { return }
        let rawPTS = CMSampleBufferGetPresentationTimeStamp(sample)
        switch type {
        case .screen:
            guard isComplete(sample) else { return }
            beginSessionIfNeeded(at: rawPTS)
            let pts = CMTimeSubtract(rawPTS, offset)
            guard let shifted = shifted(sample, to: pts), videoInput.isReadyForMoreMediaData, videoInput.append(shifted) else { return }
            frames += 1
            lastPTS = rawPTS
            lastSample = sample
        case .audio:
            guard let audioInput, firstPTS != nil, audioInput.isReadyForMoreMediaData else { return }
            if let shifted = shifted(sample, to: CMTimeSubtract(rawPTS, offset)) { audioInput.append(shifted) }
        case .microphone:
            break
        @unknown default:
            break
        }
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        onStreamError?(error)
    }

    private func shifted(_ sample: CMSampleBuffer, to pts: CMTime, duration: CMTime? = nil, force: Bool = false) -> CMSampleBuffer? {
        if offset == .zero && !force { return sample }
        var timing = CMSampleTimingInfo(duration: duration ?? CMSampleBufferGetDuration(sample), presentationTimeStamp: pts, decodeTimeStamp: .invalid)
        var copy: CMSampleBuffer?
        let status = CMSampleBufferCreateCopyWithNewTiming(allocator: kCFAllocatorDefault, sampleBuffer: sample, sampleTimingEntryCount: 1, sampleTimingArray: &timing, sampleBufferOut: &copy)
        return status == noErr ? copy : nil
    }

    private func isComplete(_ sample: CMSampleBuffer) -> Bool {
        guard let attachments = CMSampleBufferGetSampleAttachmentsArray(sample, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
              let status = attachments.first?[.status] as? Int else { return false }
        return status == SCFrameStatus.complete.rawValue
    }

    private func beginSessionIfNeeded(at pts: CMTime) {
        guard firstPTS == nil else { return }
        firstPTS = pts
        lastPTS = pts
        writer.startSession(atSourceTime: pts)
        onFirstFrame?(pts)
    }
}
