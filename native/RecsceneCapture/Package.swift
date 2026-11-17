// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "RecsceneCapture",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "recscene-capture",
            path: "Sources/recscene-capture",
            exclude: ["Info.plist"],
            linkerSettings: [
                // Embed an Info.plist so TCC has usage descriptions when the helper runs on its own.
                .unsafeFlags([
                    "-Xlinker", "-sectcreate",
                    "-Xlinker", "__TEXT",
                    "-Xlinker", "__info_plist",
                    "-Xlinker", "Sources/recscene-capture/Info.plist"
                ])
            ]
        )
    ],
    swiftLanguageVersions: [.v5]
)
