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
    /// Spec 15: automatic gain control on the microphone (default on).
    var micAutoGain = true
    /// Spec 16: voice processing (noise suppression) while recording the microphone.
    var micEnhance = false
    /// Spec 8: a camera uniqueID from the `cameras` command, or "default"; nil records no camera.
    var camera: String?
    /// Spec 10: the camera is recorded at the tallest format at or under this height.
    var cameraMaxHeight = 1080

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
        micAutoGain = try c.decodeIfPresent(Bool.self, forKey: .micAutoGain) ?? true
        micEnhance = try c.decodeIfPresent(Bool.self, forKey: .micEnhance) ?? false
        camera = try c.decodeIfPresent(String.self, forKey: .camera)
        cameraMaxHeight = try c.decodeIfPresent(Int.self, forKey: .cameraMaxHeight) ?? 1080
    }
}

enum Command {
    case ping
    case permissions(request: Bool)
    case list
    /// Lists the webcams (spec 8).
    case cameras
    case start(StartOptions)
    case stop
    case pause
    case resume
    case mark(kind: String)
    case cancel
    /// Reads duration and size of a video file (recovery, import).
    case probe(path: String)
    /// Copies or converts a video or GIF into `output` as H.264 .mov.
    case importVideo(path: String, output: String)
    /// Writes `output` (.mp4) with the video track of `video` passed through and `audio` (.wav) encoded as AAC.
    case mux(video: String, audio: String?, output: String)

    static func parse(_ line: String) throws -> Command {
        guard let data = line.data(using: .utf8) else { throw ProtocolError.badCommand("not utf-8") }
        let decoder = JSONDecoder()
        struct Head: Decodable { let cmd: String }
        let head = try decoder.decode(Head.self, from: data)
        switch head.cmd {
        case "ping": return .ping
        case "list": return .list
        case "cameras": return .cameras
        case "stop": return .stop
        case "pause": return .pause
        case "resume": return .resume
        case "cancel": return .cancel
        case "probe":
            struct P: Decodable { let path: String }
            return .probe(path: try decoder.decode(P.self, from: data).path)
        case "import":
            struct I: Decodable { let path: String; let output: String }
            let i = try decoder.decode(I.self, from: data)
            return .importVideo(path: i.path, output: i.output)
        case "mux":
            struct M: Decodable { let video: String; let audio: String?; let output: String }
            let m = try decoder.decode(M.self, from: data)
            return .mux(video: m.video, audio: m.audio, output: m.output)
        case "mark":
            struct M: Decodable { let kind: String? }
            return .mark(kind: try decoder.decode(M.self, from: data).kind ?? "marker")
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
    case notPaused
    case alreadyPaused
    case targetNotFound
    case permission(String)
    case writer(String)
    case unreadable(String)

    var code: String {
        switch self {
        case .badCommand: return "bad-command"
        case .notRecording: return "not-recording"
        case .alreadyRecording: return "already-recording"
        case .notPaused: return "not-paused"
        case .alreadyPaused: return "already-paused"
        case .targetNotFound: return "target-not-found"
        case .permission(let which): return "permission-\(which)"
        case .writer: return "writer"
        case .unreadable: return "unreadable"
        }
    }

    var errorDescription: String? {
        switch self {
        case .badCommand(let m): return "Bad command: \(m)"
        case .notRecording: return "Nothing is being recorded"
        case .alreadyRecording: return "A recording is already running"
        case .notPaused: return "Cannot resume recording: it is not paused"
        case .alreadyPaused: return "Cannot pause recording: it is already paused"
        case .targetNotFound: return "The display or window to record was not found"
        case .permission(let which): return "Missing \(which) permission"
        case .writer(let m): return "Could not write the recording: \(m)"
        case .unreadable(let m): return m
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
    var camera: String
}

struct StoppedFiles: Codable {
    var screen: String
    var events: String
    var mic: String?
    var camera: String?
}

/// Everything the helper prints. `event` is the discriminator.
enum OutEvent: Encodable {
    case pong(version: String)
    case permissions(PermissionsInfo)
    case targets(displays: [DisplayInfo], windows: [WindowInfo])
    case cameras([CameraInfo])
    case started(outputDir: String, width: Int, height: Int)
    case stopped(durationMs: Double, files: StoppedFiles, micOffsetMs: Double?, frames: Int, cameraWidth: Int?, cameraHeight: Int?)
    case paused(timeMs: Double)
    case resumed(timeMs: Double)
    case marked(kind: String, timeMs: Double)
    case cancelled
    case probed(durationMs: Double, width: Int, height: Int, hasAudio: Bool)
    case imported(output: String, durationMs: Double, width: Int, height: Int, converted: Bool)
    case muxed(output: String, durationMs: Double)
    case warning(message: String)
    case error(code: String, message: String)

    private enum CodingKeys: String, CodingKey {
        case event, version, screen, inputMonitoring, accessibility, microphone, displays, windows, outputDir, width, height
        case durationMs, files, micOffsetMs, frames, message, code, timeMs, kind, hasAudio, output, converted
        case camera, cameras, cameraWidth, cameraHeight
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
            try c.encode(p.camera, forKey: .camera)
        case .cameras(let list):
            try c.encode("cameras", forKey: .event); try c.encode(list, forKey: .cameras)
        case let .targets(displays, windows):
            try c.encode("targets", forKey: .event)
            try c.encode(displays, forKey: .displays); try c.encode(windows, forKey: .windows)
        case let .started(outputDir, width, height):
            try c.encode("started", forKey: .event)
            try c.encode(outputDir, forKey: .outputDir)
            try c.encode(width, forKey: .width); try c.encode(height, forKey: .height)
        case let .stopped(durationMs, files, micOffsetMs, frames, cameraWidth, cameraHeight):
            try c.encode("stopped", forKey: .event)
            try c.encode(durationMs, forKey: .durationMs)
            try c.encode(files, forKey: .files)
            try c.encodeIfPresent(micOffsetMs, forKey: .micOffsetMs)
            try c.encode(frames, forKey: .frames)
            try c.encodeIfPresent(cameraWidth, forKey: .cameraWidth)
            try c.encodeIfPresent(cameraHeight, forKey: .cameraHeight)
        case .paused(let timeMs):
            try c.encode("paused", forKey: .event); try c.encode(timeMs, forKey: .timeMs)
        case .resumed(let timeMs):
            try c.encode("resumed", forKey: .event); try c.encode(timeMs, forKey: .timeMs)
        case let .marked(kind, timeMs):
            try c.encode("marked", forKey: .event); try c.encode(kind, forKey: .kind); try c.encode(timeMs, forKey: .timeMs)
        case .cancelled:
            try c.encode("cancelled", forKey: .event)
        case let .probed(durationMs, width, height, hasAudio):
            try c.encode("probed", forKey: .event)
            try c.encode(durationMs, forKey: .durationMs); try c.encode(width, forKey: .width); try c.encode(height, forKey: .height); try c.encode(hasAudio, forKey: .hasAudio)
        case let .imported(output, durationMs, width, height, converted):
            try c.encode("imported", forKey: .event)
            try c.encode(output, forKey: .output); try c.encode(durationMs, forKey: .durationMs)
            try c.encode(width, forKey: .width); try c.encode(height, forKey: .height); try c.encode(converted, forKey: .converted)
        case let .muxed(output, durationMs):
            try c.encode("muxed", forKey: .event)
            try c.encode(output, forKey: .output); try c.encode(durationMs, forKey: .durationMs)
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
