import Carbon.HIToolbox
import CoreGraphics
import Foundation

struct ClickEvent: Codable {
    var timeMs: Double
    var position: Position
    var button: String
}

struct KeyEvent: Codable {
    var timeMs: Double
    var label: String
}

struct CursorSample: Codable {
    var timeMs: Double
    var x: Double
    var y: Double
}

struct Position: Codable {
    var x: Double
    var y: Double
}

struct EventsFile: Codable {
    var version = 1
    var region: Region
    var clicks: [ClickEvent]
    var keys: [KeyEvent]
    var cursor: [CursorSample]

    struct Region: Codable { var x: Double, y: Double, width: Double, height: Double }
}

/// Captures clicks, cursor positions and keystrokes while a recording runs.
/// Mouse position and button state are polled, which needs no permission.
/// Keystrokes come from a listen-only CGEvent tap, which needs Input Monitoring;
/// without it the helper warns and records no keys.
final class EventRecorder {
    private let region: CGRect
    private var tap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var timer: DispatchSourceTimer?
    private let pollQueue = DispatchQueue(label: "app.recscene.capture.events")
    private let lock = NSLock()
    private var clicks: [ClickEvent] = []
    private var keys: [KeyEvent] = []
    private var cursor: [CursorSample] = []
    private var lastCursorAt: TimeInterval = 0
    private var lastPoint = CGPoint(x: -1, y: -1)
    private var buttonsDown: [CGMouseButton: Bool] = [.left: false, .right: false, .center: false]
    private let clock: SessionClock
    private(set) var capturesKeys = false

    init(region: CGRect, clock: SessionClock) {
        self.region = region
        self.clock = clock
    }

    func start() {
        startPolling()
        startKeyTap()
    }

    func stop() -> EventsFile {
        timer?.cancel(); timer = nil
        if let tap { CGEvent.tapEnable(tap: tap, enable: false) }
        if let runLoopSource { CFRunLoopRemoveSource(CFRunLoopGetMain(), runLoopSource, .commonModes) }
        tap = nil; runLoopSource = nil
        lock.lock(); defer { lock.unlock() }
        return EventsFile(
            region: .init(x: region.origin.x, y: region.origin.y, width: region.width, height: region.height),
            clicks: clicks, keys: keys, cursor: cursor)
    }

    // MARK: Mouse polling (240 Hz for buttons, cursor samples at most 60 Hz)

    private func startPolling() {
        let t = DispatchSource.makeTimerSource(queue: pollQueue)
        t.schedule(deadline: .now(), repeating: .milliseconds(4), leeway: .milliseconds(1))
        t.setEventHandler { [weak self] in self?.poll() }
        t.resume()
        timer = t
    }

    private func poll() {
        let uptime = ProcessInfo.processInfo.systemUptime
        guard let timeMs = relative(uptime) else { return }
        let point = CGEvent(source: nil)?.location ?? lastPoint
        for (button, name) in [(CGMouseButton.left, "left"), (.right, "right"), (.center, "middle")] {
            let down = CGEventSource.buttonState(.combinedSessionState, button: button)
            if down, buttonsDown[button] == false { addClick(timeMs, point, name) }
            buttonsDown[button] = down
        }
        if point != lastPoint, uptime - lastCursorAt >= 1.0 / 60 {
            lastPoint = point
            lastCursorAt = uptime
            let n = normalise(point)
            lock.lock(); cursor.append(CursorSample(timeMs: timeMs, x: n.x, y: n.y)); lock.unlock()
        }
    }

    // MARK: Key tap

