import AVFoundation
import CoreMedia
import Foundation
import ImageIO
import UniformTypeIdentifiers

/// Reading and converting existing video files (specs 7 and 40).
enum Media {
    struct Info { var durationMs: Double; var width: Int; var height: Int; var hasAudio: Bool }

    static func probe(path: String) async throws -> Info {
        let asset = AVURLAsset(url: URL(fileURLWithPath: path))
        let duration: CMTime
        do { duration = try await asset.load(.duration) } catch { throw ProtocolError.unreadable("Unable to get video duration") }
        guard let track = try? await asset.loadTracks(withMediaType: .video).first,
              let size = try? await track.load(.naturalSize), let transform = try? await track.load(.preferredTransform)
        else { throw ProtocolError.unreadable("Error getting video dimensions: no video track") }
        let rect = CGRect(origin: .zero, size: size).applying(transform)
        let audio = (try? await asset.loadTracks(withMediaType: .audio))?.isEmpty == false
        return Info(durationMs: CMTimeGetSeconds(duration) * 1000, width: Int(abs(rect.width)), height: Int(abs(rect.height)), hasAudio: audio)
    }

    /// Copies an .mp4/.mov as-is when it is H.264 or HEVC; converts anything else (and GIFs) to H.264 .mov.
    static func importVideo(path: String, output: String) async throws -> (Info, Bool) {
        let source = URL(fileURLWithPath: path)
        let target = URL(fileURLWithPath: output)
        try? FileManager.default.removeItem(at: target)
        if source.pathExtension.lowercased() == "gif" {
            try await convertGIF(source, to: target)
            return (try await probe(path: output), true)
        }
        guard ["mp4", "mov", "m4v"].contains(source.pathExtension.lowercased()) else {
            throw ProtocolError.unreadable("File is not an mp4 or gif: \(source.lastPathComponent)")
        }
        let asset = AVURLAsset(url: source)
        let descriptions = try await asset.loadTracks(withMediaType: .video).first?.load(.formatDescriptions) ?? []
        let codecs = descriptions.map { CMFormatDescriptionGetMediaSubType($0) }
        let passthrough = codecs.contains(kCMVideoCodecType_H264) || codecs.contains(kCMVideoCodecType_HEVC)
        if passthrough {
            try FileManager.default.copyItem(at: source, to: target)
            return (try await probe(path: output), false)
        }
        guard let export = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else { throw ProtocolError.unreadable("Cannot convert this video") }
        export.outputURL = target
        export.outputFileType = .mov
        await export.export()
        if let error = export.error { throw ProtocolError.unreadable("Conversion failed: \(error.localizedDescription)") }
        return (try await probe(path: output), true)
    }

