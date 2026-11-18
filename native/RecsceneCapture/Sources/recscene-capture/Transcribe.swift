import AVFoundation
import Foundation
import Speech

/// One recognised word with its time range in the audio file.
struct TranscriptWord: Codable {
    var text: String
    var startMs: Double
    var endMs: Double
}

/// Spec 206: on-device transcription with Apple's SpeechAnalyzer (macOS 26+).
/// Nothing leaves the Mac; the language model is installed on first use.
enum Transcribe {
    static func supportedLocales() async -> [String] {
        if #available(macOS 26.0, *) {
            return await SpeechTranscriber.supportedLocales.map(\.identifier).sorted()
        }
        return []
    }

    /// Transcribes an audio file; `locale` such as "en-US", or nil for the current locale.
    static func run(path: String, locale: String?) async throws -> (language: String, words: [TranscriptWord]) {
        guard #available(macOS 26.0, *) else { throw ProtocolError.unreadable("Transcription needs macOS 26 or later") }
        let url = URL(fileURLWithPath: path)
        let wanted = locale.map { Locale(identifier: $0.replacingOccurrences(of: "-", with: "_")) } ?? Locale.current
        let supported = await SpeechTranscriber.supportedLocales
        let norm = { (l: Locale) in l.identifier.replacingOccurrences(of: "-", with: "_") }
        let chosen = supported.first { norm($0) == norm(wanted) }
            ?? supported.first { $0.language.languageCode == wanted.language.languageCode }
            ?? supported.first { $0.language.languageCode?.identifier == "en" }
        guard let chosen else { throw ProtocolError.unreadable("No speech model is available for \(wanted.identifier)") }
        let transcriber = SpeechTranscriber(locale: chosen, transcriptionOptions: [], reportingOptions: [], attributeOptions: [.audioTimeRange])
        if let request = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
            Output.shared.send(.warning(message: "Downloading the speech model for \(chosen.identifier)…"))
            try await request.downloadAndInstall()
        }
        let analyzer = SpeechAnalyzer(modules: [transcriber])
        let file = try AVAudioFile(forReading: url)
        var words: [TranscriptWord] = []
        let collector = Task {
            for try await result in transcriber.results {
                let text = result.text
                for run in text.runs {
                    let piece = String(text[run.range].characters).trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !piece.isEmpty, let range = run.audioTimeRange else { continue }
                    let start = CMTimeGetSeconds(range.start) * 1000
                    let end = CMTimeGetSeconds(range.end) * 1000
                    // A run may hold several words; spread them evenly over the run's time.
                    let parts = piece.split(separator: " ").map(String.init)
                    let step = parts.count > 0 ? (end - start) / Double(parts.count) : 0
                    for (i, part) in parts.enumerated() {
                        words.append(TranscriptWord(text: part, startMs: start + step * Double(i), endMs: start + step * Double(i + 1)))
                    }
                }
            }
        }
        if let last = try await analyzer.analyzeSequence(from: file) {
            try await analyzer.finalizeAndFinish(through: last)
        } else {
            await analyzer.cancelAndFinishNow()
        }
        try await collector.value
        return (chosen.identifier, words.sorted { $0.startMs < $1.startMs })
    }
}