    private func startKeyTap() {
        guard CGPreflightListenEventAccess() else {
            Output.shared.send(.warning(message: "Input Monitoring permission is missing: clicks and cursor are recorded, keystrokes are not."))
            return
        }
        let mask: CGEventMask = 1 << CGEventType.keyDown.rawValue
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()
        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap, place: .tailAppendEventTap, options: .listenOnly,
            eventsOfInterest: mask, callback: eventTapCallback, userInfo: selfPtr)
        else {
            Output.shared.send(.warning(message: "Could not listen for keystrokes."))
            return
        }
        self.tap = tap
        let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        runLoopSource = source
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
        capturesKeys = true
    }

    fileprivate func handle(type: CGEventType, event: CGEvent) {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            if let tap { CGEvent.tapEnable(tap: tap, enable: true) }
            return
        }
        guard type == .keyDown, let timeMs = relative(TimeInterval(event.timestamp) / 1_000_000_000) else { return }
        let code = UInt16(event.getIntegerValueField(.keyboardEventKeycode))
        let label = KeyLabel.label(keyCode: code, flags: event.flags)
        lock.lock(); keys.append(KeyEvent(timeMs: timeMs, label: label)); lock.unlock()
    }

    // MARK: Helpers

    private func relative(_ uptime: TimeInterval) -> Double? {
        clock.time(at: uptime).map { $0 * 1000 }
    }

    private func normalise(_ p: CGPoint) -> Position {
        Position(
            x: region.width > 0 ? (p.x - region.origin.x) / region.width : 0,
            y: region.height > 0 ? (p.y - region.origin.y) / region.height : 0)
    }

    private func addClick(_ timeMs: Double, _ p: CGPoint, _ button: String) {
        lock.lock(); clicks.append(ClickEvent(timeMs: timeMs, position: normalise(p), button: button)); lock.unlock()
    }
}

private func eventTapCallback(proxy: CGEventTapProxy, type: CGEventType, event: CGEvent, userInfo: UnsafeMutableRawPointer?) -> Unmanaged<CGEvent>? {
    if let userInfo {
        Unmanaged<EventRecorder>.fromOpaque(userInfo).takeUnretainedValue().handle(type: type, event: event)
    }
    return Unmanaged.passUnretained(event)
}

/// Turns a key code plus modifier flags into a display label such as "⌘C".
enum KeyLabel {
    private static let special: [UInt16: String] = [
        36: "↩", 76: "⌤", 48: "⇥", 49: "Space", 51: "⌫", 117: "⌦", 53: "⎋",
        123: "←", 124: "→", 125: "↓", 126: "↑", 115: "↖", 119: "↘", 116: "⇞", 121: "⇟",
        122: "F1", 120: "F2", 99: "F3", 118: "F4", 96: "F5", 97: "F6", 98: "F7", 100: "F8",
        101: "F9", 109: "F10", 103: "F11", 111: "F12", 57: "⇪"
    ]

    static func label(keyCode: UInt16, flags: CGEventFlags) -> String {
        var parts = ""
        if flags.contains(.maskControl) { parts += "⌃" }
        if flags.contains(.maskAlternate) { parts += "⌥" }
        if flags.contains(.maskShift) { parts += "⇧" }
        if flags.contains(.maskCommand) { parts += "⌘" }
        return parts + (special[keyCode] ?? baseCharacter(keyCode) ?? "Key\(keyCode)")
    }

    private static func baseCharacter(_ keyCode: UInt16) -> String? {
        guard let source = TISCopyCurrentKeyboardLayoutInputSource()?.takeRetainedValue(),
              let layoutPtr = TISGetInputSourceProperty(source, kTISPropertyUnicodeKeyLayoutData) else { return nil }
        let layoutData = Unmanaged<CFData>.fromOpaque(layoutPtr).takeUnretainedValue() as Data
        var deadKeys: UInt32 = 0
        var length = 0
        var chars = [UniChar](repeating: 0, count: 4)
        let status = layoutData.withUnsafeBytes { bytes -> OSStatus in
            guard let layout = bytes.bindMemory(to: UCKeyboardLayout.self).baseAddress else { return -1 }
            return UCKeyTranslate(layout, keyCode, UInt16(kUCKeyActionDisplay), 0, UInt32(LMGetKbdType()),
                                  OptionBits(kUCKeyTranslateNoDeadKeysBit), &deadKeys, chars.count, &length, &chars)
        }
        guard status == noErr, length > 0 else { return nil }
        return String(utf16CodeUnits: chars, count: length).uppercased()
    }
}
