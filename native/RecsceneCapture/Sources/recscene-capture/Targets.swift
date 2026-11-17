import CoreGraphics
import Foundation
import ScreenCaptureKit

enum Targets {
    static func shareableContent() async throws -> SCShareableContent {
        do {
            return try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        } catch {
            if !CGPreflightScreenCaptureAccess() { throw ProtocolError.permission("screen") }
            throw error
        }
    }

    static func list() async throws -> OutEvent {
        let content = try await shareableContent()
        let main = CGMainDisplayID()
        let displays = content.displays.map { d -> DisplayInfo in
            let pixels = CGDisplayCopyDisplayMode(d.displayID)?.pixelWidth ?? d.width
            let scale = d.width > 0 ? Double(pixels) / Double(d.width) : 1
            return DisplayInfo(
                id: d.displayID,
                x: d.frame.origin.x, y: d.frame.origin.y,
                width: Double(d.width), height: Double(d.height),
                scale: scale, isMain: d.displayID == main)
        }
        let windows = content.windows
            .filter { $0.windowLayer == 0 && $0.frame.width >= 50 && $0.frame.height >= 50 }
            .compactMap { w -> WindowInfo? in
                guard let app = w.owningApplication else { return nil }
                return WindowInfo(
                    id: w.windowID,
                    title: w.title ?? "",
                    app: app.applicationName,
                    bundleId: app.bundleIdentifier,
                    pid: app.processID,
                    x: w.frame.origin.x, y: w.frame.origin.y,
                    width: w.frame.width, height: w.frame.height)
            }
        return .targets(displays: displays, windows: windows)
    }

    struct Resolved {
        var filter: SCContentFilter
        /// The recorded region in global screen points (top-left origin), used to normalise events.
        var region: CGRect
        var sourceRect: CGRect?
    }

    static func resolve(_ target: CaptureTarget, excludingProcessIds pids: [Int32] = []) async throws -> Resolved {
        let content = try await shareableContent()
        let excluded = content.applications.filter { pids.contains($0.processID) }
        switch target {
        case .display(let id):
            guard let d = content.displays.first(where: { $0.displayID == id }) else { throw ProtocolError.targetNotFound }
            return Resolved(filter: SCContentFilter(display: d, excludingApplications: excluded, exceptingWindows: []), region: d.frame, sourceRect: nil)
        case .window(let id):
            guard let w = content.windows.first(where: { $0.windowID == id }) else { throw ProtocolError.targetNotFound }
            return Resolved(filter: SCContentFilter(desktopIndependentWindow: w), region: w.frame, sourceRect: nil)
        case let .area(displayId, x, y, width, height):
            guard let d = content.displays.first(where: { $0.displayID == displayId }) else { throw ProtocolError.targetNotFound }
            let local = CGRect(x: x, y: y, width: width, height: height)
            let global = local.offsetBy(dx: d.frame.origin.x, dy: d.frame.origin.y)
            return Resolved(filter: SCContentFilter(display: d, excludingApplications: excluded, exceptingWindows: []), region: global, sourceRect: local)
        }
    }
}
