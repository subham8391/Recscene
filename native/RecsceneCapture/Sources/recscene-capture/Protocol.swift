import Foundation

// MARK: - Commands (stdin, one JSON object per line)

enum CaptureTarget: Codable {
    case display(id: UInt32)
    case window(id: UInt32)
    /// A rectangle in points, relative to the top-left corner of the given display.
    case area(displayId: UInt32, x: Double, y: Double, width: Double, height: Double)

    private enum CodingKeys: String, CodingKey { case kind, id, displayId, x, y, width, height }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .kind) {
        case "display": self = .display(id: try c.decode(UInt32.self, forKey: .id))
        case "window": self = .window(id: try c.decode(UInt32.self, forKey: .id))
        case "area":
            self = .area(
                displayId: try c.decode(UInt32.self, forKey: .displayId),
                x: try c.decode(Double.self, forKey: .x),
                y: try c.decode(Double.self, forKey: .y),
                width: try c.decode(Double.self, forKey: .width),
                height: try c.decode(Double.self, forKey: .height))
        case let other: throw ProtocolError.badCommand("unknown target kind \(other)")
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .display(let id):
            try c.encode("display", forKey: .kind); try c.encode(id, forKey: .id)
        case .window(let id):
            try c.encode("window", forKey: .kind); try c.encode(id, forKey: .id)
        case let .area(displayId, x, y, width, height):
            try c.encode("area", forKey: .kind)
            try c.encode(displayId, forKey: .displayId)
            try c.encode(x, forKey: .x); try c.encode(y, forKey: .y)
            try c.encode(width, forKey: .width); try c.encode(height, forKey: .height)
        }
    }
}

struct StartOptions: Codable {
    var target: CaptureTarget
    var outputDir: String
    var mic = false
    var systemAudio = false
    var fps = 60
    var showCursor = false
    /// "h264" (default) or "hevc".
    var codec = "h264"
    /// Processes whose windows are left out of a display or area capture (the app's own overlays).
    var excludeProcessIds: [Int32] = []

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        target = try c.decode(CaptureTarget.self, forKey: .target)
        outputDir = try c.decode(String.self, forKey: .outputDir)
        mic = try c.decodeIfPresent(Bool.self, forKey: .mic) ?? false
        systemAudio = try c.decodeIfPresent(Bool.self, forKey: .systemAudio) ?? false
        fps = try c.decodeIfPresent(Int.self, forKey: .fps) ?? 60
        showCursor = try c.decodeIfPresent(Bool.self, forKey: .showCursor) ?? false
        codec = try c.decodeIfPresent(String.self, forKey: .codec) ?? "h264"
        excludeProcessIds = try c.decodeIfPresent([Int32].self, forKey: .excludeProcessIds) ?? []
    }
}

enum Command {
    case ping
    case permissions(request: Bool)
    case list
    case start(StartOptions)
    case stop

    static func parse(_ line: String) throws -> Command {
        guard let data = line.data(using: .utf8) else { throw ProtocolError.badCommand("not utf-8") }
        let decoder = JSONDecoder()
        struct Head: Decodable { let cmd: String }
        let head = try decoder.decode(Head.self, from: data)
        switch head.cmd {
        case "ping": return .ping
        case "list": return .list
        case "stop": return .stop
        case "permissions":
            struct P: Decodable { let request: Bool? }
            return .permissions(request: try decoder.decode(P.self, from: data).request ?? false)
        case "start": return .start(try decoder.decode(StartOptions.self, from: data))
        case let other: throw ProtocolError.badCommand("unknown command \(other)")
        }
    }
}

enum ProtocolError: Error, LocalizedError {
    case badCommand(String)
    case notRecording
    case alreadyRecording
    case targetNotFound
    case permission(String)
    case writer(String)

    var code: String {
        switch self {
        case .badCommand: return "bad-command"
        case .notRecording: return "not-recording"
        case .alreadyRecording: return "already-recording"
        case .targetNotFound: return "target-not-found"
        case .permission(let which): return "permission-\(which)"
        case .writer: return "writer"
        }
    }

