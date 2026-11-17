import AVFoundation
import ApplicationServices
import CoreGraphics
import Foundation

enum Permissions {
    static func screen(request: Bool) -> Bool {
        if CGPreflightScreenCaptureAccess() { return true }
        return request ? CGRequestScreenCaptureAccess() : false
    }

    static func inputMonitoring(request: Bool) -> Bool {
        if CGPreflightListenEventAccess() { return true }
        return request ? CGRequestListenEventAccess() : false
    }

    static func accessibility(request: Bool) -> Bool {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: request] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }

    /// "granted", "denied", "restricted" or "notDetermined".
    static func microphone(request: Bool) async -> String {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: return "granted"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined:
            guard request else { return "notDetermined" }
            return await AVCaptureDevice.requestAccess(for: .audio) ? "granted" : "denied"
        @unknown default: return "notDetermined"
        }
    }

    static func current(request: Bool) async -> PermissionsInfo {
        PermissionsInfo(
            screen: screen(request: request),
            inputMonitoring: inputMonitoring(request: request),
            accessibility: accessibility(request: false),
            microphone: await microphone(request: request))
    }
}
