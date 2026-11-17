import CoreMedia
import Foundation

/// One recording: the screen recorder, event recorder and optional microphone, plus the files they produce.
final class Session {
    let outputDir: URL
    private let recorder: Recorder
    private let events: EventRecorder
    private let microphone: Microphone?
    private let clock = SessionClock()

    init(options: StartOptions) async throws {
        let resolved = try await Targets.resolve(options.target, excludingProcessIds: options.excludeProcessIds)
        outputDir = URL(fileURLWithPath: options.outputDir, isDirectory: true)
        try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)
        let screenURL = outputDir.appendingPathComponent("screen.mov")
        try? FileManager.default.removeItem(at: screenURL)
        recorder = try Recorder(resolved: resolved, options: options, outputURL: screenURL)
        events = EventRecorder(region: resolved.region, clock: clock)
        if options.mic {
            let status = await Permissions.microphone(request: true)
            guard status == "granted" else { throw ProtocolError.permission("microphone") }
            let micURL = outputDir.appendingPathComponent("mic.m4a")
            try? FileManager.default.removeItem(at: micURL)
            microphone = try Microphone(url: micURL, autoGain: options.micAutoGain, enhance: options.micEnhance)
        } else {
            microphone = nil
        }
        recorder.onFirstFrame = { [clock] pts in
            clock.start(at: CMTimeGetSeconds(pts))
        }
        recorder.onStreamError = { error in
            Output.shared.send(.error(code: "stream", message: error.localizedDescription))
        }
    }

    var width: Int { recorder.width }
    var height: Int { recorder.height }

    func start() async throws {
        events.start()
        try microphone?.start()
        try await recorder.start()
    }

    func pause() throws -> OutEvent {
        guard let t = clock.pause(at: ProcessInfo.processInfo.systemUptime) else { throw ProtocolError.alreadyPaused }
        recorder.pause()
        microphone?.pause()
        return .paused(timeMs: t * 1000)
    }

    func resume() throws -> OutEvent {
        guard let t = clock.resume(at: ProcessInfo.processInfo.systemUptime) else { throw ProtocolError.notPaused }
        recorder.resume()
        microphone?.resume()
        return .resumed(timeMs: t * 1000)
    }

    func mark(kind: String) -> OutEvent {
        .marked(kind: kind, timeMs: (clock.now() ?? 0) * 1000)
    }

    /// Stops and deletes everything this session wrote (specs 23–24).
    func cancel() async -> OutEvent {
        microphone?.discard()
        await recorder.cancel()
        _ = events.stop()
        for name in ["screen.mov", "mic.m4a", "events.json"] {
            try? FileManager.default.removeItem(at: outputDir.appendingPathComponent(name))
        }
        return .cancelled
    }

    func stop() async throws -> OutEvent {
        if clock.isPaused { _ = try? resume() }
        microphone?.stop()
        let durationMs = try await recorder.stop()
        let eventsFile = events.stop()
        let eventsURL = outputDir.appendingPathComponent("events.json")
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        try encoder.encode(eventsFile).write(to: eventsURL)
        var micOffsetMs: Double?
        if let microphone, let offset = clock.time(at: microphone.startedAt) {
            micOffsetMs = offset * 1000
        } else if let microphone, clock.isStarted {
            micOffsetMs = -((clock.now() ?? 0) - (ProcessInfo.processInfo.systemUptime - microphone.startedAt)) * 1000
        }
        return .stopped(
            durationMs: durationMs,
            files: StoppedFiles(
                screen: outputDir.appendingPathComponent("screen.mov").path,
                events: eventsURL.path,
                mic: microphone == nil ? nil : outputDir.appendingPathComponent("mic.m4a").path),
            micOffsetMs: micOffsetMs,
            frames: recorder.frames)
    }
}
