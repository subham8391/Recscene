import CoreMedia
import Foundation

/// One recording: the screen recorder, event recorder and optional microphone, plus the files they produce.
final class Session {
    let outputDir: URL
    private let recorder: Recorder
    private let events: EventRecorder
    private let microphone: Microphone?

    init(options: StartOptions) async throws {
        let resolved = try await Targets.resolve(options.target, excludingProcessIds: options.excludeProcessIds)
        outputDir = URL(fileURLWithPath: options.outputDir, isDirectory: true)
        try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)
        let screenURL = outputDir.appendingPathComponent("screen.mov")
        try? FileManager.default.removeItem(at: screenURL)
        recorder = try Recorder(resolved: resolved, options: options, outputURL: screenURL)
        events = EventRecorder(region: resolved.region)
        if options.mic {
            let status = await Permissions.microphone(request: true)
            guard status == "granted" else { throw ProtocolError.permission("microphone") }
            let micURL = outputDir.appendingPathComponent("mic.m4a")
            try? FileManager.default.removeItem(at: micURL)
            microphone = try Microphone(url: micURL)
        } else {
            microphone = nil
        }
        recorder.onFirstFrame = { [events] pts in
            events.startUptime = CMTimeGetSeconds(pts)
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

    func stop() async throws -> OutEvent {
        microphone?.stop()
        let durationMs = try await recorder.stop()
        let eventsFile = events.stop()
        let eventsURL = outputDir.appendingPathComponent("events.json")
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        try encoder.encode(eventsFile).write(to: eventsURL)
        var micOffsetMs: Double?
        if let microphone, let start = events.startUptime {
            micOffsetMs = (microphone.startedAt - start) * 1000
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
