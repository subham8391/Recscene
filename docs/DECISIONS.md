# Recscene — decisions log

**Name: Recscene** — "Record the screen. Make it a scene." Chosen 2026-11-17. recscene.com, .app, .io, .dev and .co were unregistered that day and no app or product used the name; trademark registers (USPTO, EUIPO) still need a search before launch.

## Settled (2026-11-17)

**Product**
- A paid macOS app for people who make product demos, tutorials and bug reports: record the screen, get a polished video without editing skills.
- The feature set follows the Screen Studio study in `research/` (292 specs). Recscene matches that behaviour feature for feature unless a line here says otherwise, so the specs are the acceptance criteria.
- Data stays on the user's Mac. A project is a `.recscene` folder bundle (raw screen, camera and audio files plus a JSON project document). Cloud is only for sharing a rendered video by link, and only after M2.
- Milestones:
  - **M1 — daily driver:** record the screen with clicks and keys captured, automatic zooms, cursor smoothing, trim, background and padding, export MP4. Used for two weeks for the author's own demos.
  - **M2 — private beta:** camera with layouts and cutout, microphone, masks, captions, GIF export, presets, 10–30 testers.
  - **M3 — launch:** licensing, auto-update, shareable links, landing page, transcript editing, voice-overs.

**Platform and stack**
- macOS first, Apple silicon and Intel. Windows is not planned until after M3.
- Electron + electron-vite + React 19 + TypeScript. Reason: the design is HTML-native, the reference app proves the architecture at this feature set, and the editor UI changes far more often than the capture code.
- Screen, camera and audio capture go through a native Swift helper (ScreenCaptureKit, AVFoundation) under `native/`, talking to the main process over a local socket or stdio. Electron's `desktopCapturer` is not used: it cannot capture clicks, keystrokes, cursor positions or 60 fps at full resolution reliably.
- Rendering (zooms, cursor, layouts, background) happens in the renderer; the preview is DOM and CSS transforms, export redraws every frame on a canvas with the same maths and encodes H.264 through WebCodecs (the platform encoder) into an MP4 stream. The native helper joins the mixed audio as AAC. No ffmpeg in JavaScript. **Amended 2026-11-17:** the earlier plan to encode in the helper is replaced by WebCodecs, which keeps rendering and encoding in one process.
- Layering: `src/core` (pure domain, tested) → `src/main` (Electron, files, native bridge) → `src/preload` (typed bridge) → `src/renderer` (React). Core never imports the layers above it.
- Tooling matches the author's other projects: npm, Node 24, ESLint flat config, vitest with v8 coverage, GitHub Actions on push and PR.

**Design**
- Dark is the editor default; light is the default for export, settings and the project list. Both come from one token set; nothing is styled outside the tokens.
- Breakpoints: laptop 1280×800 (rail 68, inspector 312, timeline 236), tablet 1024×768, mobile 390×844 (companion role only: record remotely, light edits).
- Track colours: zooms purple, clips yellow, camera layouts pink, masks teal, shortcuts blue, captions green, voice-overs orange.

## Amendments

**2026-11-17 (recording section built).** Specs 1–5, 7, 13, 15–17 and 21–41 are implemented. Of the rest: 6 (iPhone/iPad over USB) and 8–12 (camera at record time) move to M2 with the camera work; 14 (mono conversion) belongs to the editor audio panel; 18–19 (system audio from selected apps, external device audio) need a second audio-only capture stream and move to M2; 20 (recording engine auto/modern/legacy) does not apply, Recscene has one engine; 42–47 (quick export widget) wait for export (233–245). Spec 41's `actionAfterRecording` is stored but only `create-project` behaves until then. Keystroke capture needs Input Monitoring; clicks and cursor are polled and need nothing.

**2026-11-17 (projects home built).** On launch, unfinished recordings (spec 40) show in the home's banner with Recover and Delete instead of a modal dialog; File › Recover Unfinished Recordings keeps the dialog. Project thumbnails are PNGs cached inside the bundle (`thumbnail.png`), drawn from the footage once and refreshed from the edited frame on every save. Deleting a project moves the bundle to the macOS Trash. The projects folder preference (`projectsFolderPath`, spec 255) lives in the home's storage box until the Settings window exists.

**2026-11-17 (camera recording built).** The webcam is recorded by the helper into `camera.mov` (H.264, 30 fps, tallest format at or under the 720/1080 preference) on the screen recording's clock: frames before the screen's first frame are dropped and pauses are cut out, so the two files line up without an offset. Spec 9's "record muted camera" needs no option: the camera's own audio is never recorded, the microphone is the only voice source. The preview bubble is a separate always-on-top window fed by the renderer's own camera stream, excluded from the capture like every app window. Camera access is asked by the app first (Electron's prompt), then by the helper; both are attributed to the app by macOS.

**2026-11-17 (camera layouts built).** The camera is composited by the same code path as the stage: a box computed per frame from the effective layout (timeline layout, else the default, else hidden), animated between layouts by a spring and faded when hidden; the split layout is a Recscene addition from the Camera board (screen and camera side by side, ½·½ or ⅔·⅓, flip). Layouts live at `project.layouts` (the competitor's `scenes[].layouts`; Recscene has one scene). The camera's own time is the screen time minus `cameraDelayMs`. Cutout, looks, sharpen, face tracking and hide-during-silence are deferred: cutout and looks need the GPU renderer and a matting model, silence needs the audio panel's speech ranges.

**2026-11-17 (masks built).** Mask regions are stored as fractions of the full recording frame, so they survive crops and resolution changes; the renderers map them through the crop. The stage blurs with `backdrop-filter` and dims with an even-odd clip path, the export draws the same maths on the canvas (blur with padded source so edges do not fade). Masks live at `project.masks` and cannot overlap in time (one renders at a time). Spec 197's shift detection is deferred; the board's auto masks (4.x) too.

**2026-11-17 (shortcuts built).** Keystroke labels are drawn from the recorded key events (`recording.keys`, labels like ⇧⌘P from the helper) at the bottom centre of the screen box, outside the zoom, for 1.4 s with a 0.3 s fade; the latest press replaces the previous one. Hidden occurrences follow the competitor's `hiddenShortcuts` map keyed by the press time. The board's "disable by kind" is a Recscene addition (`disabledShortcutKinds`). Spec 199's enable question uses the window confirm until the editor has its own dialog component.

## Open
- **Q1** Licensing model: one-time with a year of updates versus subscription. Decide before M3.
- **Q2** Transcription and captions: on-device (whisper.cpp) versus a cloud service. Lean on-device for privacy; decide at M2.
- **Q3** Whether the tablet and mobile designs ship at all in M1–M3 or stay as companion designs. Default: not before M3.
- **Q4** Code signing and notarisation account: personal Apple Developer account, to be set up before M2 testers receive a build.
