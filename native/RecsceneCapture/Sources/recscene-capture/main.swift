import AppKit
import Foundation

let version = "0.1.0"
var session: Session?
let output = Output.shared

func handle(_ command: Command) async {
    do {
        switch command {
        case .ping:
            output.send(.pong(version: version))
        case .permissions(let request):
            output.send(.permissions(await Permissions.current(request: request)))
        case .list:
            output.send(try await Targets.list())
        case .start(let options):
            guard session == nil else { throw ProtocolError.alreadyRecording }
            let s = try await Session(options: options)
            try await s.start()
            session = s
            output.send(.started(outputDir: s.outputDir.path, width: s.width, height: s.height))
        case .stop:
            guard let s = session else { throw ProtocolError.notRecording }
            session = nil
            output.send(try await s.stop())
        case .pause:
            guard let s = session else { throw ProtocolError.notRecording }
            output.send(try s.pause())
        case .resume:
            guard let s = session else { throw ProtocolError.notRecording }
            output.send(try s.resume())
        case .mark(let kind):
            guard let s = session else { throw ProtocolError.notRecording }
            output.send(s.mark(kind: kind))
        case .cancel:
            guard let s = session else { throw ProtocolError.notRecording }
            session = nil
            output.send(await s.cancel())
        }
    } catch {
        output.error(error)
    }
}

// Commands arrive one per line on stdin; they run in order on the main queue so
// the CGEvent tap and ScreenCaptureKit callbacks share the main run loop.
let reader = Thread {
    while let line = readLine(strippingNewline: true) {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { continue }
        let parsed: Command
        do { parsed = try Command.parse(trimmed) } catch { output.error(error); continue }
        let done = DispatchSemaphore(value: 0)
        Task { @MainActor in
            await handle(parsed)
            done.signal()
        }
        done.wait()
    }
    // stdin closed: stop any recording, then exit.
    let done = DispatchSemaphore(value: 0)
    Task { @MainActor in
        if let s = session { session = nil; output.send((try? await s.stop()) ?? .warning(message: "recording stopped without a file")) }
        done.signal()
    }
    done.wait()
    exit(0)
}
reader.start()
// An NSApplication (never shown in the Dock) is needed for global NSEvent monitors to deliver events.
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
app.run()
