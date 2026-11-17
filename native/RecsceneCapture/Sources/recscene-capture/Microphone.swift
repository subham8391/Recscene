import AVFoundation
import Foundation

/// Records the default microphone to an AAC .m4a file.
/// Specs 15–16: when `autoGain` or `enhance` is set, AVAudioEngine voice
/// processing (automatic gain, noise suppression) is tried first; if the
/// audio device refuses it, the microphone is recorded plainly through
/// AVAudioRecorder and a warning is sent. Audio is dropped while paused so
/// the file stays aligned with the paused video.
final class Microphone {
    private let url: URL
    private let wantsVoiceProcessing: Bool
    private let autoGain: Bool
    private var engine: AVAudioEngine?
    private var file: AVAudioFile?
    private var recorder: AVAudioRecorder?
    private let lock = NSLock()
    private var paused = false
    /// System uptime (seconds, same clock as CMSampleBuffer timestamps) when recording began.
    private(set) var startedAt: TimeInterval = 0
    private(set) var voiceProcessing = false

    init(url: URL, autoGain: Bool, enhance: Bool) throws {
        self.url = url
        self.autoGain = autoGain
        wantsVoiceProcessing = autoGain || enhance
    }

    func start() throws {
        try? FileManager.default.removeItem(at: url)
        if wantsVoiceProcessing {
            do {
                try startVoiceProcessing()
                voiceProcessing = true
                startedAt = ProcessInfo.processInfo.systemUptime
                return
            } catch {
                Output.shared.send(.warning(message: "Voice processing is not available for this microphone; recording it plainly."))
                engine?.stop()
                engine = nil
                lock.lock(); file = nil; lock.unlock()
                try? FileManager.default.removeItem(at: url)
            }
        }
        try startPlain()
        startedAt = ProcessInfo.processInfo.systemUptime
    }

    private func startVoiceProcessing() throws {
        let engine = AVAudioEngine()
        self.engine = engine
        let input = engine.inputNode
        try input.setVoiceProcessingEnabled(true)
        if #available(macOS 14.0, *) { input.isVoiceProcessingAGCEnabled = autoGain }
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, (1...2).contains(format.channelCount) else { throw ProtocolError.writer("unusable microphone format") }
        let file = try AVAudioFile(forWriting: url, settings: [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: format.sampleRate,
            AVNumberOfChannelsKey: format.channelCount,
            AVEncoderBitRateKey: 128_000
        ], commonFormat: format.commonFormat, interleaved: format.isInterleaved)
        lock.lock(); self.file = file; lock.unlock()
        var delivered = false
        input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, _ in
            guard let self else { return }
            self.lock.lock(); defer { self.lock.unlock() }
            delivered = true
            guard !self.paused, let file = self.file else { return }
            try? file.write(from: buffer)
        }
        engine.prepare()
        try engine.start()
        // Some devices accept voice processing but never deliver audio; give up on them quickly.
        Thread.sleep(forTimeInterval: 0.4)
        lock.lock(); let ok = delivered; lock.unlock()
        guard ok else { throw ProtocolError.writer("voice processing delivers no audio") }
    }

    private func startPlain() throws {
        let recorder = try AVAudioRecorder(url: url, settings: [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 48_000,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ])
        guard recorder.prepareToRecord(), recorder.record() else { throw ProtocolError.writer("microphone would not start") }
        self.recorder = recorder
    }

    func pause() {
        lock.lock(); paused = true; lock.unlock()
        recorder?.pause()
    }

    func resume() {
        lock.lock(); paused = false; lock.unlock()
        recorder?.record()
    }

    func stop() {
        engine?.inputNode.removeTap(onBus: 0)
        engine?.stop()
        engine = nil
        lock.lock(); file = nil; lock.unlock()
        recorder?.stop()
        recorder = nil
    }

    func discard() {
        stop()
        try? FileManager.default.removeItem(at: url)
    }
}
