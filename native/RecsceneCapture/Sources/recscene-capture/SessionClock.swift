import Foundation

/// Recording time: system uptime minus the start and minus every pause, so
/// the output stays contiguous (spec 22). Thread-safe; all times in seconds.
final class SessionClock {
    private let lock = NSLock()
    private var start: TimeInterval?
    private var pausedAt: TimeInterval?
    private var pausedTotal: TimeInterval = 0

    var isStarted: Bool { lock.lock(); defer { lock.unlock() }; return start != nil }
    var isPaused: Bool { lock.lock(); defer { lock.unlock() }; return pausedAt != nil }

    func start(at uptime: TimeInterval) {
        lock.lock(); defer { lock.unlock() }
        if start == nil { start = uptime }
    }

    /// Returns the recording time for the pause event, or nil if already paused.
    @discardableResult
    func pause(at uptime: TimeInterval) -> TimeInterval? {
        lock.lock(); defer { lock.unlock() }
        guard pausedAt == nil, let s = start else { return nil }
        pausedAt = uptime
        return uptime - s - pausedTotal
    }

    /// Returns the recording time at resume, or nil if not paused.
    @discardableResult
    func resume(at uptime: TimeInterval) -> TimeInterval? {
        lock.lock(); defer { lock.unlock() }
        guard let p = pausedAt, let s = start else { return nil }
        pausedTotal += uptime - p
        pausedAt = nil
        return uptime - s - pausedTotal
    }

    /// Recording time for a moment, or nil before the start or while paused.
    func time(at uptime: TimeInterval) -> TimeInterval? {
        lock.lock(); defer { lock.unlock() }
        guard let s = start, pausedAt == nil, uptime >= s else { return nil }
        return uptime - s - pausedTotal
    }

    /// Recording time right now even while paused (for the mark command).
    func now() -> TimeInterval? {
        let uptime = ProcessInfo.processInfo.systemUptime
        lock.lock(); defer { lock.unlock() }
        guard let s = start else { return nil }
        return uptime - s - pausedTotal - (pausedAt.map { uptime - $0 } ?? 0)
    }
}