    /// Spec 233: the renderer encodes video; this joins it with the mixed audio (a WAV) into an MP4.
    /// The WAV is first encoded to AAC, then both compressed tracks are composed and passed through.
    static func mux(video: String, audio: String?, output: String) async throws -> Double {
        let target = URL(fileURLWithPath: output)
        try? FileManager.default.removeItem(at: target)
        let composition = AVMutableComposition()
        let videoAsset = AVURLAsset(url: URL(fileURLWithPath: video))
        guard let videoTrack = try await videoAsset.loadTracks(withMediaType: .video).first else { throw ProtocolError.unreadable("No video track to mux") }
        let videoDuration = try await videoAsset.load(.duration)
        guard let compVideo = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else { throw ProtocolError.writer("composition video track") }
        try compVideo.insertTimeRange(CMTimeRange(start: .zero, duration: videoDuration), of: videoTrack, at: .zero)

        var aacURL: URL?
        if let audio {
            let wavAsset = AVURLAsset(url: URL(fileURLWithPath: audio))
            if let wavTrack = try await wavAsset.loadTracks(withMediaType: .audio).first {
                let m4a = target.deletingPathExtension().appendingPathExtension("audio.m4a")
                try? FileManager.default.removeItem(at: m4a)
                guard let aac = AVAssetExportSession(asset: wavAsset, presetName: AVAssetExportPresetAppleM4A) else { throw ProtocolError.writer("AAC encoder") }
                aac.outputURL = m4a
                aac.outputFileType = .m4a
                await aac.export()
                if let error = aac.error { throw ProtocolError.writer("AAC encoding failed: \(error.localizedDescription)") }
                let aacAsset = AVURLAsset(url: m4a)
                if let aacTrack = try await aacAsset.loadTracks(withMediaType: .audio).first, let compAudio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
                    let d = try await aacAsset.load(.duration)
                    try compAudio.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(d, videoDuration)), of: aacTrack, at: .zero)
                    aacURL = m4a
                }
                _ = wavTrack
            }
        }
        guard let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetPassthrough) else { throw ProtocolError.writer("MP4 export") }
        export.outputURL = target
        export.outputFileType = .mp4
        export.shouldOptimizeForNetworkUse = true
        await export.export()
        if let aacURL { try? FileManager.default.removeItem(at: aacURL) }
        if let error = export.error { throw ProtocolError.writer("Mux failed: \(error.localizedDescription)") }
        let duration = try await AVURLAsset(url: target).load(.duration)
        return CMTimeGetSeconds(duration) * 1000
    }

    /// Decodes GIF frames with ImageIO and writes them as H.264 at their own delays.
    private static func convertGIF(_ source: URL, to target: URL) async throws {
        guard let src = CGImageSourceCreateWithURL(source as CFURL, nil), CGImageSourceGetCount(src) > 0,
              let first = CGImageSourceCreateImageAtIndex(src, 0, nil) else { throw ProtocolError.unreadable("Unable to read the GIF") }
        let width = first.width & ~1, height = first.height & ~1
        let writer = try AVAssetWriter(outputURL: target, fileType: .mov)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: max(4_000_000, width * height * 4)]
        ])
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height
        ])
        writer.add(input)
        guard writer.startWriting() else { throw ProtocolError.writer(writer.error?.localizedDescription ?? "GIF writer") }
        writer.startSession(atSourceTime: .zero)
        var time = 0.0
        for i in 0..<CGImageSourceGetCount(src) {
            guard let image = CGImageSourceCreateImageAtIndex(src, i, nil) else { continue }
            let props = CGImageSourceCopyPropertiesAtIndex(src, i, nil) as? [CFString: Any]
            let gif = props?[kCGImagePropertyGIFDictionary] as? [CFString: Any]
            let delay = (gif?[kCGImagePropertyGIFUnclampedDelayTime] as? Double).flatMap { $0 > 0 ? $0 : nil } ?? (gif?[kCGImagePropertyGIFDelayTime] as? Double) ?? 0.1
            while !input.isReadyForMoreMediaData { try await Task.sleep(nanoseconds: 5_000_000) }
            guard let pool = adaptor.pixelBufferPool else { break }
            var buffer: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &buffer)
            guard let pixel = buffer else { break }
            CVPixelBufferLockBaseAddress(pixel, [])
            if let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pixel), width: width, height: height, bitsPerComponent: 8,
                                   bytesPerRow: CVPixelBufferGetBytesPerRow(pixel), space: CGColorSpaceCreateDeviceRGB(),
                                   bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) {
                ctx.setFillColor(CGColor(gray: 1, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
                ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
            }
            CVPixelBufferUnlockBaseAddress(pixel, [])
            adaptor.append(pixel, withPresentationTime: CMTime(seconds: time, preferredTimescale: 600))
            time += max(0.02, delay)
        }
        input.markAsFinished()
        writer.endSession(atSourceTime: CMTime(seconds: time, preferredTimescale: 600))
        await writer.finishWriting()
        if let error = writer.error { throw ProtocolError.writer(error.localizedDescription) }
    }
}
