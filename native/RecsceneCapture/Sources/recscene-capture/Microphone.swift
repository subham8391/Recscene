import AVFoundation
import Foundation

/// Records the default microphone to an AAC .m4a file.
final class Microphone {
    private let recorder: AVAudioRecorder
    /// System uptime (seconds, same clock as CMSampleBuffer timestamps) when recording began.
    private(set) var startedAt: TimeInterval = 0

    init(url: URL) throws {
        recorder = try AVAudioRecorder(url: url, settings: [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 48_000,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ])
    }

    func start() throws {
        guard recorder.prepareToRecord(), recorder.record() else { throw ProtocolError.writer("microphone would not start") }
        startedAt = ProcessInfo.processInfo.systemUptime
    }

    func pause() { recorder.pause() }
    func resume() { recorder.record() }

    func stop() {
        recorder.stop()
    }

    func discard() {
        recorder.stop()
        recorder.deleteRecording()
    }
}
