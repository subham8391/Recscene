import AVFoundation
import CoreMedia
import Foundation

/// A webcam the picker can offer (spec 8).
struct CameraInfo: Codable {
    var id: String
    var name: String
    /// The tallest format the device offers, so the picker can show "1080p".
    var maxHeight: Int
}

/// Records one webcam into camera.mov (H.264) on the same clock as the screen
/// recording (specs 8–10): frames before the screen's first frame are dropped,
/// pauses are cut out exactly like the screen recorder does it, and the file
/// keeps the sensor's full frame (mirroring and shape are editor decisions).
final class Camera: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    static func list() -> [CameraInfo] {
        discovery().devices.map { d in
            CameraInfo(id: d.uniqueID, name: d.localizedName, maxHeight: d.formats.map { Int(CMVideoFormatDescriptionGetDimensions($0.formatDescription).height) }.max() ?? 0)
        }
    }

    private static func discovery() -> AVCaptureDevice.DiscoverySession {
        var types: [AVCaptureDevice.DeviceType] = [.builtInWideAngleCamera, .external]
        if #available(macOS 14.0, *) { types.append(.continuityCamera) }
        return AVCaptureDevice.DiscoverySession(deviceTypes: types, mediaType: .video, position: .unspecified)
    }

    let device: AVCaptureDevice
    private let outputURL: URL
    private let maxHeight: Int
    private let session = AVCaptureSession()
    private let output = AVCaptureVideoDataOutput()
    private let queue = DispatchQueue(label: "app.recscene.capture.camera")
    private var writer: AVAssetWriter?
    private var videoInput: AVAssetWriterInput?
    /// The screen recording's first frame in host time; nothing before it is kept.
    private var base: CMTime?
    private var offset = CMTime.zero
    private var paused = false
    private var pausedAt: CMTime?
    private var lastPTS: CMTime?
    private var lastSample: CMSampleBuffer?
    private var idleTimer: DispatchSourceTimer?
    private(set) var width = 0
    private(set) var height = 0
    private(set) var frames = 0

    /// `deviceId` is a uniqueID from `list()`; "default" or an unknown id falls back to the first camera.
    init(deviceId: String, maxHeight: Int, outputURL: URL) throws {
        let devices = Camera.discovery().devices
        guard let device = devices.first(where: { $0.uniqueID == deviceId }) ?? devices.first else {
            throw ProtocolError.unreadable("No camera is connected")
        }
        self.device = device
        self.outputURL = outputURL
        self.maxHeight = maxHeight
        super.init()
        try? FileManager.default.removeItem(at: outputURL)
        session.beginConfiguration()
        let input = try AVCaptureDeviceInput(device: device)
        guard session.canAddInput(input) else { throw ProtocolError.unreadable("The camera cannot be opened") }
        session.addInput(input)
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        output.alwaysDiscardsLateVideoFrames = true
        output.setSampleBufferDelegate(self, queue: queue)
        guard session.canAddOutput(output) else { throw ProtocolError.unreadable("The camera cannot be recorded") }
        session.addOutput(output)
        // Spec 10: the tallest format at or under the preference, preferring ones that do 30 fps.
        if let format = Camera.bestFormat(of: device, maxHeight: maxHeight) {
            try? device.lockForConfiguration()
            device.activeFormat = format
            if format.videoSupportedFrameRateRanges.contains(where: { $0.maxFrameRate >= 30 && $0.minFrameRate <= 30 }) {
                device.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 30)
                device.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 30)
            }
            device.unlockForConfiguration()
        }
        session.commitConfiguration()
    }

    private static func bestFormat(of device: AVCaptureDevice, maxHeight: Int) -> AVCaptureDevice.Format? {
        let fitting = device.formats.filter { Int(CMVideoFormatDescriptionGetDimensions($0.formatDescription).height) <= maxHeight }
        return fitting.max { a, b in
            let da = CMVideoFormatDescriptionGetDimensions(a.formatDescription), db = CMVideoFormatDescriptionGetDimensions(b.formatDescription)
            if da.height != db.height { return da.height < db.height }
            let fa = a.videoSupportedFrameRateRanges.map(\.maxFrameRate).max() ?? 0, fb = b.videoSupportedFrameRateRanges.map(\.maxFrameRate).max() ?? 0
            return fa < fb
        }
    }

    func start() {
        session.startRunning()
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now() + 1, repeating: 1)
        timer.setEventHandler { [weak self] in self?.repeatLastFrameIfIdle() }
        timer.resume()
        idleTimer = timer
    }

    /// The screen recorder's first frame: camera time zero.
    func align(to screenFirstPTS: CMTime) {
        queue.async { [self] in
            if base == nil { base = screenFirstPTS }
        }
    }

    func pause() {
        queue.sync {
            guard !paused else { return }
            paused = true
            pausedAt = CMClockGetTime(CMClockGetHostTimeClock())
        }
    }

    func resume() {
        queue.sync {
            guard paused, let since = pausedAt else { return }
            offset = CMTimeAdd(offset, CMTimeSubtract(CMClockGetTime(CMClockGetHostTimeClock()), since))
            paused = false
            pausedAt = nil
        }
    }

    func cancel() {
        idleTimer?.cancel()
        session.stopRunning()
        queue.sync {
            if writer?.status == .writing { writer?.cancelWriting() }
            writer = nil
        }
        try? FileManager.default.removeItem(at: outputURL)
    }

    /// Finishes the file; returns nil when no frame was ever written (the file is removed then).
    func stop() async -> Double? {
        idleTimer?.cancel()
        session.stopRunning()
        return await withCheckedContinuation { cont in
            queue.async { [self] in
                guard let writer, let videoInput, writer.status == .writing else {
                    try? FileManager.default.removeItem(at: outputURL)
                    cont.resume(returning: nil)
                    return
                }
                if let last = lastSample, let lastRaw = lastPTS {
                    let endRaw = CMClockGetTime(CMClockGetHostTimeClock())
                    if CMTimeGetSeconds(CMTimeSubtract(endRaw, lastRaw)) > 0.05, let tail = retimed(last, to: recordingTime(of: endRaw)), videoInput.isReadyForMoreMediaData, videoInput.append(tail) {
                        lastPTS = endRaw
                    }
                }
                videoInput.markAsFinished()
                let duration = (lastPTS.map { CMTimeGetSeconds(recordingTime(of: $0)) } ?? 0) * 1000
                writer.finishWriting {
                    cont.resume(returning: writer.error == nil ? duration : nil)
                }
            }
        }
    }

    // MARK: Samples

    func captureOutput(_ output: AVCaptureOutput, didOutput sample: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard !paused, let base else { return }
        let raw = hostTime(of: sample)
        guard CMTimeCompare(raw, base) >= 0 else { return }
        if writer == nil {
            guard let pixels = CMSampleBufferGetImageBuffer(sample) else { return }
            width = CVPixelBufferGetWidth(pixels) & ~1
            height = CVPixelBufferGetHeight(pixels) & ~1
            do { try openWriter() } catch { Output.shared.send(.warning(message: "Camera could not be written: \(error.localizedDescription)")); return }
        }
        guard let videoInput, videoInput.isReadyForMoreMediaData, let shifted = retimed(sample, to: recordingTime(of: raw)), videoInput.append(shifted) else { return }
        frames += 1
        lastPTS = raw
        lastSample = sample
    }

    private func openWriter() throws {
        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mov)
        writer.movieFragmentInterval = CMTime(seconds: 1, preferredTimescale: 600)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: max(4_000_000, width * height * 4),
                AVVideoExpectedSourceFrameRateKey: 30,
                AVVideoMaxKeyFrameIntervalKey: 60,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
            ]
        ])
        input.expectsMediaDataInRealTime = true
        writer.add(input)
        guard writer.startWriting() else { throw ProtocolError.writer(writer.error?.localizedDescription ?? "camera writer failed") }
        writer.startSession(atSourceTime: .zero)
        self.writer = writer
        self.videoInput = input
    }

    /// Recording time of a host-clock moment: since the screen's first frame, minus pauses.
    private func recordingTime(of raw: CMTime) -> CMTime {
        CMTimeSubtract(CMTimeSubtract(raw, base ?? raw), offset)
    }

    /// Capture timestamps come from the session's clock; the screen recorder uses the host clock.
    private func hostTime(of sample: CMSampleBuffer) -> CMTime {
        let pts = CMSampleBufferGetPresentationTimeStamp(sample)
        if let clock = session.synchronizationClock, clock != CMClockGetHostTimeClock() {
            return CMSyncConvertTime(pts, from: clock, to: CMClockGetHostTimeClock())
        }
        return pts
    }

    private func repeatLastFrameIfIdle() {
        guard !paused, writer?.status == .writing, let videoInput, let last = lastSample, let lastRaw = lastPTS else { return }
        let now = CMClockGetTime(CMClockGetHostTimeClock())
        guard CMTimeGetSeconds(CMTimeSubtract(now, lastRaw)) >= 1, let tail = retimed(last, to: recordingTime(of: now)), videoInput.isReadyForMoreMediaData, videoInput.append(tail) else { return }
        lastPTS = now
        frames += 1
    }

    private func retimed(_ sample: CMSampleBuffer, to pts: CMTime) -> CMSampleBuffer? {
        var timing = CMSampleTimingInfo(duration: CMTime(value: 1, timescale: 30), presentationTimeStamp: pts, decodeTimeStamp: .invalid)
        var copy: CMSampleBuffer?
        let status = CMSampleBufferCreateCopyWithNewTiming(allocator: kCFAllocatorDefault, sampleBuffer: sample, sampleTimingEntryCount: 1, sampleTimingArray: &timing, sampleBufferOut: &copy)
        return status == noErr ? copy : nil
    }
}