    var errorDescription: String? {
        switch self {
        case .badCommand(let m): return "Bad command: \(m)"
        case .notRecording: return "Nothing is being recorded"
        case .alreadyRecording: return "A recording is already running"
        case .targetNotFound: return "The display or window to record was not found"
        case .permission(let which): return "Missing \(which) permission"
        case .writer(let m): return "Could not write the recording: \(m)"
        }
    }
}

// MARK: - Events (stdout, one JSON object per line)

struct DisplayInfo: Codable {
    var id: UInt32
    var x: Double, y: Double, width: Double, height: Double
    var scale: Double
    var isMain: Bool
}

struct WindowInfo: Codable {
    var id: UInt32
    var title: String
    var app: String
    var bundleId: String
    var pid: Int32
    var x: Double, y: Double, width: Double, height: Double
}

struct PermissionsInfo: Codable {
    var screen: Bool
    var inputMonitoring: Bool
    var accessibility: Bool
    var microphone: String
}

struct StoppedFiles: Codable {
    var screen: String
    var events: String
    var mic: String?
}

/// Everything the helper prints. `event` is the discriminator.
enum OutEvent: Encodable {
    case pong(version: String)
    case permissions(PermissionsInfo)
    case targets(displays: [DisplayInfo], windows: [WindowInfo])
    case started(outputDir: String, width: Int, height: Int)
    case stopped(durationMs: Double, files: StoppedFiles, micOffsetMs: Double?, frames: Int)
    case warning(message: String)
    case error(code: String, message: String)

    private enum CodingKeys: String, CodingKey {
        case event, version, screen, inputMonitoring, accessibility, microphone, displays, windows, outputDir, width, height
        case durationMs, files, micOffsetMs, frames, message, code
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .pong(let version):
            try c.encode("pong", forKey: .event); try c.encode(version, forKey: .version)
        case .permissions(let p):
            try c.encode("permissions", forKey: .event)
            try c.encode(p.screen, forKey: .screen)
            try c.encode(p.inputMonitoring, forKey: .inputMonitoring)
            try c.encode(p.accessibility, forKey: .accessibility)
            try c.encode(p.microphone, forKey: .microphone)
        case let .targets(displays, windows):
            try c.encode("targets", forKey: .event)
            try c.encode(displays, forKey: .displays); try c.encode(windows, forKey: .windows)
        case let .started(outputDir, width, height):
            try c.encode("started", forKey: .event)
            try c.encode(outputDir, forKey: .outputDir)
            try c.encode(width, forKey: .width); try c.encode(height, forKey: .height)
        case let .stopped(durationMs, files, micOffsetMs, frames):
            try c.encode("stopped", forKey: .event)
            try c.encode(durationMs, forKey: .durationMs)
            try c.encode(files, forKey: .files)
            try c.encodeIfPresent(micOffsetMs, forKey: .micOffsetMs)
            try c.encode(frames, forKey: .frames)
        case .warning(let message):
            try c.encode("warning", forKey: .event); try c.encode(message, forKey: .message)
        case let .error(code, message):
            try c.encode("error", forKey: .event)
            try c.encode(code, forKey: .code); try c.encode(message, forKey: .message)
        }
    }
}

/// Serialised line writer so events from different queues never interleave.
final class Output {
    static let shared = Output()
    private let lock = NSLock()
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.outputFormatting = [.withoutEscapingSlashes]
        return e
    }()

    func send(_ event: OutEvent) {
        guard var data = try? encoder.encode(event) else { return }
        data.append(0x0A)
        lock.lock(); defer { lock.unlock() }
        FileHandle.standardOutput.write(data)
    }

    func error(_ error: Error) {
        if let p = error as? ProtocolError {
            send(.error(code: p.code, message: p.localizedDescription))
        } else {
            send(.error(code: "internal", message: error.localizedDescription))
        }
    }
}
