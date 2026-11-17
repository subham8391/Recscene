# Screen Studio 3.7.3 — Feature Specifications

Installed build: **3.7.3 (4475)** at /Applications/Screen Studio.app. Update offered in-app: 4.1.0 (5005). Current public beta: 4.2.1-5069-beta.

## How to read this document

Each of the 292 features has the same seven fields.

| Field | Meaning |
|---|---|
| Where | The panel, menu, dialog or shortcut that exposes the feature |
| Purpose | What it is for |
| Controls and options | Exact labels, allowed values, ranges and defaults; the current value from the open project where one exists |
| Behaviour | What happens, step by step, including how it interacts with other features |
| Constraints and edge cases | Limits, version requirements, disabled states, and the exact warning or error text the app shows |
| Stored as | The key in the project file or the app preferences, or "runtime only" |
| Confidence | Build-confirmed, Guide, or Inferred |

Confidence levels:

- **Build-confirmed.** Read directly from the installed app: its UI string table, its asset list, the project file on disk, or the preferences file. Where a spec says "4.1.0 bundle", it was read the same way from the downloaded 4.1.0 update instead of the installed 3.7.3.
- **Guide.** Taken from the official guide at screen.studio/guide, the homepage, the roadmap or the legal pages. Not verified against the build.
- **Inferred.** A reasonable reading of build evidence that no label or document states outright.

## Sources

1. `project.json` inside `~/Screen Studio Projects/Area 2026-11-14 00:12:01.screenstudio` (70 project settings with current values)
2. `settings-persistance.json` in `~/Library/Application Support/Screen Studio/user-preferences` (55 app preferences)
3. The UI string table (2,439 strings) and asset list (574 files) extracted from `app.asar`
4. The recorder's `metadata.json` showing what each recording channel captures
5. A live capture of the editor window
6. Official guide pages (about 60 read in full), the homepage, roadmap, beta page, Terms of Service and Privacy Policy, all fetched 2026-11-17
7. The **4.1.0-5005 update bundle** that the app had already downloaded to `~/Library/Caches/com.timpler.screenstudio.ShipIt/` (its `app.asar` was parsed the same way; its renderer modules were de-obfuscated to read labels, ranges and defaults). Specs 283–292 are read from it.

## System requirements and platform facts

- macOS Ventura 13.1 or later. Apple Speech Recognition captions need macOS 26. iPhone Mirroring needs macOS Sequoia 15. The modern recording engine (ScreenCaptureKit) and system audio capture need macOS 13 or later.
- Apple silicon recommended; Intel MacBook Pro 2018 or later and MacBook Air 2020 or later supported. 8 GB RAM minimum.
- Permissions requested on first launch: Screen Recording, Accessibility, Camera, Microphone. Presets need the Documents folder permission.
- Projects are `.screenstudio` folder bundles containing `project.json`, `meta.json`, `recording-markers.json` and a `recording/` folder with the raw screen video, cursor images, mouse moves, mouse clicks, keystrokes and audio.
- Global shortcut defaults: start/stop recording Shift+Cmd+R; open recording picker Option+Cmd+Return; recording flag Cmd+Option+Ctrl+F; speaker-notes prompter Cmd+Option+Period; shortcuts guide Cmd+/ ; command menu Cmd+K; crop C; mask track 4; cut at playhead C (in cut mode); hold Option for scissors.

## Feature index

| Range | Area |
|---|---|
| 1–47 | Recording |
| 48–79 | Editor shell |
| 80–101 | Clips |
| 102–124 | Zooms |
| 125–147 | Cursor |
| 148–164 | Camera |
| 165–188 | Background and screen |
| 189–198 | Masks |
| 199–204 | Shortcut overlay |
| 205–212 | Captions |
| 213–223 | Audio |
| 224–232 | Presets |
| 233–251 | Export and sharing |
| 252–272 | Settings and app |
| 273–282 | Account and licensing |
| 283–292 | 4.1.0 features (not in 3.7.3; read from the update bundle) |

## Corrections found while writing the specs

The spec writers decoded parts of the app's code that the earlier inventory had not reached. Where the two disagree, the spec is right:

- Cursor animation presets are **Smooth, Medium, Rapid and None** (feature 130), not Slow, Medium and Fast. "Customize" exposes Rigidity, Smoothness and Momentum sliders (129).
- Camera layouts have **three** types: both, only-camera and only-screen (155). Hiding the camera is the only-screen type; there is no separate "hide" type.
- There is no 1px/10px camera resize command (159). The 1px/10px nudges belong to the crop tool (101). "Move layout camera" steps through a 3×3 grid of positions (158).
- Glide direction and speed are stored per zoom but have no editor control in 3.7.3 (113).
- "Remove all slices" (86) is a developer-only action, not a user command.
- Countdown options are none, 3, 5 or 10 seconds (21).
- Whisper offers Base (142 MB), Small (466 MB) and Medium (1.5 GB) models (205).
- Aspect ratio also offers Social Media 4:5 (184).
- "Reactions" (288) is not a Screen Studio feature in 3.7.3 or 4.1.0; the guide page is about macOS Reactions.
- The "Resize camera 1px/10px" entry (159) is really the crop tool's pixel keys; the camera has only grid moves.
- The ten 4.x entries (283–292) are now read from the 4.1.0 update bundle rather than the website: 4.1.0 has five layout types (camera overlay, split screen, camera cutout, fullscreen camera, hide camera), twelve built-in camera looks plus a preset studio, five microphone modes, loupe zooms, automatic super-resolution, transcript-based editing with filler and pause removal, and AI plus recorded voiceovers.

---

## Part 1 — Recording

Source legend used in every "Confidence" line: **Build-confirmed** = string, key or value found in the installed 3.7.3 (4475) bundle, `project.json` or `settings-persistance.json`; **Guide** = official screen.studio guide; **Inferred** = reasonable reading of those sources, not directly stated.

### 1. Record entire display
- **Where:** Recording modal ("New Recording" / recording picker), source button "Display"; also menu-bar icon and global shortcut (default Shift+Cmd+R) which opens the picker. Command/menu label "Record entire display".
- **Purpose:** Capture one whole display, including full-screen apps, as the project's screen track.
- **Controls and options:** Source selector "Display" (alternatives "Window", "Area", "Device"); when several displays are attached, the display under the mouse is picked. "Record" button starts. Countdown, webcam, microphone and system-audio toggles in the same modal apply.
- **Behaviour:** Select "Display", move the mouse to the wanted display, click to confirm, press "Record". Screen video is written as `channel-1-display-0.mp4` together with separate cursor, mouse-move, click and keystroke files; the editor opens after "Finish recording" (or the Quick Export widget, see 41).
- **Constraints and edge cases:** Requires Screen Recording permission ("Screen Studio does not have permission to record your screen"). The recording widget is not captured on macOS 12.3+. Guide tip: full-screen apps must be recorded with Display, not Window. "Cannot start recording while another is in progress".
- **Stored as:** runtime only (recording source is not a preference); output lands in the project bundle.
- **Confidence:** Build-confirmed labels and errors; picker flow is Guide.

### 2. Record a single window
- **Where:** Recording modal, source button "Window" ("Record single window"); right-click the button for a window list ("Select window").
- **Purpose:** Capture only one app window, tracking it if it moves.
- **Controls and options:** Click the target window, or right-click "Window" and choose from the list. Optional resize to a saved size (see 5). Other modal toggles apply.
- **Behaviour:** The picker highlights the hovered window ("Screen Studio Display Window Picker Highlighter"); on click the window bounds become the recording input. If the window moves after being picked the input is updated ("Window bounds changed after initially picked, updating recording input").
- **Constraints and edge cases:** "No windows to select" when nothing is capturable. If the window is closed before start: "Window is not capturable anymore. Maybe it was closed. Please try again." Full-screen apps are not offered; use Display (Guide). macOS Sequoia iPhone Mirroring window can be recorded this way (Guide).
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed strings; re-tracking behaviour Build-confirmed (log string); list picker is Guide.

### 3. Record a dragged area
- **Where:** Recording modal, source button "Area" ("Record area").
- **Purpose:** Capture an arbitrary rectangle of one display.
- **Controls and options:** Drag on screen ("Drag area you want to record"); then "Adjust recording area…" lets you drag edges, nudge with arrow keys, or type width/height. Width/height fields enforce minimum values. Saved dimensions can be applied (see 4).
- **Behaviour:** Choose "Area", drag a rectangle, refine it, press "Record". Only that rectangle is captured; with "Highlight recorded area during recording" on, the rest of the screen is dimmed (see 31).
- **Constraints and edge cases:** Two minimum-size strings exist in the bundle: "Minimal size is 150×150px." and "Minimum value 200x200"; which applies to drag versus typed values is not documented. No maximum is stated. The area cannot span displays (Inferred: "Either displayId or bounds must be defined").
- **Stored as:** runtime only; presets in `recordingAreaCropPresets` (see 4).
- **Confidence:** Build-confirmed strings; nudging is Build-confirmed (inventory D); the 150 vs 200 ambiguity is unresolved.

### 4. Save and reuse area dimensions
- **Where:** "Adjust recording area" step of the Area picker; menu "Use and manage saved area dimensions".
- **Purpose:** Re-record the same rectangle size across sessions.
- **Controls and options:** "Save current dimensions", list of saved entries to apply, "Delete saved dimensions"; empty state "No saved dimensions". Current value: `recordingAreaCropPresets = []`.
- **Behaviour:** After adjusting an area, choose "Save current dimensions"; the width×height is appended to the preset list. Later, pick an entry to set the area to that size (position is not documented as being saved). "Delete saved dimensions" clears entries.
- **Constraints and edge cases:** Minimum size rules from feature 3 apply. Nothing is saved by default. Whether the entry stores position as well as size: Not documented.
- **Stored as:** app preference `recordingAreaCropPresets` (array).
- **Confidence:** Build-confirmed (labels and key); application semantics Inferred.

### 5. Save and reuse window sizes / resize target window
- **Where:** Window picker (right-click "Window" list / window hover controls); "Resize" action.
- **Purpose:** Force the chosen window to a consistent pixel size before recording so output dimensions are repeatable.
- **Controls and options:** "Save current size", saved-size list, "Delete saved sizes"; empty state "No saved sizes"; "Resize" applies a saved size to the target window. Current value: `recordingWindowSizePresets = []`.
- **Behaviour:** Pick a window, save its current size, or choose a saved size to resize the window, then record. Resizing uses the Accessibility permission to move/resize another app's window (Inferred).
- **Constraints and edge cases:** Requires Accessibility permission for resizing (Inferred from onboarding). Windows that refuse resizing (fixed-size apps) are not documented. No presets exist by default.
- **Stored as:** app preference `recordingWindowSizePresets` (array).
- **Confidence:** Build-confirmed labels and key (inventory D: "Window picker can resize the target window to a saved preset size"); permission dependency Inferred.

### 6. Record iPhone or iPad over USB
- **Where:** Recording modal, source "Device" (shown when `enableExternalDeviceRecording` is on); help link "How to record iOS or iPadOS device?".
- **Purpose:** Capture a connected iOS/iPadOS screen as the recording, with optional device audio.
- **Controls and options:** Preference `enableExternalDeviceRecording` (current: False). Device list; "External device audio" toggle (see 19). Empty states "No USB connected iOS devices" / "No USB connected iPadOS devices". Guide: "Prepare for recording screen" step.
- **Behaviour:** Connect by cable, tap "Trust" on your device, unlock it, pick it from "Device", press "Record". Mic and webcam may record simultaneously. The editor then offers iPhone/iPad device frames (`deviceFrameKey`), and presets override the frame for device projects ("Project with external device, overriding deviceFrameKey in preset config").
- **Constraints and edge cases:** Needs camera permission: "Screen Studio needs camera recording permission to record external devices connected to your Mac". "Device not found - make sure it is still connected", "Reconnect your device". Guide: taps are not recorded so no automatic zooms; no cursor; USB-C-to-Lightning recommended, docks may fail. Alternative on macOS 15+: iPhone Mirroring window (Guide).
- **Stored as:** app preference `enableExternalDeviceRecording`; device choice runtime only.
- **Confidence:** Build-confirmed strings and key; cable/limits Guide.

### 7. Create project from existing MP4/GIF
- **Where:** File menu > "Create project from video…" (also command menu).
- **Purpose:** Build a Screen Studio project around footage recorded elsewhere.
- **Controls and options:** File picker "Select video file"; accepted: .mp4 or .gif ("File is not an mp4 or gif: "). No further options.
- **Behaviour:** Pick a file; app shows "Creating project from video", converts if needed ("Video converted to H.264 format."), and opens the editor with the video as the screen track. Zooms (manual), background, masks, captions and export are available.
- **Constraints and edge cases:** Guide: cursor animations and camera are not available; the bundle reports "There is no mouse cursor recorded" and auto zooms cannot follow clicks. Error "Unable to get video duration" / "Error getting video dimensions:" for unreadable files.
- **Stored as:** new project bundle; no preference.
- **Confidence:** Build-confirmed strings; limitations Guide.

### 8. Webcam on/off
- **Where:** Recording modal camera icon; options "Record webcam" / "Don't record camera" / "Record without camera"; device list with live preview.
- **Purpose:** Include a webcam track that the editor overlays on the screen recording.
- **Controls and options:** Camera device picker; "Hide camera preview" (preview is on-screen only, never in output); "Record muted camera" (see 9). Related editor key `hideCamera` (current False).
- **Behaviour:** Choose a camera; "Camera is starting…" then preview appears. The camera is recorded as a separate file and composited in the editor (position, size, roundness, mirror editable later). If a project has the camera hidden the editor asks "Webcam is disabled in your project, do you want to enable it?".
- **Constraints and edge cases:** Requires Camera permission ("No camera recording permission", "Screen Studio does not have permission to use your webcam"). If the previously used camera is missing: "Camera you have previously selected seems to not be connected anymore"; if it fails at start: "Do you want to continue recording without camera?". "No camera recorded" projects have no camera layouts.
- **Stored as:** camera choice runtime only; per-project `hideCamera`.
- **Confidence:** Build-confirmed strings; preview-not-in-output Guide.

### 9. Record with camera muted
- **Where:** Recording modal camera menu, "Record muted camera" / confirmation "Record muted camera?".
- **Purpose:** Capture the webcam video while explicitly not using its audio (or while the camera is hidden from the live preview), so the operator is not distracted but the track exists for later.
- **Controls and options:** Menu item "Record muted camera"; confirmation dialog "Record muted camera?" with proceed/cancel (exact button labels Not documented).
- **Behaviour:** Recording proceeds with the camera track captured; what "muted" suppresses (camera microphone versus preview) is not spelled out in the strings. Inferred: camera-built-in audio is excluded and the microphone selection remains the only voice source.
- **Constraints and edge cases:** Same permissions as feature 8. Not documented: whether the muted state can be reversed in the editor.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed labels; semantics Inferred.

### 10. Max webcam resolution
- **Where:** Settings > Recording, "Max camera resolution" (also "Maximum camera resolution" in the picker options menu).
- **Purpose:** Cap the webcam capture height to balance quality against recording performance.
- **Controls and options:** Values 720 or 1080 (inventory); current `maximumWebcamHeight = 1080`. Tooltips: "Max resolution at which your webcam will be recorded (if your webcam supports it)." and "Higher resolutions improve video quality but may impact performance during recording."
- **Behaviour:** At record start the app requests a webcam stream with constraints ("Requesting webcam stream with constraints", "Desired webcam height from preferences:", "Maximum height from capabilities:"); the lower of preference and camera capability is used.
- **Constraints and edge cases:** Cameras that cannot reach the setting fall back silently. Option list beyond 720/1080: Not documented.
- **Stored as:** app preference `maximumWebcamHeight`.
- **Confidence:** Build-confirmed.

### 11. Square or full-frame webcam preview
- **Where:** Recording modal camera options; label "Full-frame webcam preview".
- **Purpose:** Choose whether the live camera preview is cropped square or shows the full sensor frame.
- **Controls and options:** Toggle "Full-frame webcam preview"; preference `webcamPreviewType` with values `square` / `full-frame`; current `square`.
- **Behaviour:** Affects only the on-screen preview bubble while recording; the recorded file keeps the full frame and the editor's "Shape" (`cameraAspectRatio`: original/square, current original) controls output.
- **Constraints and edge cases:** Preview is never part of the output (Guide). No other values.
- **Stored as:** app preference `webcamPreviewType`.
- **Confidence:** Build-confirmed key and label; preview-only effect Guide/Inferred.

### 12. Mirror camera (at record time)
- **Where:** No separate record-time control was found in the bundle; mirroring is exposed in the editor Camera panel as "Mirror horizontally".
- **Purpose:** Flip the webcam horizontally so on-screen text and gestures match what the presenter sees.
- **Controls and options:** Editor toggle "Mirror horizontally" (change log "Mirror camera horizontally changed"); current `mirrorCamera = False`. Record-time toggle: Not documented.
- **Behaviour:** The raw camera file is unchanged; mirroring is applied in preview and export. Guide confirms mirror is one of the things "editable later".
- **Constraints and edge cases:** Whether the recording-modal preview itself is mirrored: Not documented.
- **Stored as:** project key `config.mirrorCamera`.
- **Confidence:** Build-confirmed editor control; absence of a record-time toggle is Inferred from the string table.

### 13. Microphone on/off
- **Where:** Recording modal microphone icon; "Record microphone" / "Don't record microphone" / "Record without microphone"; device list with white level bar.
- **Purpose:** Capture narration as a separate microphone track.
- **Controls and options:** Microphone picker (log "Got microphones:", "Set preferredMicrophoneId to:"); level meter; related editor key `muteMicrophone` (current False) and "Microphone volume".
- **Behaviour:** Select a device; the preview meter shows input. On "Record" the mic starts ("Starting recording with microphone:"); audio is written separately and the editor generates a waveform ("Generating microphone waveform…"). Captions need this track.
- **Constraints and edge cases:** Permission: "Microphone permission required", "Please allow access to your microphone in order to record your voice." Device gone: "Microphone you have previously selected seems to not be connected anymore"; failure: "Do you want to continue recording without microphone?". Lid warning: "Microphone you selected is covered by laptop lid" / "Please open the lid so the microphone can capture audio or select another microphone."
- **Stored as:** preferred microphone id persisted (key name Not documented); per-project `muteMicrophone`.
- **Confidence:** Build-confirmed.

### 14. Mic stereo or mono
- **Where:** Editor Audio panel / microphone settings, "Stereo mode".
- **Purpose:** Keep a stereo microphone's two channels or fold to mono.
- **Controls and options:** Toggle "Stereo mode"; tooltip "When enabled, the microphone is in stereo, if disabled it will be mono". Current `microphoneInStereoMode = False` (mono).
- **Behaviour:** When off, the app converts the mic file to mono at composition time ("Converting microphone audio to mono"; FFmpeg error path "Audio Router: convertToMono - FFmpeg error while converting audio to mono: ").
- **Constraints and edge cases:** Only meaningful for stereo capture devices. Applies at export/composition, not at capture.
- **Stored as:** project key `config.microphoneInStereoMode`.
- **Confidence:** Build-confirmed.

### 15. Mic auto gain control
- **Where:** Recording modal microphone options; "Disable auto gain control".
- **Purpose:** Let macOS/WebRTC automatic gain even out microphone level during capture, or turn it off for a fixed gain.
- **Controls and options:** Checkbox "Disable auto gain control"; preference `enableAutoGainControl`, current True (AGC on).
- **Behaviour:** Applied as a constraint when the microphone stream is opened at record start; changing it takes effect on the next recording.
- **Constraints and edge cases:** Not documented whether it affects the level meter preview. No per-project override.
- **Stored as:** app preference `enableAutoGainControl`.
- **Confidence:** Build-confirmed label and key; mechanism Inferred.

### 16. Mic noise reduction and normalisation
- **Where:** Editor Audio panel, "Improve microphone audio" ("Reduce noise and normalize volume"); recording-time preference `enableVoiceRecordingEnhancements`.
- **Purpose:** Clean up voice tracks by reducing noise and normalising loudness.
- **Controls and options:** Editor toggle "Improve microphone audio", tooltip "Reduce microphone recording noise and normalize volume"; current `improveMicrophoneAudio = False`. App preference `enableVoiceRecordingEnhancements` (current False) enables enhancement during recording.
- **Behaviour:** With the editor toggle on, export/composition runs a "Normalizing audio" pass on the microphone track. With the recording preference on, enhancement is applied as the track is captured (details Not documented).
- **Constraints and edge cases:** Only the microphone track is processed, not system or device audio. Roadmap lists "AI voice cleanup" as beta in 4.x, separate from this.
- **Stored as:** project key `config.improveMicrophoneAudio`; app preference `enableVoiceRecordingEnhancements`.
- **Confidence:** Build-confirmed keys and labels; processing details Inferred.

### 17. System audio from all apps
- **Where:** Recording modal "System audio" button; options "Record system audio from all apps", "Record system audio from selected apps", "Don't record system audio".
- **Purpose:** Capture computer audio output as its own track.
- **Controls and options:** Three-way choice; editor mute `muteSystemAudio` (current False), "System audio volume", per-slice `systemAudioVolume`.
- **Behaviour:** Choose "all apps"; the modern engine captures the mix as a separate file; the editor shows "Generating system audio waveform…" and allows muting/volume per slice.
- **Constraints and edge cases:** Requires the modern (ScreenCaptureKit) engine: "Can't record system audio (Using legacy recording engine)" and a macOS version check "Can't record system audio (macOS …" (minimum version string truncated in bundle). "No system audio" when nothing captured. "Unknown system audio recording mode" guards invalid values.
- **Stored as:** runtime only (mode); per-project mute/volume keys.
- **Confidence:** Build-confirmed.

### 18. System audio from selected apps
- **Where:** Same "System audio" menu, "Record system audio from selected apps"; app list labelled "Apps".
- **Purpose:** Capture audio from chosen apps only, ignoring the rest (e.g. exclude notifications or music).
- **Controls and options:** Multi-select list of running apps (selection UI details Not documented).
- **Behaviour:** Only the selected apps' output reaches the system-audio track; others are ignored (Guide).
- **Constraints and edge cases:** Same engine and macOS requirements as 17. Apps launched after recording starts: Not documented.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed label; filtering Guide.

### 19. External device audio
- **Where:** Recording modal when a USB device is the source; editor Audio panel "External device audio".
- **Purpose:** Record the iPhone/iPad's own audio alongside its screen.
- **Controls and options:** Record-time toggle (label Not documented beyond "External device audio"); editor "Mute external device audio" (current `muteExternalDeviceAudio = False`), "External device audio volume", per-slice `externalDeviceAudioVolume` (current 1).
- **Behaviour:** Captured as a separate file; waveform generated ("Generating external device audio waveform…"); muted state shown as "External device audio is muted."
- **Constraints and edge cases:** Only present for device recordings (feature 6). "No external device bound changes. Unable to determine bounds at time" is an internal guard.
- **Stored as:** project keys `config.muteExternalDeviceAudio`, slice `externalDeviceAudioVolume`.
- **Confidence:** Build-confirmed.

### 20. Recording engine auto/modern/legacy
- **Where:** Recording modal options menu > "Recording engine" submenu; Settings > Recording.
- **Purpose:** Choose between ScreenCaptureKit ("Modern") and the older capture path ("Legacy").
- **Controls and options:** "Use modern recording engine if available" (Auto), "Force modern recording engine", "Force legacy recording engine"; preference `recordingUseScreenCaptureKit`, current `auto`. Related "Enable modern recording engine".
- **Behaviour:** Auto uses ScreenCaptureKit when the OS supports it. System audio capture needs the modern engine (feature 17). Some features show "You need to enable Screen Capture Kit to use this feature." when legacy is forced.
- **Constraints and edge cases:** The submenu is disabled when the OS cannot run the modern engine (enabled flag in code). Exact macOS threshold Not documented (app requires macOS 13.1+). Other stored values beyond `auto` Not documented in the preference file.
- **Stored as:** app preference `recordingUseScreenCaptureKit`.
- **Confidence:** Build-confirmed labels and key; value names for forced modes Inferred.

### 21. Countdown
- **Where:** Recording modal options > "Recording countdown".
- **Purpose:** Delay the actual capture so the presenter can get ready.
- **Controls and options:** "No countdown", 3 s, 5 s, 10 s (bundle `SETTINGS_COUNTDOWN_OPTIONS = [null, 3000, 5000, 10000]` ms); current `recordingCountdownDuration = None`.
- **Behaviour:** After "Record", an overlay says "Get ready. Recording will start soon." for the chosen duration, then the start sound plays and capture begins. The countdown is not part of the output.
- **Constraints and edge cases:** Countdown applies to every source type. Cancelling during the countdown: Not documented.
- **Stored as:** app preference `recordingCountdownDuration` (ms or null).
- **Confidence:** Build-confirmed.

### 22. Pause and resume
- **Where:** Floating recording widget "Pause" / "Resume recording" ("Continue recording"); command "Resume/Pause recording in progress".
- **Purpose:** Stop capture temporarily without ending the session.
- **Controls and options:** Pause and resume buttons; toasts "Recording paused" / "Recording resumed".
- **Behaviour:** Pause halts screen, camera and audio capture; resume continues into the same recording session. Final output is contiguous.
- **Constraints and edge cases:** "Cannot pause recording while another operation is in progress", "Cannot pause recording while there is no session", "Cannot resume recording while another operation is in progress". Voice-over recording in the editor is separate ("Finishing recording because video was paused").
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed strings; contiguity Inferred.

### 23. Restart entire recording
- **Where:** Recording widget "Restart entire recording"; command "Restart the entire recording".
- **Purpose:** Discard everything captured so far and begin again with the same source and settings.
- **Controls and options:** Confirmation "Are you sure you want to restart the entire recording?"; toasts "Restarting recording…", "Recording restarted".
- **Behaviour:** The current session is discarded, a new session starts immediately with identical input; countdown behaviour on restart Not documented.
- **Constraints and edge cases:** "Restart recording failed", "Cannot restart recording while another operation is in progress", "Cannot restart recording if not in restarting state"; "Restart recording in progress" blocks duplicate triggers.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed.

### 24. Cancel recording
- **Where:** Recording widget delete/cancel control; command "Cancel recording".
- **Purpose:** Abort the session and throw the captured files away.
- **Controls and options:** Confirmation "Are you sure you want to cancel recording?"; toasts "Cancelling current recording…", "Recording cancelled", "Set to idle after cancellation."
- **Behaviour:** Capture stops, temporary files are removed, no project is created, app returns to idle.
- **Constraints and edge cases:** "Cancel recording failed", "Cannot cancel recording if not in recording state", "Cannot cancel recording while another operation is in progress".
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed.

### 25. Recording markers
- **Where:** Command "Add recording marker" (available while recording; notification component `ActiveRecordingMarkersNotifications`).
- **Purpose:** Drop a timestamped note during capture to find the moment in the editor.
- **Controls and options:** Single action; no parameters documented.
- **Behaviour:** A marker with the current recording time is appended and a notification confirms it; markers are written to `recording-markers.json` in the project and appear on the timeline.
- **Constraints and edge cases:** Relationship to flags (26) is Not documented; both exist in the build. Default shortcut Not documented.
- **Stored as:** project file `recording-markers.json`.
- **Confidence:** Build-confirmed label and file (inventory); timeline display Inferred.

### 26. Recording flags
- **Where:** Global shortcut, default ⌘⌥⌃F, configurable in Settings > Shortcuts > "Create recording flag".
- **Purpose:** Mark moments (mistakes, chapter starts) while recording for quick navigation.
- **Controls and options:** Shortcut only; toast "Flag added". Tooltip: "Press this shortcut while recording to create a recording flag. Later, you will see moments marked with flags as " (sentence continues with a flag icon).
- **Behaviour:** Each press appends a time to `meta.recordingFlags` (current `[]`); the editor shows flags as timeline markers (Guide).
- **Constraints and edge cases:** Disabled when "No keyboard shortcuts during recording" is active (feature 34, Inferred). Only works while a session is live.
- **Stored as:** project key `meta.recordingFlags` (array).
- **Confidence:** Build-confirmed key and tooltip; default shortcut Guide.

### 27. Speaker notes window
- **Where:** Recording modal settings icon > "Show speaker notes" / "Hide speaker notes"; View command "Toggle show speaker notes".
- **Purpose:** Personal notepad visible to the presenter but never captured.
- **Controls and options:** Text area placeholder "Enter your notes here. This window will not be visible in the final recording…"; "Font size", "Notepad opacity"; preference `showSpeakerNotes` (current False).
- **Behaviour:** Opens a floating always-on-top window; text persists between sessions (storage Not documented). Contents are excluded from capture like the recording widget.
- **Constraints and edge cases:** Exclusion from capture relies on the macOS 12.3+ window-exclusion behaviour (Inferred from widget note).
- **Stored as:** app preference `showSpeakerNotes` (visibility); note text storage Not documented.
- **Confidence:** Build-confirmed labels and key; Guide for workflow.

### 28. Teleprompter
- **Where:** Inside the speaker notes window: "Start Prompter" button; shortcut ⌘⌥. ("Start/Stop prompter in speaker notes", "Toggle speaker notes prompter").
- **Purpose:** Auto-scroll the notes at a steady pace while talking.
- **Controls and options:** "Prompter Speed" slider (range Not documented), start/stop toggle; shares "Font size" and "Notepad opacity" with 27.
- **Behaviour:** Start scrolls the note text upward at the set speed; stop freezes it. Can be toggled by shortcut without focusing the window.
- **Constraints and edge cases:** Requires the speaker notes window to be open. Not recorded.
- **Stored as:** runtime only (speed persistence Not documented).
- **Confidence:** Build-confirmed labels; Guide for speed/opacity description.

### 29. Hide desktop icons
- **Where:** Recording modal options > "Hide desktop icons"; Settings > Recording "Hide desktop icons in recorded video".
- **Purpose:** Produce a clean desktop in the output without manually tidying files.
- **Controls and options:** Toggle; preference `hideDesktopContentWhileRecording`, current False.
- **Behaviour:** While recording, Finder desktop items are hidden and restored when the session ends (mechanism Not documented).
- **Constraints and edge cases:** Affects every display. Interaction with Stage Manager/third-party desktop tools Not documented.
- **Stored as:** app preference `hideDesktopContentWhileRecording`.
- **Confidence:** Build-confirmed label and key.

### 30. Hide dock icon while recording
- **Where:** Settings > General, "Hide Screen Studio dock icon while recording".
- **Purpose:** Keep the app's Dock tile out of the captured Dock during a session, independent of the global Hide Dock Icon setting (253).
- **Controls and options:** Toggle; preference `hideAppDockIconWhileRecording`, current True.
- **Behaviour:** On record start the Dock icon is removed; it returns when recording finishes (unless 253 keeps it hidden).
- **Constraints and edge cases:** When hidden, the Dock right-click "Finish Recording" route (Guide) is unavailable; use the widget, menu-bar icon or shortcut.
- **Stored as:** app preference `hideAppDockIconWhileRecording`.
- **Confidence:** Build-confirmed.

### 31. Dim outside recorded area
- **Where:** Settings > Recording, "Highlight recorded area during recording".
- **Purpose:** Visually show the capture boundary during area/window recordings.
- **Controls and options:** Toggle; tooltip "When enabled, part of the screen not being recorded will be slightly dimmed."; preference `recordingAreaCover`, current True.
- **Behaviour:** A translucent cover is drawn over the non-recorded region for the session; it is not captured.
- **Constraints and edge cases:** No effect for full-display recordings (Inferred). Dim strength not adjustable.
- **Stored as:** app preference `recordingAreaCover`.
- **Confidence:** Build-confirmed.

### 32. Floating recording widget
- **Where:** Settings > General "Show recording widget"; View command "Toggle recording widget" / "Show/Hide recording controls"; right-click widget > "Hide current recording control" (Guide).
- **Purpose:** On-screen status (elapsed time) and controls for finish, pause, restart, cancel.
- **Controls and options:** Toggle; tooltips "When enabled, Screen Studio will show a widget with the recording in progress status and controls." and "While recording is in progress, will show widget allowing you to finish, cancel or restart recording."; preference `showRecordingWidget`, current True. Buttons: Finish/Stop, Pause, Restart, Delete (Guide).
- **Behaviour:** Appears when a session starts; excluded from the capture on macOS 12.3+ (Guide). The same widget hosts the Quick Export overlay afterwards (42–47).
- **Constraints and edge cases:** On older macOS the widget may be captured (Guide). Stop is also available from the menu-bar icon, which the notch may hide (Guide).
- **Stored as:** app preference `showRecordingWidget`.
- **Confidence:** Build-confirmed; capture exclusion Guide.

### 33. Global start/stop shortcut
- **Where:** Settings > Shortcuts, "Start new Recording / Finish recording"; set during onboarding.
- **Purpose:** Open the picker or finish the current recording from any app.
- **Controls and options:** Click to reassign ("Press keys…", "Shortcut changed"). Default: Shift+Cmd+R (bundle default; inventory). Tooltip: "This shortcut will open new recording picker from anywhere in the system and it will also stop current recording. Make sure it is not conflicting with other global shortcuts."
- **Behaviour:** Idle: opens the recording modal. Recording: finishes it (opens editor or widget per 41). Duplicate presses are ignored ("Action triggered by global shortcut is already in progress. skipping").
- **Constraints and edge cases:** Conflicts with other global shortcuts are the user's responsibility. The guide lists option+cmd+enter as the picker shortcut.
- **Stored as:** shortcuts store (key name Not documented).
- **Confidence:** Build-confirmed tooltip and default; guide shortcut Guide.

### 34. Block shortcuts during recording
- **Where:** Settings > Shortcuts, "No keyboard shortcuts during recording" (with "Enable shortcuts" counterpart).
- **Purpose:** Prevent Screen Studio's own shortcuts from firing while you type in the recorded app.
- **Controls and options:** Toggle; default Not documented.
- **Behaviour:** When on, all app shortcuts (including flag creation, Inferred) are suspended for the duration of a session; the global start/stop shortcut behaviour under this setting is Not documented.
- **Constraints and edge cases:** Not documented.
- **Stored as:** Not documented (no matching key among the 55 preferences).
- **Confidence:** Build-confirmed label; everything else Inferred or undocumented.

### 35. Start/stop sounds
- **Where:** Automatic; no settings label found.
- **Purpose:** Audible cue that capture has begun or ended.
- **Controls and options:** None documented. Assets: `/assets/sounds/recording/begin-record.wav`, `/assets/sounds/recording/end-record.wav`.
- **Behaviour:** The start sound plays after the countdown ("Playing recording started sound."), the end sound on finish ("Playing recording finished sound."). Sounds are played by the app, not captured as system audio (Inferred).
- **Constraints and edge cases:** No toggle or volume control found in the string table.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed assets and log strings; non-capture Inferred.

### 36. Cursor recorded separately
- **Where:** Automatic during every screen recording; exposed via Export > "Extract raw recording files…".
- **Purpose:** Enables smoothing, resizing, restyling and hiding the cursor in the editor.
- **Controls and options:** None at record time. Raw files: `cursors.json` plus cursor images, `mousemoves-0.json`. Screen video is captured without the cursor (0.5 scale on Retina per inventory).
- **Behaviour:** Cursor shape changes and positions are logged with timestamps; the editor re-renders the cursor with the chosen set (`cursorSet.id`, current macos-tahoe), size (1.5) and spring physics.
- **Constraints and edge cases:** Imported videos and iOS devices have none ("There is no mouse cursor recorded"). Bluetooth mouse on iPad yields a non-smooth circle (Guide). "Failed to detect system settings for cursor size" falls back to default.
- **Stored as:** project raw files.
- **Confidence:** Build-confirmed (inventory D and strings).

### 37. Mouse clicks recorded
- **Where:** Automatic; Settings > Recording "Create zooms automatically" governs use.
- **Purpose:** Drive automatic zooms, click effects and click sounds.
- **Controls and options:** Raw file `mouseclicks-0.json`. Preference `createAutomaticZooms` (current True), tooltip "When enabled, Screen Studio will analyze your actions during the recording and create zooms automatically in every new project." Editor: `clickEffect` (none/circle/ripple, current none), `clickSoundEffect` (current none), `clickSoundEffectVolume` 0.25.
- **Behaviour:** Clicks are timestamped; on project creation, "follow-click-groups" zooms are generated when the preference is on.
- **Constraints and edge cases:** iOS taps are not captured, so no auto zooms for device recordings (Guide). Requires Accessibility permission (Inferred).
- **Stored as:** raw file; app preference `createAutomaticZooms`.
- **Confidence:** Build-confirmed.

### 38. Keystrokes recorded
- **Where:** Automatic; used by the editor "Keyboard Shortcuts" panel.
- **Purpose:** Show pressed shortcut labels in the video.
- **Controls and options:** Raw file `keystrokes-0.json`. Editor: "Show shortcuts" (`showShortcuts`, current False), "Show single key shortcuts" (`showShortcutsWithSingleLetters`, False; tooltip "By default, only 2+ keys shortcuts are shown. Enable this option to show single letter shortcuts as well."), "Shortcut labels size" (`shortcutsSizeRatio` 1).
- **Behaviour:** Key events are logged during capture; the editor offers "Shortcut labels are disabled in your project, do you want to enable them?" when you open the panel.
- **Constraints and edge cases:** Requires Accessibility permission (onboarding). "Show shortcuts" is disabled if no keys were pressed (Guide). Typed text is also used for typing speed-up suggestions.
- **Stored as:** raw file; project keys above.
- **Confidence:** Build-confirmed.

### 39. Auto-stop on low disk space
- **Where:** Automatic safeguard during recording.
- **Purpose:** Avoid corrupt recordings when the target volume fills.
- **Controls and options:** None. Free space is polled via `fs.freeDiskSpace` on the projects path and compared in gigabytes against a built-in threshold (value obfuscated; Not documented).
- **Behaviour:** When below threshold the session is finished automatically ("Stopping recording due to disk space") and the user sees "Recording was stopped because there is not enough disk space to continue recording." (toast "Recording stopped due to low disk space").
- **Constraints and edge cases:** If the check itself fails: "Failed to check disk space during recording" (recording continues). A recording that ends but cannot finalise: "Recording finished successfully, but failed to be fully finalized (likely due to disk space)."
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed strings and mechanism; threshold unknown.

### 40. Crash recovery
- **Where:** On launch dialog "Screen Studio found unfinished recording"; menu "Recover unfinished recordings" and "Try to recover recording from recording folder".
- **Purpose:** Rebuild a project from raw files if the app or recorder process died mid-session.
- **Controls and options:** Dialog "Do you want to recover recording? (" with "Recover recording" and "Delete and don't recover".
- **Behaviour:** Unfinished sessions are tracked in persisted state; on launch the app offers recovery, then "Recovering recording" and "Recording was recovered from an error and will be opened now (". A dead recorder process triggers "Will finish recording in progress because its process is not running anymore".
- **Constraints and edge cases:** "Recording can't be recovered" when files are unusable; "No unfinished recordings found" from the manual menu.
- **Stored as:** app state "unfinished recordings" list in `settings-persistance.json` (key name Not documented).
- **Confidence:** Build-confirmed.

### 41. Action after recording
- **Where:** Settings > Recording "After recording:"; picker settings "Show quick export widget after recording".
- **Purpose:** Decide whether a finished recording opens the full editor or the Quick Export widget.
- **Controls and options:** `actionAfterRecording` (current `create-project`); `showQuickExportWidget` (current True) with tooltip "After the recording is done, a widget will appear that allows you to quickly export the recording. If disabled - full editor will be opened instead."
- **Behaviour:** With the widget enabled, finishing shows the widget overlay (42–47); otherwise the editor opens ("Opened project").
- **Constraints and edge cases:** How the two keys combine when they disagree: Not documented.
- **Stored as:** app preferences `actionAfterRecording`, `showQuickExportWidget`.
- **Confidence:** Build-confirmed.

### 42. Quick Export: Record and Save
- **Where:** Recording modal "Record & Save" button; widget "Save" / "Quick export to file…".
- **Purpose:** Export straight to an MP4/GIF file with preset settings, skipping the editor.
- **Controls and options:** "Edit quick export settings" / "Quick export settings…" (format, resolution, fps, quality; "These settings will be used when using quick export or exporting from the widget"). "Always save project when using quick export widget" (`alwaysSaveProjectWhenUsingQuickExportWidget`, current False; tooltip "If enabled, the project will be always saved after using the quick export widget. If disabled, You will be asked if you want to save or delete project.").
- **Behaviour:** Finish → widget shows preview → export runs ("Export from widget", "Video will be available after export") → file saved; then "Do you want to save your project before closing or delete it?" unless always-save is on. `actionAfterQuickExport` (current `do-nothing`).
- **Constraints and edge cases:** Export requires an active licence (trial blocks export). "Only one export can be active at a time".
- **Stored as:** app preferences listed; quick-export defaults (key Not documented).
- **Confidence:** Build-confirmed.

### 43. Quick Export: Record and Copy
- **Where:** Recording modal "Record & Copy"; widget "Copy" / "Quick export to clipboard".
- **Purpose:** Put the exported video on the clipboard for pasting into chat or mail.
- **Controls and options:** Same quick-export settings as 42; "Show previous clipboard exports" / "Open recent Clipboard exports".
- **Behaviour:** Export then copy ("Export and copy to clipboard", toast "Copied to clipboard"); temporary files are listed under recent clipboard exports.
- **Constraints and edge cases:** Licence requirement as 42. Where clipboard files are kept and for how long: Not documented.
- **Stored as:** runtime only plus shared quick-export settings.
- **Confidence:** Build-confirmed.

### 44. Quick Export: Record and Create Link
- **Where:** Recording modal "Record & Create Link"; widget "Share" / "Quick export to shareable link".
- **Purpose:** Upload and get a screen.studio/share link immediately.
- **Controls and options:** Public/Private choice ("Only the people you share this video with will be able to watch it."), optional title (see 46). Fixed resolution: "Shareable links are always exported as ".
- **Behaviour:** "Export and create shareable link" → "Uploading video" → "Link copied to clipboard"; link opens in browser. First use: "We will automatically create an account for you to manage your shareable links."
- **Constraints and edge cases:** "To create a shareable link, you need to have an active license or subscribe to a plan."; "Can't export to shareable link because of internet connection"; "Cannot create shareable link for projects longer than" (Guide: 30 minutes). Troubleshooting toggles: "Enhanced shareable links upload settings" (`useExperimentalUploadFeatures`), "Skip network certificate validation".
- **Stored as:** runtime; link management on the dashboard.
- **Confidence:** Build-confirmed; duration limit Guide.

### 45. Quick Export: muted preview
- **Where:** Widget overlay "Mute widget preview" / "Unmute widget preview".
- **Purpose:** Silence the preview playback in the widget.
- **Controls and options:** Toggle; preference `muteQuickExportWidgetPreview`, current False.
- **Behaviour:** The widget plays the fresh recording; muting affects only this preview, never the export.
- **Constraints and edge cases:** None documented.
- **Stored as:** app preference `muteQuickExportWidgetPreview`.
- **Confidence:** Build-confirmed.

### 46. Quick Export: edit title before sharing
- **Where:** Settings > Export & Share "Edit project title before exporting to shareable link".
- **Purpose:** Name the shared video instead of using the auto-generated project name.
- **Controls and options:** Toggle (`editProjectTitleWhenUsingQuickExportWidget`, current False); tooltip "If enabled, you will be able to edit the project title before exporting to shareable link."; field "Video title…".
- **Behaviour:** When on, the link export pauses for a title prompt; the title is shown on the share page.
- **Constraints and edge cases:** Project names are normalised ("Screen Studio will automatically normalize project name", "Project name contains forbidden characters").
- **Stored as:** app preference `editProjectTitleWhenUsingQuickExportWidget`.
- **Confidence:** Build-confirmed.

### 47. Quick Export: continue in full editor
- **Where:** Widget "Edit" button, double-click, or "Continue editing in full editor".
- **Purpose:** Leave the quick path and open the recording as a normal project.
- **Controls and options:** Button only.
- **Behaviour:** The project is created and opened in the editor ("Create project"); any widget export already running continues ("Waiting for previous export to finish" where relevant).
- **Constraints and edge cases:** None documented.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed label; Guide for double-click.



## Part 2 — Editor shell, Clips, Zooms

Conventions: "Build-confirmed" facts come from the installed 3.7.3 (4475) bundle (action definitions, default shortcuts, option lists, strings) or from `project-settings.txt`; "Guide" facts come from the official guide pages summarised in `research-editing.md`; "Inferred" marks behaviour deduced from code structure rather than observed in the UI. Shortcut names use the bundle's key names (Meta = ⌘, Alt = ⌥, Control = ⌃).

### 48. Preview canvas with Auto, Crop and Mask tools
- **Where:** Centre of the editor window; a small toolbar sits above the preview with the output aspect-ratio picker (default label "Auto"), the "Crop" button and the "Mask" button.
- **Purpose:** Shows the rendered output (background, screen, cursor, camera, captions) at the current playhead and hosts the three framing tools.
- **Controls and options:** Aspect picker tooltip "Output aspect ratio"; options Auto (tip "Recording + Padding"), Wide 16:9 (tip "Horizontal video not cropped on any major social media platform"), Square 1:1, Classic 4:3, Vertical 9:16 (tip "Tiktok, Intagram stories, etc."), Tall 3:4, Portrait 4:5 (tip "Optimized for Instagram and Facebook feeds"); picking a vertical ratio reveals the "Always keep zoomed in" toggle. "Crop" (supplementary label "Crop recorded area") opens the Crop window (see 100). "Mask" opens mask creation ("Create mask...", "Sensitive data mask" / "Highlight mask"). Current value: `config.defaultOutputAspectRatio = None` (Auto).
- **Behaviour:** Changing the ratio writes `defaultOutputAspectRatio` (raw x:y or null) and is tracked as "Aspect ratio changed". The Crop button pauses playback and opens or focuses the crop child window. The Mask button is highlighted while a mask editor is open in the sidebar. The preview is rendered at most at the configured preview height (see 67) and respects the performance modes (69, 70).
- **Constraints and edge cases:** Crop is only enabled when `project.capabilities.changeCrop` is true (not for imported videos per guide). Masks: "Preview is showing different part of the recording than the one covered by the mask." is shown when the playhead is outside a mask being edited.
- **Stored as:** `config.defaultOutputAspectRatio`, `config.alwaysKeepZoomedIn`, `config.recordingCrop`, `scenes[].masks` (project.json).
- **Confidence:** Build-confirmed (option list, labels, keys); Guide for the six-option list (build adds Portrait 4:5).

### 49. Sidebar panels (Background and Screen, Cursor, Camera, Captions, Audio, Shortcuts, Animations)
- **Where:** Right-hand sidebar; the root panel is chosen from the sidebar navigation or with ⌘1…⌘8; selected timeline items open an item editor in the same sidebar.
- **Purpose:** Hosts every per-project setting; item editors (zoom, clip, layout, mask, voiceover) temporarily replace the root panel.
- **Controls and options:** Root sections and default shortcuts: "Background & Screen" ⌘1, "Cursor" ⌘2, "Camera" ⌘3, "Captions" ⌘4, "Audio" ⌘5, "Keyboard Shortcuts" ⌘6, "Animations" ⌘7, "Device frame" ⌘8. "Close" (Escape) closes the current item editor; the close button is labelled per item type: "Close Zoom editor", "Close Slice editor", "Close Camera Layout editor", "Close Mask editor", "Close Voiceover editor". Preference `highlightSidebarNavigationLabels = True`.
- **Behaviour:** Opening a section sets the sidebar root and is tracked as "Open sidebar". Clicking a timeline item sets `sidebarItem` and shows its editor; the editor closes automatically if the item disappears (for example after "Remove all zoom ranges").
- **Constraints and edge cases:** "Cursor" is only applicable when `project.capabilities.showMouseCursor` is true (no cursor for imported video / external-device recordings). "Camera" and "Device frame" depend on the recording having a camera / being from an iPhone or iPad. Panel contents are specified in Part 3 (background, cursor, camera, captions, audio, shortcut labels, animations).
- **Stored as:** Panel values live in `project.json` `config.*`; which panel is open is runtime only.
- **Confidence:** Build-confirmed (section names, shortcut sequence ⌘1–⌘8, close labels, capability checks).

### 50. Timeline tracks (clips, zooms, camera layouts, masks, shortcuts, audio waveform)
- **Where:** Bottom of the editor; the clip track is always present, the other tracks are chosen with the Visible-tracks picker (51).
- **Purpose:** Time-based editing surface for clips (yellow bar with length and speed), zooms (purple blocks), camera layouts, masks and pressed-shortcut labels.
- **Controls and options:** Track definitions: "Zooms" (tip "Zoom track", key 1, always forced on), "Camera Layouts" (tip "Camera Layouts track", key 2), "Masks" (tip "Masks track", key 4), "Shortcuts" (tip "Shortcuts track", key 3). Clip items show duration, "×" speed badge, a "Hide" badge when the cursor is hidden for that clip, and the microphone waveform as background unless `hideAudioWaveform = True` (menu "Show audio waveform"). Zoom items show "1.14×" style level and "Auto"/"Manual". A "+" add button offers "Zoom:" → "Automatic zoom" / "Manual zoom" and, with a camera, "Dynamic camera layout:" → "Fullscreen camera layout" etc.
- **Behaviour:** Clicking an empty spot on the zoom/layout/mask track adds an item at that time ("Click or drag to add zoom on cursor"); dragging edges changes length; items are draggable (grab cursor). Right-click opens the context menu built from the item's actions. Recording flags and markers appear as flag icons at their recorded times; pause markers also appear.
- **Constraints and edge cases:** Adding where there is no room: "Not enough space in selected timeline position to add a new layout" / "...a new mask", "Could not insert zoom at currently selected time". Waveform generation shows "Generating microphone waveform..." / "Generating system audio waveform..." / "No audio recorded".
- **Stored as:** `scenes[].slices`, `scenes[].zoomRanges`, `scenes[].layouts`, `scenes[].masks`; waveform visibility in preference `hideAudioWaveform` (False).
- **Confidence:** Build-confirmed (track definitions, badges, strings); Guide for colours (yellow clip bar, purple zoom blocks).

### 51. Visible-tracks picker
- **Where:** Timeline toolbar button with tooltip "Visible timeline tracks"; keys 1–4 toggle tracks directly.
- **Purpose:** Chooses which optional tracks are shown so the timeline stays compact.
- **Controls and options:** Multi-select list: Zooms (1), Camera Layouts (2), Shortcuts (3), Masks (4); each row shows an icon, name and shortcut; the trigger shows "N visible timeline". Zooms is forced on; Camera Layouts is forced when the scene already has layouts, Masks when it has masks.
- **Behaviour:** Toggling a hidden track calls `tryToShowTrack`. Showing Camera Layouts when `config.hideCamera` is true asks "Enable webcam" — "Webcam is disabled in your project, do you want to enable it?" (confirm "Enable webcam") and turns the camera on. Showing Shortcuts when `config.showShortcuts` is false asks "Enable shortcuts" — "Shortcut labels are disabled in your project, do you want to enable them?" (confirm "Enable shortcuts"). Hiding the camera later auto-hides the layouts track; disabling shortcut labels auto-hides the shortcuts track.
- **Constraints and edge cases:** Camera Layouts is disabled when the recording has no camera; Shortcuts is disabled when no keystrokes were recorded. The number-key shortcuts are suppressed while a zoom or layout item has focus (those keys set zoom level there).
- **Stored as:** Runtime only (track visibility is view state); the dialogs write `config.hideCamera` / `config.showShortcuts`.
- **Confidence:** Build-confirmed.

### 52. Play and pause
- **Where:** Transport bar under the preview (play.circle / pause.circle button); Space; command menu "Play"/"Pause".
- **Purpose:** Starts or stops preview playback at the current playhead.
- **Controls and options:** Action `togglePlay`, default shortcut Space; label switches between "Play" and "Pause" depending on `playback.isPlaying`.
- **Behaviour:** Toggles playback; speed is whatever was last set (see 54). Playback honours clip speed, trims, loop (57) and the mute states of the audio tracks. While playing, the sidebar hides the small webcam and captions previews when a mask is being edited (`shouldHideSmallWebcamInPreview`).
- **Constraints and edge cases:** Actions triggered by shortcut while another is running log "Action triggered by shortcut is already in progress. skipping". Clip audio is silent for parts faster than 2× (see 91).
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed.

### 53. Play backward
- **Where:** Keyboard J; command menu "Play backward or increase speed"; Settings > Shortcuts > Editing "Play backward or increase speed".
- **Purpose:** Reverse playback for reviewing, with repeated presses accelerating.
- **Controls and options:** Action `playBackwardOrIncreaseSpeed`, default shortcut J (remappable, keys only).
- **Behaviour:** If paused: sets speed −1 and plays. If already playing forward: switches to −1. If already playing backward: doubles the magnitude (−2, −4) up to the cap −8. K stops and resets speed to 1 (see 54).
- **Constraints and edge cases:** Maximum backward speed 8×. Audio is not played in reverse (Inferred). Not available while no playback exists.
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed (shortcut, doubling, cap 8); audio behaviour Inferred.

### 54. Playback speed control
- **Where:** Transport bar "Playback speed" button (shows current speed, right-click for a list); keys L / K; command menu "Play or increase speed", "Stop and reset speed"; Settings > Shortcuts > Editing.
- **Purpose:** Fast or slow preview without changing the project.
- **Controls and options:** L (`playForwardOrIncreaseSpeed`): if paused, speed 1 and play; if playing backward, 1; otherwise double (2, 4, 8) capped at 8. K (`stopAndResetSpeed`, applicable only while playing): pause and set speed 1. Clicking the speed button cycles through preset speeds; right-click offers the list (values shown as "N×").
- **Behaviour:** Speed multiplies the playback clock; media elements have their `playbackRate` clamped to the browser range (Inferred). The preview mode "Performance" may raise frame rate (see 70).
- **Constraints and edge cases:** Cap ±8×. The transport speed is separate from per-clip speed (89), which is baked into the project.
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed (L/K, doubling, cap, button tooltip); list contents of the right-click menu not documented.

### 55. Step forward/back with fast variants
- **Where:** ArrowLeft / ArrowRight; Shift+ArrowLeft / Shift+ArrowRight; command menu "Move backwards", "Move forwards", "Move backwards fast", "Move forwards fast".
- **Purpose:** Frame-accurate nudging when paused, time jumps while playing.
- **Controls and options:** `moveBackwards` ArrowLeft, `moveForwards` ArrowRight, `moveBackwardsFast` Shift+ArrowLeft, `moveForwardsFast` Shift+ArrowRight.
- **Behaviour:** When paused the plain arrows move exactly one frame. When playing they jump by playback time: the bundle constants evaluate to −1000 ms (back), +500 ms (forward), −2000 ms (back fast) and +1000 ms (forward fast).
- **Constraints and edge cases:** The jump stops at the first/last frame. Arrow keys are also used by the crop window (101) and layout editors (move camera 1 px/10 px), which take precedence while focused.
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed for shortcuts and 1-frame stepping; millisecond amounts are Inferred from obfuscated arithmetic.

### 56. Go to first or last frame
- **Where:** ⌘ArrowLeft / ⌘ArrowRight; command menu "Go to first frame" / "Go to last frame".
- **Purpose:** Jump to the start or end of the edited timeline.
- **Controls and options:** `goToFirstFrame` (icon backward.end) = `playback.stop()`; `goToLastFrame` (icon forward.end) = `playback.stopAtEnd()`.
- **Behaviour:** Both stop playback and place the playhead at the first or last playback frame (after trims and cuts). With loop enabled, playing from the last frame restarts (Inferred).
- **Constraints and edge cases:** None documented.
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed.

### 57. Loop playback
- **Where:** Transport context menu "Loop playback"; command menu "Enable loop playback" / "Disable loop playback" (icon repeat).
- **Purpose:** Repeats the preview continuously for review.
- **Controls and options:** Toggle; preference `playbackLoop = False`; no default shortcut.
- **Behaviour:** When on, reaching the end restarts from the first frame; the setting is global (applies to every project). Tracked as "Toggle loop playback".
- **Constraints and edge cases:** Exports ignore it; GIF exports play once ("Exported GIF will only play once and then stop").
- **Stored as:** App preference `playbackLoop`.
- **Confidence:** Build-confirmed.

### 58. Timeline zoom
- **Where:** Slider next to the scissors in the timeline toolbar; ⌘= / ⌘-; command menu "Zoom in" / "Zoom out" (group Playback).
- **Purpose:** Changes how much of the timeline is visible.
- **Controls and options:** Slider preview "Timeline zoom — N seconds visible" / "— N minutes visible"; range: minimum 2 s visible, maximum the project duration capped at 10 minutes. ⌘= multiplies the visible duration by 0.75, ⌘- by 1.25.
- **Behaviour:** The visible window animates with a spring (stiffness 6000, damping 350); the view keeps the playhead visible when possible. Pinch gestures on the timeline also zoom (Inferred from `onPinch`).
- **Constraints and edge cases:** "Visible playback duration is not positive" / "Pixels per playback ms is not positive" are internal assertions.
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed (shortcuts, factors, limits, label text).

### 59. Scrubber
- **Where:** The timeline. The playhead is a ball with a 1 px bar (component "TimeIndicator") drawn over every track; the timeline toolbar next to the timeline-zoom slider has the audio-scrubber button (icon waveform.badge.magnifyingglass, tooltip "Enable audio scrubber (experimental)" / "Disable audio scrubber").
- **Purpose:** Move through the recording with the mouse and see (optionally hear) the frame under the pointer without starting playback.
- **Controls and options:** Click anywhere on the timeline to seek the playhead to that time. Moving the mouse over the timeline previews the frame at the pointer; leaving the timeline cancels the preview. Mouse wheel pans the timeline; ⌘ + wheel changes the visible duration (timeline zoom); trackpad pinch zooms. Audio scrubber: app preference `playbackAudioScrubber`, default off.
- **Behaviour:** The timeline controller installs four handlers: seek on click, preview seek on mouse move, seek stop on mouse leave, and "keep playhead visible" while playing. Preview seeks update a `previewTime` separate from the real head time, so the playhead ball stays where it was until a click commits. With the audio scrubber on, the media sync layer lets the audio element follow preview seeks (gated by `getIsScrubberEnabled`); media playback rate follows the current speed and is clamped to 8×. If a voice-over asks to mute the original at that time, the scrubbed audio volume is 0.
- **Constraints and edge cases:** The guide describes a dedicated scrubber "above the timeline" that plays forward or backward at drag speed. In 3.7.3 the behaviour found is hover-preview plus click-seek; no drag-speed scrubber component was located, and the timeline's `isSeekDisabled` flag turns seeking off while resizing clips. The audio scrubber is marked experimental.
- **Stored as:** App preference `playbackAudioScrubber` (bool). Playhead and preview times are runtime only.
- **Confidence:** Build-confirmed (3.7.3 code: click seek, hover preview, preference key and default, 8× rate cap). The drag-speed description exists only in the guide.

### 60. Audio scrubber (experimental)
- **Where:** Timeline toolbar button (icon waveform.badge.magnifyingglass) with tooltip "Enable audio scrubber (experimental)" / "Disable audio scrubber".
- **Purpose:** Hear audio while scrubbing to find words or sounds.
- **Controls and options:** Toggle; preference `playbackAudioScrubber = False`.
- **Behaviour:** When enabled, each scrub position sets the audio element's time and briefly plays it (`scrub` → `brieflyPlay` with a short timeout), for microphone, system and external-device tracks that have enough data loaded.
- **Constraints and edge cases:** Only works when the media has `HAVE_ENOUGH_DATA`; positions outside the media duration are ignored. Marked experimental.
- **Stored as:** App preference `playbackAudioScrubber`.
- **Confidence:** Build-confirmed.

### 61. Smooth waveform toggle
- **Where:** View menu / command menu "Smooth waveform" (group View, visible group "waveform"), alongside "Show audio waveform".
- **Purpose:** Chooses between a smoothed and a raw waveform drawing on clips.
- **Controls and options:** Toggle; preference `enableSmoothWaveform = True`. Related: `hideAudioWaveform = False` ("Show audio waveform").
- **Behaviour:** Switching re-renders the waveform background of every clip; tracked as "Toggle smooth waveform". Waveform points are precomputed ("waveformPoints" assets).
- **Constraints and edge cases:** No waveform when the recording has no audio ("No audio recorded").
- **Stored as:** App preferences `enableSmoothWaveform`, `hideAudioWaveform`.
- **Confidence:** Build-confirmed.

### 62. Always-show timeline scrollbar
- **Where:** Timeline context menu "Always show timeline scrollbar"; command menu label toggles between "Always show timeline scrollbar" and "Hide timeline scrollbar" (icon chevron.up.chevron.down).
- **Purpose:** Keeps the horizontal timeline scrollbar permanently visible instead of auto-hiding.
- **Controls and options:** Toggle; preference `alwaysShowTimelineScrollbar = False`.
- **Behaviour:** Toggles the scrollbar's auto-hide; tracked as "Toggle always show timeline scrollbar".
- **Constraints and edge cases:** None documented.
- **Stored as:** App preference `alwaysShowTimelineScrollbar`.
- **Confidence:** Build-confirmed.

### 63. Undo and redo
- **Where:** ⌘Z / ⌘⇧Z; Edit menu and command menu "Undo" / "Redo" (group Editor).
- **Purpose:** Reverts or re-applies project edits.
- **Controls and options:** `projectUndo` ⌘Z (applicable when `history.canUndo`), `projectRedo` ⌘⇧Z (`history.canRedo`).
- **Behaviour:** Every project update is recorded as a redo/undo patch pair in a history buffer (buffer size constant 100); undo applies the inverse patch and moves the index back, redo re-applies. Playback position is preserved around the operation (`stickyAction`). Tracked as "Undo used" / "Redo used".
- **Constraints and edge cases:** Undo covers project data (clips, zooms, config); app preferences, saving and deleting a project are not undoable ("This action cannot be undone." on Delete project). A dedicated "Undo trim" exists for trim bubbles (82).
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed (shortcuts, history mechanics); buffer size Inferred.

### 64. Command menu Cmd+K
- **Where:** Toolbar button (icon command.circle, tooltip "Show command menu..."); ⌘K.
- **Purpose:** Search and run any editor action: switch tools, edit items, change settings.
- **Controls and options:** Opens a searchable list of all registered actions grouped by `group` (Playback, Slice, Zoom, View, Project, Export, Sidebar, Help, …) with their shortcuts; actions whose `canApply` fails are hidden or disabled ("Action is not applicable").
- **Behaviour:** Opening is tracked as "Command menu opened". Items act on the current target (selected slice/zoom/layout/mask or the project).
- **Constraints and edge cases:** The ⌘K button is marked `dontTriggerShortcut`, so the key is handled globally. Dev actions are only listed in dev mode.
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed; Guide for the description of what it can do.

### 65. Keyboard shortcuts guide
- **Where:** ⌘/ ("Show shortcuts guide", group Help); Help menu.
- **Purpose:** Floating reference of every editor action and its current shortcut.
- **Controls and options:** Window titled " Shortcuts Guide" (keyboard icon), default width 1180 px, minimum 480×480, resizable, always on top, bounds persisted under "shortcuts-guide"; search field "Filter shortcuts..."; Escape closes; empty result "No shortcuts found".
- **Behaviour:** Lists actions grouped by section with shortcut labels; filtering is live. Tracked as "Showed shortcuts guide".
- **Constraints and edge cases:** Shows remapped shortcuts (66) as currently set.
- **Stored as:** Runtime only (window bounds persisted in app state).
- **Confidence:** Build-confirmed.

### 66. Remappable shortcuts
- **Where:** Settings (⌘,) > "Shortcuts" tab, with "Recording" and "Editing" sub-tabs.
- **Purpose:** Lets users reassign the predefined shortcuts.
- **Controls and options:** Editing tab rows: "Cut slice at current time" (default c), "Remove slice before previous cut" (default x), "Play or increase speed" (L), "Play backward or increase speed" (J), "Stop and reset playback speed" (K) — these accept keys only (`allowKeysOnly`). Recording tab rows: "Start new Recording / Finish recording", "Resume/Pause recording in progress", "Restart recording in progress", "Create recording flag", "Show/Hide recording controls", speaker-notes prompter, etc.; these are global and clearable. Picker shows "Press keys..." while recording a combo; toast "Shortcut changed".
- **Behaviour:** The new combination replaces the action's default; conflicts with other global shortcuts must be avoided ("Make sure it is not conflicting with other global shortcuts."). "Reset preferences" restores defaults.
- **Constraints and edge cases:** Only the listed actions are remappable in 3.7.3; other editor shortcuts are fixed. "No keyboard shortcuts during recording" option disables all shortcuts while recording.
- **Stored as:** App preferences (shortcut store); exact key name not present in `project-settings.txt` — Not documented.
- **Confidence:** Build-confirmed (rows, picker strings); storage key Not documented.

### 67. Preview size limit
- **Where:** Transport bar "Preview size" picker (icon magnifyingglass); command menu "Preview size" with sub-items.
- **Purpose:** Caps the resolution at which the preview is rendered to balance sharpness and performance.
- **Controls and options:** Sub-actions 480p (480), 720p (720), 1080p (1080), 1440p (1440), 2160p (2160); preference `playbackPreviewMaxHeight = 1080`.
- **Behaviour:** Selecting a size writes the preference; the preview canvas is rendered at most at that height. Choosing a larger size shows the throttled toast "Increasing the playback preview size may affect preview playback performance".
- **Constraints and edge cases:** Export resolution is independent (export dialog).
- **Stored as:** App preference `playbackPreviewMaxHeight`.
- **Confidence:** Build-confirmed.

### 68. Optimise preview rendering
- **Where:** Settings > Experimental, toggle "Optimize preview rendering".
- **Purpose:** Saves CPU/GPU by pausing rendering when nothing changed.
- **Controls and options:** Toggle; description "Optimize preview rendering by pausing rendering when nothing has changed in the project. If the preview seems not to react to edits, try disabling this option."; preference `optimizePreviewRendering = True`.
- **Behaviour:** Passed into the playback engine as `optimizePreviewRendering`; when on, frames are only re-rendered on project or time changes. Tracked as "Optimize preview rendering changed".
- **Constraints and edge cases:** The description itself names the failure mode (preview not reacting to edits).
- **Stored as:** App preference `optimizePreviewRendering`.
- **Confidence:** Build-confirmed.

### 69. High-performance or low-power playback
- **Where:** "Video preview performance settings" popover (gauge icon next to Export) → toggle "Power saving mode".
- **Purpose:** Reduces CPU/GPU and power use during preview.
- **Controls and options:** Toggle; description "Turning on will result in lower CPU/GPU and power usage. Enabling might decrease frame rate of the preview video."; preference `playbackEnergyMode = high-performance` (toggle on = `low-power`).
- **Behaviour:** Sets the WebGL `powerPreference` for the preview renderer and lowers the frame budget (Inferred). The popover trigger shows an indicator dot whenever this or Preview mode (70) is not at its default. Tracked as "Power saving mode changed".
- **Constraints and edge cases:** Preview only; export is unaffected.
- **Stored as:** App preference `playbackEnergyMode`.
- **Confidence:** Build-confirmed (label, description, values); renderer effect Inferred.

### 70. High-quality playback mode
- **Where:** Same popover as 69 → "Preview mode" segmented control.
- **Purpose:** Trades preview fidelity for frame rate.
- **Controls and options:** "Quality" (`high-quality`): "Preview video looks exactly the same as exported video. All features, such as motion blur are enabled in preview."; "Performance" (`high-speed`): "Some features such as motion blur are disabled in preview video. Images and shapes might be pixelated. Might result in higher playback FPS."; preference `playbackQualityMode = high-quality`.
- **Behaviour:** Performance mode disables motion blur in the preview and uses lower-quality scaling; tracked as "Preview mode changed".
- **Constraints and edge cases:** Export always renders at full quality.
- **Stored as:** App preference `playbackQualityMode`.
- **Confidence:** Build-confirmed.

### 71. Reel preview mode
- **Where:** View / command menu "Reel mode" (icon inset.filled.bottomthird.rectangle.portrait) with sub-items "Disable", "Instagram", "TikTok".
- **Purpose:** Overlays the Instagram or TikTok UI safe areas on a vertical preview so captions and content are not hidden by app chrome.
- **Controls and options:** Preference `reelPreviewMode = False` | `'instagram'` | `'tiktok'`.
- **Behaviour:** Draws an app header/footer mock ("InstagramReelPreview__UISystemHeader", "TikTokReelPreview__UIAppHeaderLabel") over the preview; tracked as "Reel preview mode". Pairs with the Vertical 9:16 aspect ratio.
- **Constraints and edge cases:** Overlay is preview-only and never exported.
- **Stored as:** App preference `reelPreviewMode`.
- **Confidence:** Build-confirmed.

### 72. Toggle sidebar, timeline and preview
- **Where:** View menu / command menu "Show editor sidebar", "Show editor timeline", "Enter preview mode" (⌘⇧Enter).
- **Purpose:** Hides panels to enlarge the preview.
- **Controls and options:** Layout states `edit`, `hide-sidebar`, `hide-timeline`, `preview`. "Show editor sidebar" toggles edit↔hide-sidebar (and preview↔hide-timeline); "Show editor timeline" toggles edit↔hide-timeline (and preview↔hide-sidebar); "Enter preview mode" toggles preview↔edit.
- **Behaviour:** Transitions are animated (`runTransition`). Preview mode hides both sidebar and timeline; `shouldShowSidebar/Timeline` derive from the state. Tracked as "Toggle editor sidebar/timeline/preview".
- **Constraints and edge cases:** Opening an item editor while the sidebar is hidden does not automatically reveal it (Not documented).
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed.

### 73. Autosave every 30 seconds
- **Where:** Settings > Editing, toggle "Use autosave".
- **Purpose:** Saves dirty projects automatically.
- **Controls and options:** Description "When enabled, app will save your project changes automatically every 30 seconds."; preference `autoSaveProject = True`.
- **Behaviour:** While a project window is open and the preference is on, a 30 000 ms interval checks `project.isDirty` and saves (`project.updateProject` with the raw data), then marks the project as just saved (`lastSavedAt`). Manual save is still available. Tracked as "Use autosave changed".
- **Constraints and edge cases:** With autosave off, closing asks "Your project has unsaved changes. Are you sure you want to close?" or "Do you want to save your project before closing or delete it?" (options save / delete).
- **Stored as:** App preference `autoSaveProject`; `lastSavedAt` in project.json (current 2026-11-13T19:08:57.685Z).
- **Confidence:** Build-confirmed.

### 74. Save and Save As
- **Where:** File menu / ⌘S "Save"; ⌘⇧S "Save as..."; command menu group Project.
- **Purpose:** Persist the `.screenstudio` bundle, optionally to a new location/name.
- **Controls and options:** Save writes `project.json` and shows "Project saved" (2 s). Save as opens a file dialog (title "Save project as...", message "Pick location to save project", extension `screenstudio`, default name = project name), copies the whole bundle to the new path, repoints the open project and saves.
- **Behaviour:** Projects live in `projectsFolderPath` (current `/Users/subhamdas/Screen Studio Projects`, Settings > General "Save new projects to"). Project names are normalised ("Screen Studio will automatically normalize project name"; "Filename contains forbidden characters").
- **Constraints and edge cases:** Save as errors: "Invalid file name" — "File extension must be .screenstudio" / "File name cannot be empty". Note: in this build "Remove project" has no shortcut; "Crop" has none either.
- **Stored as:** `project.json` (`lastSavedAt`, `updatedAt`); preference `projectsFolderPath`.
- **Confidence:** Build-confirmed.

### 75. Recent projects and open last project
- **Where:** File > "Open recent" submenu; "Open last project" ⌘⌥Z; "Open project..." ⌘O; "Show previous projects" (Browse group).
- **Purpose:** Quick access to the last projects.
- **Controls and options:** Recent list capped at 10 paths (`recentProjects` store); each entry shows the project name with the app icon. "Open last project" is applicable only when the list is non-empty.
- **Behaviour:** Opening a project marks it recent (`project.markAsRecent`). Entries whose files disappear are pruned (file watcher). Choosing a missing entry shows error box "Failed to open project" — "Project file was not found. It might have been moved or deleted". On launch the app may reopen the recent project if `shouldOpenRecentProject` was set when the last window closed.
- **Constraints and edge cases:** "Clear recently opened documents..." exists as a menu string. Dock-icon recent list per guide.
- **Stored as:** App state `recentProjects`, `shouldOpenRecentProject`.
- **Confidence:** Build-confirmed (cap 10, strings, shortcut); Dock list Guide.

### 76. Show project in Finder
- **Where:** File menu / command menu "Show project in Finder" ⌘⇧O (group Project, icon folder).
- **Purpose:** Reveals the `.screenstudio` bundle for sharing or backup.
- **Controls and options:** None.
- **Behaviour:** Calls `files.showFileInFolder` with the project path; tracked as "Showed project in Finder". Related: "Copy and zip project" (toast "Copied project to clipboard" / "Failed to copy project to clipboard") and "Extract raw recording files..." (folder picker, confirm "Extract").
- **Constraints and edge cases:** None documented.
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed.

### 77. Copy current frame as image
- **Where:** ⌘C with nothing selected; preview right-click "Copy current frame as image"; command menu group Clipboard.
- **Purpose:** Puts a PNG of the composed frame on the clipboard.
- **Controls and options:** Single action `copyToClipboard` whose label depends on target: "Copy slice settings", "Copy zoom range", "Copy layout", "Copy mask", otherwise "Copy current frame as image". Default shortcut ⌘C.
- **Behaviour:** Renders the current frame at 2160 px height, wraps it as `image/png` ClipboardItem and writes it; toast "Current frame image copied to clipboard" or "Failed to copy current frame to clipboard".
- **Constraints and edge cases:** Requires an active playback/preview. "Show previous clipboard exports" / "Open recent Clipboard exports" list earlier clipboard exports.
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed.

### 78. Export current frame as image
- **Where:** Export menu / command menu "Export current frame as image..." (group Export, icon square.and.arrow.up).
- **Purpose:** Saves the composed frame as an image file.
- **Controls and options:** Opens a save dialog; file name suffix " - Frame " plus time (string present).
- **Behaviour:** Renders the frame at 2160 px height and writes the file; applicable only when playback exists.
- **Constraints and edge cases:** Format is PNG (same renderer as 77; Inferred).
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed (action, height); format Inferred.

### 79. Seasonal snow effect
- **Where:** Snowflake toolbar button (tooltip "Jingle all the way") shown only in season; Settings > General `enableSnow`.
- **Purpose:** Festive decoration over the editor.
- **Controls and options:** Preference `enableSnow = True`; 150 snowflakes rendered on a canvas ("SnowfallCanvas").
- **Behaviour:** The button and effect appear only between 20 December and 5 January (month/day check); clicking toggles `enableSnow`. Starts after a 500 ms delay.
- **Constraints and edge cases:** Never exported; hidden outside the date window regardless of the preference.
- **Stored as:** App preference `enableSnow`.
- **Confidence:** Build-confirmed.

### 80. Trim start and end
- **Where:** Drag the left or right edge of a clip on the clip track; the clip editor in the sidebar shows the resulting range.
- **Purpose:** Hide unwanted footage at either end of a clip without deleting it.
- **Controls and options:** Edge handles (cursor ew-resize). The trimmed amount is shown as a yellow bubble with a scissors icon at the trim point and the trimmed duration label.
- **Behaviour:** Dragging updates `sourceStartMs` / `sourceEndMs`; `prepareUpdateInfo` clamps the start to ≥ 0 and ≥ previous clip's end, the end to ≤ source duration and ≤ next clip's start, so clips never overlap. Trimmed footage stays in the recording and can be restored (82). Current clip: `sourceStartMs = 1508.15`, `sourceEndMs = 6317.93` (trimmed on both sides of a 387.6 s recording).
- **Constraints and edge cases:** A clip cannot be shortened below 100 ms ("New duration is too short" is logged and the update is ignored).
- **Stored as:** `scenes[].slices[].sourceStartMs`, `sourceEndMs` (project.json).
- **Confidence:** Build-confirmed (clamping, minimum); Guide for the bubble appearance.

### 81. Overall recording range trim
- **Where:** Project config `recordingRange`; no dedicated UI label found in the bundle.
- **Purpose:** Limits the usable portion of the source recording for the whole project.
- **Controls and options:** `config.recordingRange = [0, 387627.4193748832]` (start ms, end ms); default on project creation is `[0, recording.durationMs]`.
- **Behaviour:** The scene's `sourceDurationMs` is derived from the recording; clips are clamped to it (`removeTrim('end')` without a next clip restores to `scene.sourceDurationMs`).
- **Constraints and edge cases:** How the range is edited in the UI is Not documented for 3.7.3.
- **Stored as:** `config.recordingRange`.
- **Confidence:** Build-confirmed (key, default); UI Not documented.

### 82. Reset trim and undo trim
- **Where:** Click the yellow trim bubble (tooltip "Undo trim"); clip context menu "Reset trim" (command menu "Reset slice trim", group Slice, icon arrowshape.turn.up.left).
- **Purpose:** Restore trimmed footage.
- **Controls and options:** The bubble at the clip start calls `removeTrim('start')`, the one at the end `removeTrim('end')`; "Reset trim" removes both. "Reset trim" is applicable only when `hasTrim` (start > previous clip's end or > 0; end < next clip's start or < source duration).
- **Behaviour:** `removeTrim('start')` sets `sourceStartMs` to the previous clip's end (or 0); `removeTrim('end')` sets `sourceEndMs` to the next clip's start (or the source duration). Tracked as "Reset slice trim". Project-level undo (63) also reverts trims.
- **Constraints and edge cases:** When the trimmed amount at a bubble is 0 the bubble instead reads "Join clips" (87).
- **Stored as:** `scenes[].slices[].sourceStartMs/sourceEndMs`.
- **Confidence:** Build-confirmed.

### 83. Split clip at current time
- **Where:** Key c ("Cut slice at current time" in Settings > Shortcuts); scissors "Toggle split" tool (tooltip "Split clip", hold ⌥ for a temporary cut mode); context menu "Split at current time".
- **Purpose:** Cut a clip into two so parts can be removed, re-timed or given different settings.
- **Controls and options:** `splitSliceAtCurrentTime` (defaultShortcut c). Its label adapts to the target: "Split slice at current time", "Split zoom at current time", "Split layout at current time". In split mode a beam follows the mouse; clicking cuts at that time; the body gets class `split-tool-active` and the scissors cursor.
- **Behaviour:** Splits the clip under the playhead at the playhead's source time; the new right-hand clip inherits `timeScale`, volumes, `hideCursor` and `disableSmoothMouseMovement`. Tracked as "Split slice".
- **Constraints and edge cases:** Each resulting part must be ≥ 100 ms, otherwise toast "The part you want to cut is too short" (2 s) or, in beam mode, "Can't cut item shorter than 0.1s". Note the guide says "C" cuts; in this build the default is the lowercase key c and Crop has no shortcut.
- **Stored as:** `scenes[].slices[]` (new entry).
- **Confidence:** Build-confirmed.

### 84. Remove clip
- **Where:** Backspace with a clip selected; context menu "Remove" (command menu "Remove slice", group Slice, icon trash).
- **Purpose:** Delete a clip's footage from the output.
- **Controls and options:** `removeSlice`, default shortcut Backspace; applicable only when the scene has more than one clip.
- **Behaviour:** Removes the slice entry; neighbouring clips keep their ranges, so the removed footage becomes a gap (cut) that playback skips. Zooms, layouts and masks whose whole range is no longer present are removed with it (scene cleanup). Playhead position is preserved. Tracked as "Remove slice".
- **Constraints and edge cases:** The last remaining clip cannot be removed.
- **Stored as:** `scenes[].slices[]`.
- **Confidence:** Build-confirmed.

### 85. Remove clip before or till previous cut
- **Where:** Key x; command menu "Remove slice till previous cut" (Settings > Shortcuts calls it "Remove slice before previous cut").
- **Purpose:** One-key removal of the clip that ended at the last cut before the playhead.
- **Controls and options:** `rippleRemoveSlice`, default shortcut x (remappable, keys only).
- **Behaviour:** Finds the last clip whose `sourceEndMs` ≤ the playhead's source time and runs Remove slice on it; the playhead stays where it was. Tracked as "Remove slice till previous cut".
- **Constraints and edge cases:** Not applicable when no clip ends before the playhead (for example inside the first clip).
- **Stored as:** `scenes[].slices[]`.
- **Confidence:** Build-confirmed.

### 86. Remove all clips
- **Where:** Command menu "Remove all slices" (group Dev; visible only with developer mode).
- **Purpose:** Developer helper that clears the slice list.
- **Controls and options:** `devRemoveAllSlices`; no shortcut.
- **Behaviour:** Removes every slice entry; the scene then re-creates the default full-length clip on next access (`slices` getter pushes a default slice when empty: timeScale 1, 0 → recording duration, volumes 1).
- **Constraints and edge cases:** Not part of the normal UI; use "Reset trims and cuts for all slices" (99) instead.
- **Stored as:** `scenes[].slices[]`.
- **Confidence:** Build-confirmed (dev-only grouping).

### 87. Join clips
- **Where:** Bubble between two adjacent clips with tooltip "Join clips" (shown when the trimmed amount at that boundary is 0).
- **Purpose:** Undo a split that did not remove anything.
- **Controls and options:** Click the bubble.
- **Behaviour:** Calls `mergeWith('previous')` on the right-hand clip: the left clip's range is extended to the right clip's end and the right clip is deleted; settings of the surviving (left) clip win.
- **Constraints and edge cases:** If footage was removed between the clips the bubble reads "Undo trim" instead and restores the footage into the clip rather than merging.
- **Stored as:** `scenes[].slices[]`.
- **Confidence:** Build-confirmed.

### 88. Merge with previous or next
- **Where:** Clip context menu "Merge with previous" / "Merge with next" (command menu "Merge slice with previous/next", group Slice, icon arrow.trianglehead.merge).
- **Purpose:** Combine two clips into one, bringing back any cut footage between them.
- **Controls and options:** Applicable only when the clip has a previous / next clip.
- **Behaviour:** Merge with next sets this clip's `sourceEndMs` to the next clip's end and removes the next clip; merge with previous sets `sourceStartMs` to the previous clip's start and removes the previous clip. The current clip's speed, volumes and cursor flags apply to the merged range. Tracked as "Merge slice with next/previous".
- **Constraints and edge cases:** None beyond neighbour existence.
- **Stored as:** `scenes[].slices[]`.
- **Confidence:** Build-confirmed.

### 89. Per-clip playback speed
- **Where:** Clip context menu "Set speed" (key s); sidebar clip editor "Speed" selector; command menu "Set slice speed".
- **Purpose:** Speed up or slow down one part of the recording.
- **Controls and options:** Options (labels "Nx"): 0.5x, 0.75x (group slow), 1x, 1.2x, 1.4x, 1.6x, 1.8x, 2x (regular), 3x, 4x, 8x, 16x, 24x (fast). Stored as `timeScale = 1 / speed`; current clip `timeScale = 1`.
- **Behaviour:** The clip bar badge shows the speed with a gauge icon; the playback clock scales accordingly and the waveform is compressed. Tracked (throttled) as "Set slice speed". The guide's "Slow/Medium/Fast" labels correspond to these groups.
- **Constraints and edge cases:** "Speed must be a positive number." validation string exists. Audio above 2× is muted (91).
- **Stored as:** `scenes[].slices[].timeScale`.
- **Confidence:** Build-confirmed (list, mapping); Guide for the menu path.

### 90. Apply speed to all clips
- **Where:** Clip context menu / command menu "Apply speed to all slices" (visible group All).
- **Purpose:** Propagate one clip's speed to every clip.
- **Controls and options:** Applicable only when at least one other clip has a different `timeScale`.
- **Behaviour:** Copies the target clip's `timeScale` to all slices in the first scene; tracked as "Apply speed to all slices".
- **Constraints and edge cases:** None.
- **Stored as:** `scenes[].slices[].timeScale`.
- **Confidence:** Build-confirmed.

### 91. Audio muted above 2x
- **Where:** Automatic; warning in Cursor panel > "Click sound": "Sound will not be played for parts with a playback speed greater than 2x."
- **Purpose:** Avoids unintelligible chipmunk audio on fast segments.
- **Controls and options:** None; threshold fixed at 2×.
- **Behaviour:** For clips whose speed exceeds 2× the microphone, system, external-device and click-sound audio are not played in preview or export (Guide: "audio not played above 2x"). The warning appears when any clip exceeds 2× (Inferred from the conditional render).
- **Constraints and edge cases:** 2x itself still plays audio ("greater than 2x").
- **Stored as:** Derived from `timeScale`; nothing stored.
- **Confidence:** Build-confirmed (warning string); muting scope Guide.

### 92. Typing detection with speed-up suggestions
- **Where:** Keyboard-icon markers on the clip track (tooltip "Speed up typing"); clicking opens the "Speed up typing" popover.
- **Purpose:** Suggests fast-forwarding stretches of typing.
- **Controls and options:** Popover description "You are typing during this part of the recording. Speed it up using options below."; speed slider min 1.5, max 8, preview "N.0×", reset 3 (preferred speed persisted as `recording-typing-suggestion-preferred-speed`, default 3); buttons "Apply all suggestions" (⌘Enter), "Apply suggestion" (Enter), "Remove suggestion".
- **Behaviour:** Detection groups recorded keystrokes with gaps under 500 ms; a group qualifies when it lasts ≥ 1500 ms and averages ≥ 2 keystrokes per second. Already resolved groups are hidden. Applying splits the clip at the group's start and end and sets the middle clip's `timeScale = 1 / speed`; the group's start time is added to `resolvedTypingSpeedIncreaseSuggestions`. "Remove suggestion" resolves it without changing speed.
- **Constraints and edge cases:** Needs recorded keystrokes; splits obey the 100 ms minimum and are skipped if impossible.
- **Stored as:** `scenes[].resolvedTypingSpeedIncreaseSuggestions` (currently `[]`); app state key `recording-typing-suggestion-preferred-speed`.
- **Confidence:** Build-confirmed.

### 93. Per-clip microphone volume
- **Where:** Clip context menu "Set volume" (key v); sidebar clip editor "Microphone volume" slider; command menu "Set slice volume".
- **Purpose:** Adjust or mute the voice track for one clip.
- **Controls and options:** Menu options 100% (medium group), 0% (muted group), 10%…90%; slider 0–1, step 0.01, shown as "%". Current `volume = 1`.
- **Behaviour:** Multiplies the microphone gain for that clip, on top of the project "Mute microphone"/master `audioVolume`. Shown only when `recording.hasMicrophone`.
- **Constraints and edge cases:** The slider snaps near 0.1 steps (`_0x4aee3b(value, 0.1)`); not shown when there is no audio.
- **Stored as:** `scenes[].slices[].volume`.
- **Confidence:** Build-confirmed.

### 94. Per-clip system audio volume
- **Where:** Context menu "Set system audio volume" (⌃v); sidebar "System audio volume" slider; command menu "Set slice system audio volume".
- **Purpose:** Adjust captured app/system audio for one clip.
- **Controls and options:** Same option list and slider as 93. Current `systemAudioVolume = 1`.
- **Behaviour:** Applies only when `recording.hasSystemAudio`; combined with the project "Mute system audio".
- **Constraints and edge cases:** Hidden for recordings without system audio.
- **Stored as:** `scenes[].slices[].systemAudioVolume`.
- **Confidence:** Build-confirmed.

### 95. Per-clip external device volume
- **Where:** Context menu "Set external device audio volume"; sidebar "External device audio volume" slider; command menu "Set slice external device audio volume".
- **Purpose:** Adjust the iPhone/iPad audio for one clip.
- **Controls and options:** Same option list and slider as 93; no default shortcut. Current `externalDeviceAudioVolume = 1`.
- **Behaviour:** Applies only when `recording.hasExternalDeviceAudio`; combined with "Mute external device audio".
- **Constraints and edge cases:** Hidden unless an external device was recorded.
- **Stored as:** `scenes[].slices[].externalDeviceAudioVolume`.
- **Confidence:** Build-confirmed.

### 96. Hide cursor for one clip
- **Where:** Clip context menu "Hide mouse cursor" (command menu "Hide mouse cursor for slice", visible group mouse); sidebar clip editor toggle.
- **Purpose:** Hide the cursor during a section (menus, sensitive pointer movement) without hiding it project-wide.
- **Controls and options:** Toggle; current `hideCursor = False`. The clip shows a "Hide" badge with tooltip "Hide mouse cursor during this part of the recording".
- **Behaviour:** Toggles `hideCursor` on every targeted clip; tracked as "Hide mouse cursor for slice". Cursor animations resume at the next clip.
- **Constraints and edge cases:** Only shown when the recording has a cursor (`recording.hasCursor`); project-wide `config.hideCursor` overrides.
- **Stored as:** `scenes[].slices[].hideCursor`.
- **Confidence:** Build-confirmed.

### 97. Disable smooth cursor for one clip
- **Where:** Clip context menu "Disable smooth mouse movement" (command menu "Disable smooth mouse movement for slice"); sidebar clip editor toggle.
- **Purpose:** Use the raw recorded cursor path for sections such as drop-down menus where smoothing misplaces the pointer.
- **Controls and options:** Toggle; current `disableSmoothMouseMovement = False`; badge tooltip "Disable smooth mouse movement during this part of the recording" (icon cursorarrow.motionlines, shown only when the cursor is not hidden).
- **Behaviour:** Switches off the spring-based cursor interpolation for that clip only; tracked as "Disable smooth mouse movement for slice".
- **Constraints and edge cases:** Project-wide `config.disableMouseMovementSpring` is the global equivalent.
- **Stored as:** `scenes[].slices[].disableSmoothMouseMovement`.
- **Confidence:** Build-confirmed; Guide for the drop-down use case.

### 98. Copy and paste clip settings
- **Where:** ⌘C with a clip selected ("Copy slice settings"); ⌘V ("Paste from clipboard") with the playhead over another clip.
- **Purpose:** Replicate speed and volume settings between clips.
- **Controls and options:** Toasts "Slice settings copied" and "Slice settings pasted". ⌘X on a clip shows "Slice cannot be cut".
- **Behaviour:** Copy stores an in-app paste handler; paste finds the clip at the playhead's source time (must differ from the source clip) and updates its `timeScale`, `volume` and the remaining per-clip fields. Paste is applicable only while something is on the internal clipboard.
- **Constraints and edge cases:** The internal clipboard is app-only (not the system clipboard); pasting onto the same clip does nothing.
- **Stored as:** `scenes[].slices[]` fields of the target clip.
- **Confidence:** Build-confirmed (shortcuts, strings, timeScale/volume); full pasted field list Inferred.

### 99. Reset all cuts and trims
- **Where:** Context/command menu "Reset trims and cuts for all slices" (group Slice, visible group Reset).
- **Purpose:** Return the timeline to a single full-length clip.
- **Controls and options:** Confirmation dialog title "Reset trims and cuts for all slices", message "Are you sure you want to reset trims and cuts for all slices", confirm label "Reset all cuts and trims for all slices".
- **Behaviour:** Calls `resetSlices()`, replacing all slices with one default slice (timeScale 1, 0 → recording duration, volumes 1, cursor flags off). Applicable when any clip has a trim or there is more than one clip. Undoable via ⌘Z.
- **Constraints and edge cases:** Per-clip speeds and volumes are lost.
- **Stored as:** `scenes[].slices[]`.
- **Confidence:** Build-confirmed.

### 100. Crop with aspect-ratio presets
- **Where:** "Crop" button above the preview (command menu "Crop", group Editor) → separate "Crop" window (bounds persisted as "crop-window").
- **Purpose:** Cut the recorded area down to a region, optionally locked to an aspect ratio.
- **Controls and options:** Toolbar with X/Y/Width/Height inputs, aspect picker (tooltip "Set crop aspect ratio") offering "Any", 16:9, 4:3, 1:1, 3:4, 9:16 and "Custom aspect ratio" (two numeric inputs, min 1); reset control; buttons "Confirm changes" (Enter) and "Discard changes"; Escape closes. Current `recordingCrop = {x 0, y 0, width 1, height 1}` (full).
- **Behaviour:** Opening pauses playback and shows the frame at the current time. Drag the selection or its handles; double-clicking the canvas resets to the full recording; width/height typed values are clamped to the recording size. Confirm converts the pixel crop to scalar (0–1) `recordingCrop`, tracked as "Crop applied".
- **Constraints and edge cases:** Warning "Minimal size is 200x200" with Confirm disabled when smaller. Crop aspect does not change the project aspect ratio (Guide). Not available when `capabilities.changeCrop` is false.
- **Stored as:** `config.recordingCrop` (x, y, width, height as fractions).
- **Confidence:** Build-confirmed.

### 101. Keyboard-nudged crop handles
- **Where:** Inside the Crop window: focus the selection or a corner handle and use the arrow keys.
- **Purpose:** Pixel-precise adjustment.
- **Controls and options:** Arrow keys move by 1 px; Shift+arrow 10 px; ⌘+arrow 100 px. Accessibility labels: "Use the arrow keys to move the crop selection area", "Use the arrow keys to move the north east drag handle to change the crop selection area" (and north west / south east / south west), "Use the up and down arrow keys to move the north drag handle…" (and south / east / west).
- **Behaviour:** Moving the selection clamps it inside the recording; moving a handle resizes while honouring the locked aspect ratio.
- **Constraints and edge cases:** Minimum size 200×200 still applies.
- **Stored as:** Runtime until "Confirm changes" writes `config.recordingCrop`.
- **Confidence:** Build-confirmed.

### 102. Automatic zooms from click groups
- **Where:** Generated when a project is created from a recording (and by "Restore default zoom ranges"); shown as purple blocks on the Zooms track.
- **Purpose:** Zooms in on where the user clicked, with no manual work.
- **Controls and options:** Each zoom is created with type `follow-click-groups`, `zoom` = `defaultZoomLevel` preference (1.135; fallback 2 when unset), `snapToEdgesRatio 0.25`, `manualTargetPoint {0.5, 0.5}`, `glideDirection null`, `glideSpeed 0.5`, `isSystem true`, `hasInstantAnimation false`.
- **Behaviour:** Every recorded mouse click becomes a range from click−300 ms to click+2500 ms (clamped to the recording). Overlapping ranges and ranges less than 2500 ms apart are merged into one zoom, repeatedly until stable. Clicks in the last 1000 ms of the recording are ignored. The current project has one zoom (959 → 5426 ms, `isSystem False` because it was edited).
- **Constraints and edge cases:** No automatic zooms for external-device (iPhone/iPad) recordings (`mode === 'externalDevice'` returns none) nor for projects created from video. An auto zoom placed where no click occurs does not zoom anywhere (Guide).
- **Stored as:** `scenes[].zoomRanges[]`.
- **Confidence:** Build-confirmed.

### 103. Global toggle to disable automatic zooms
- **Where:** Settings > Recording, toggle "Create zooms automatically" (also labelled "Automatically create zooms").
- **Purpose:** Start new projects without any zooms.
- **Controls and options:** Preference `createAutomaticZooms = True`.
- **Behaviour:** Read at project creation: when false the scene starts with an empty `zoomRanges` list. Tracked as "Create zooms automatically changed". Existing projects are unaffected; "Restore default zoom ranges" (118) still regenerates from clicks.
- **Constraints and edge cases:** Projects created from an existing video ignore it (no clicks).
- **Stored as:** App preference `createAutomaticZooms`.
- **Confidence:** Build-confirmed; Guide for the settings path.

### 104. Manual zooms by click or drag
- **Where:** Click or drag on an empty part of the Zooms track (hint "Click or drag to add zoom on cursor"); "+" button → "Zoom:" "Automatic zoom" / "Manual zoom"; command menu "Add zoom" / "Add manual zoom".
- **Purpose:** Add zooms where the automatic ones missed.
- **Controls and options:** Click adds a zoom of the default length 3000 ms at the playhead (track click: at the clicked time; drag: the dragged range). "Add zoom" creates an Auto-type zoom, "Add manual zoom" a Manual one.
- **Behaviour:** `addZoomRangeAt` looks for free space at that time (`getFreeZoomRangeAt`) and inserts the zoom with default settings (102); tracked as "Add zoom" with type auto/manual. The new zoom opens in the sidebar.
- **Constraints and edge cases:** If there is no free space: toast "Could not insert zoom at currently selected time". Minimum zoom length 1000 ms.
- **Stored as:** `scenes[].zoomRanges[]`.
- **Confidence:** Build-confirmed.

### 105. Zoom type Auto
- **Where:** Zoom editor "Zoom mode" selector, option "Auto" (icon wand.and.sparkles); context menu "Set type to Auto" (key A).
- **Purpose:** Let the app decide where to look.
- **Controls and options:** Description "Zoomed camera will automatically try to keep the mouse cursor visible." Selecting Auto writes `type: 'follow-mouse'`.
- **Behaviour:** Auto zooms follow the cursor; the "Advanced" section (Snap to edges, 112) is shown only for auto zooms (`isAuto`). Track item badge reads "Auto".
- **Constraints and edge cases:** The "Zoom mode" selector is shown only when `capabilities.useAutomaticZooms` is true (recordings with cursor data). System-generated zooms keep type `follow-click-groups` until changed; the UI treats both non-manual types as Auto.
- **Stored as:** `scenes[].zoomRanges[].type`.
- **Confidence:** Build-confirmed.

### 106. Zoom type follow mouse
- **Where:** Internal type `follow-mouse` — what the "Auto" option and the A shortcut set.
- **Purpose:** Keep the cursor inside the zoomed viewport continuously.
- **Controls and options:** No separate UI; distinguished from `follow-click-groups` (102), which centres on click positions.
- **Behaviour:** The viewport target tracks the cursor position, moved by the screen-movement spring (123) and limited by Snap to edges (112).
- **Constraints and edge cases:** Requires cursor data; Not documented how it differs visually from click-group zooms.
- **Stored as:** `scenes[].zoomRanges[].type = 'follow-mouse'`.
- **Confidence:** Build-confirmed (type values, mapping); rendering difference Inferred.

### 107. Zoom type manual with target point
- **Where:** Zoom editor "Zoom mode" → "Manual" (icon scope); context menu "Set type to Manual" (key M); "Add manual zoom".
- **Purpose:** Zoom on a fixed spot regardless of the cursor.
- **Controls and options:** Description "You can manually pick part of the video that will be zoomed in". A point picker shows the frame at the zoom's midpoint (with the project crop applied) and a draggable purple dot; `manualTargetPoint` defaults to `{x 0.5, y 0.5}` (fractions of the frame).
- **Behaviour:** Dragging the dot updates `manualTargetPoint`; the viewport centres on it at the zoom level. Track badge reads "Manual".
- **Constraints and edge cases:** Snap to edges (Advanced) is hidden for manual zooms.
- **Stored as:** `scenes[].zoomRanges[].type = 'manual'`, `manualTargetPoint`.
- **Confidence:** Build-confirmed.

### 108. Per-zoom level
- **Where:** Zoom editor "Zoom level" slider; context menu "Change zoom level" submenu; number keys.
- **Purpose:** How far to zoom in for this range.
- **Controls and options:** Slider min 1, max 4, preview "N%" (zoom×100), reset value = `defaultZoomLevel` preference (1.135). Submenu presets with shortcuts: 1 → 1.0, 2 → 1.2, 3 → 1.4, 4 → 1.6, 5 → 1.8, 6 → 2.0, 7 → 2.2, 8 → 2.4, 9 → 2.6, 0 → default level. Current zoom `zoom = 1.135`; track badge "1.14×".
- **Behaviour:** The slider updates the zoom immediately and (debounced) also writes `defaultZoomLevel`; the submenu actions update the zoom and the preference too. Tracked as "Change zoom level".
- **Constraints and edge cases:** A level of exactly 1 marks the item as disabled-looking on the track (`zoom === 1`).
- **Stored as:** `scenes[].zoomRanges[].zoom`; preference `defaultZoomLevel`.
- **Confidence:** Build-confirmed.

### 109. Default zoom level preference
- **Where:** App preference `defaultZoomLevel`; set implicitly whenever a zoom level is chosen (108) — no explicit settings control found.
- **Purpose:** Level used for newly generated zooms and as the slider reset value.
- **Controls and options:** Current value 1.135; when null the built-in `ZOOM_LEVEL = 2` is used.
- **Behaviour:** Read at project creation for automatic zooms and by "Add zoom"; the "0" key sets a zoom back to it.
- **Constraints and edge cases:** None.
- **Stored as:** App preference `defaultZoomLevel`.
- **Confidence:** Build-confirmed.

### 110. Apply zoom level to all
- **Where:** Zoom editor button / context menu "Apply zoom level to all other zooms" (supplementary label "Set the zoom level for all zooms to this value").
- **Purpose:** Uniform zoom strength across the project.
- **Controls and options:** Requires a single selected zoom.
- **Behaviour:** Copies the selected zoom's `zoom` to every zoom in the scene; toast "Zoom level applied to all zooms".
- **Constraints and edge cases:** Does not touch types, target points or disabled state.
- **Stored as:** `scenes[].zoomRanges[].zoom`.
- **Confidence:** Build-confirmed.

### 111. Increase/decrease zoom level
- **Where:** Keys = and - with a zoom selected; command menu "Increase zoom level" / "Decrease zoom level".
- **Purpose:** Fine adjustment from the keyboard.
- **Controls and options:** Step 0.2, clamped to 1…4; increase also rounds to the step grid.
- **Behaviour:** Updates `zoom` on the selected zoom only (does not change the default preference).
- **Constraints and edge cases:** Without a selected zoom, ⌘= / ⌘- zoom the timeline instead (58).
- **Stored as:** `scenes[].zoomRanges[].zoom`.
- **Confidence:** Build-confirmed.

### 112. Snap to edges
- **Where:** Zoom editor → "Advanced" (collapsible) → "Snap to edges" slider; auto zooms only.
- **Purpose:** Avoid showing background when the zoom centre is near the frame edge.
- **Controls and options:** Slider 0–0.45, reset 0.25, preview "N% of visible area"; description "If zoom center is close to edge of recording - it will snap to it, showing a bit of background on the side". Current `snapToEdgesRatio = 0.25`.
- **Behaviour:** When the target centre is within that fraction of the visible area from an edge, the viewport snaps to the edge; tracked (throttled) as "Snap to edges changed".
- **Constraints and edge cases:** Hidden for manual zooms.
- **Stored as:** `scenes[].zoomRanges[].snapToEdgesRatio`.
- **Confidence:** Build-confirmed.

### 113. Glide direction and speed
- **Where:** Project data only: `glideDirection` (current `None`) and `glideSpeed` (0.5) on every zoom range.
- **Purpose:** Intended slow pan of the zoomed viewport in a direction.
- **Controls and options:** Defaults `glideDirection: null`, `glideSpeed: 0.5`; the zoom model exposes both as getters. No slider or menu for them was found in the 3.7.3 bundle strings.
- **Behaviour:** Not documented.
- **Constraints and edge cases:** Treat as reserved/unexposed in this build.
- **Stored as:** `scenes[].zoomRanges[].glideDirection`, `glideSpeed`.
- **Confidence:** Build-confirmed (keys, defaults); UI and behaviour Not documented.

### 114. Always keep zoomed in
- **Where:** Output aspect-ratio picker above the preview → toggle "Always keep zoomed in" (shown when the chosen ratio is vertical, e.g. 9:16 or 3:4).
- **Purpose:** Keep the whole output cropped to the ratio and follow the cursor instead of letterboxing.
- **Controls and options:** Toggle; current `config.alwaysKeepZoomedIn = False`.
- **Behaviour:** Crops the visible area to the ratio and follows the cursor for the whole video (Guide); zoom ranges still apply on top.
- **Constraints and edge cases:** Toggle disabled/hidden for horizontal ratios.
- **Stored as:** `config.alwaysKeepZoomedIn`.
- **Confidence:** Build-confirmed (placement, key); effect Guide.

### 115. Instant animation
- **Where:** Zoom editor toggle "Instant animation".
- **Purpose:** Hard cut into/out of the zoom instead of the spring animation.
- **Controls and options:** Description "If enabled, the zoom will be applied instantly without any animation."; current `hasInstantAnimation = False`.
- **Behaviour:** Skips the screen-movement spring for that zoom's start and end; tracked as "Instant animation changed".
- **Constraints and edge cases:** Motion blur for screen zooming does not apply to instant zooms (Inferred).
- **Stored as:** `scenes[].zoomRanges[].hasInstantAnimation`.
- **Confidence:** Build-confirmed; blur note Inferred.

### 116. Enable/disable one zoom
- **Where:** Zoom editor toggle "Disable zoom"; context menu "Disable" (key D; command menu "Toggle zoom disabled").
- **Purpose:** Keep a zoom on the timeline but skip it.
- **Controls and options:** Toggle; current `isDisabled = False`. Disabled zooms are drawn dimmed on the track.
- **Behaviour:** Toggles `isDisabled` on every selected zoom; tracked as "Toggle zoom disabled".
- **Constraints and edge cases:** None.
- **Stored as:** `scenes[].zoomRanges[].isDisabled`.
- **Confidence:** Build-confirmed.

### 117. Enable/disable all zooms
- **Where:** Command menu / track context menu "Disable all zoom ranges" and "Enable all zoom ranges" (group Zoom).
- **Purpose:** Quickly preview or export without any zooms, then bring them back.
- **Controls and options:** "Disable all" applicable when at least one zoom is enabled; "Enable all" when at least one is disabled.
- **Behaviour:** Sets `isDisabled` on every zoom in the first scene; tracked accordingly.
- **Constraints and edge cases:** Does not delete anything.
- **Stored as:** `scenes[].zoomRanges[].isDisabled`.
- **Confidence:** Build-confirmed.

### 118. Restore default zoom ranges
- **Where:** Command menu / track context menu "Restore default zoom ranges" (group Zoom, icon arrow.clockwise).
- **Purpose:** Discard manual zoom edits and regenerate from clicks.
- **Controls and options:** No confirmation dialog.
- **Behaviour:** Replaces the whole `zoomRanges` list with freshly generated click-group zooms (102) using the current default zoom level; tracked as "Restore default zoom ranges". Undoable with ⌘Z.
- **Constraints and edge cases:** Yields an empty list for external-device recordings or projects from video.
- **Stored as:** `scenes[].zoomRanges[]`.
- **Confidence:** Build-confirmed.

### 119. Duplicate zoom
- **Where:** ⌘D with a zoom selected; context menu "Duplicate" (command menu "Duplicate zoom").
- **Purpose:** Repeat a configured zoom immediately after itself.
- **Controls and options:** Requires a single selected zoom.
- **Behaviour:** Creates a copy with a new id starting at the original's end, with the same duration but capped at the next zoom's start (or the recording end); copies level, type, target point and flags. Tracked as "Duplicate zoom".
- **Constraints and edge cases:** Silently does nothing if less than 1000 ms is free after the original.
- **Stored as:** `scenes[].zoomRanges[]`.
- **Confidence:** Build-confirmed.

### 120. Copy and paste zoom range settings
- **Where:** ⌘C on a zoom ("Copy zoom range"); ⌘V on another zoom or on the timeline ("Paste from clipboard").
- **Purpose:** Transfer settings between zooms or stamp a copy at the playhead.
- **Controls and options:** Toasts "Zoom range copied", "Zoom range settings pasted".
- **Behaviour:** Pasting onto a zoom copies `type`, `zoom`, `isDisabled`, `manualTargetPoint` and `snapToEdgesRatio`. Pasting with no zoom targeted adds a new zoom at the playhead with the copied data (subject to free space, 104). ⌘X on a zoom copies it and removes the original.
- **Constraints and edge cases:** Internal clipboard only.
- **Stored as:** `scenes[].zoomRanges[]`.
- **Confidence:** Build-confirmed.

### 121. Split zoom at current time
- **Where:** Key c with a zoom selected; context menu "Split zoom at current time".
- **Purpose:** Divide a zoom so each half can have its own level or type.
- **Controls and options:** Same action as the clip split (83) with a zoom target.
- **Behaviour:** Ends the zoom at the playhead and adds a new zoom from the playhead to the original end with identical settings.
- **Constraints and edge cases:** Playhead must be inside the zoom and each part ≥ 100 ms, else "The part you want to cut is too short".
- **Stored as:** `scenes[].zoomRanges[]`.
- **Confidence:** Build-confirmed.

### 122. Remove one or all zooms
- **Where:** Backspace with a zoom selected / context menu "Remove" (command menu "Remove zoom"); command menu "Remove all zoom ranges" (group Zoom).
- **Purpose:** Delete zooms.
- **Controls and options:** No confirmation for either.
- **Behaviour:** Remove zoom deletes each selected zoom, closes its sidebar editor and clears the selection; Remove all closes any zoom editor and deletes every zoom. Both undoable with ⌘Z.
- **Constraints and edge cases:** None.
- **Stored as:** `scenes[].zoomRanges[]`.
- **Confidence:** Build-confirmed.

### 123. Screen movement physics
- **Where:** Animations panel (⌘7) → "Screen animation style"; advanced spring editor ("Customize") with stiffness/damping/mass.
- **Purpose:** Controls how the zoomed viewport accelerates and settles.
- **Controls and options:** Presets "Focused" ("Animation stabilizes quickly making it easier to follow and read the content") and "Smooth" ("Animation is more fluid. Great for more creative content not focused on reading"); current `config.screenMovementSpring = {stiffness 200, damping 40, mass 2.25}`. Tooltips: "How hard is it to change my current speed? (Wiggle and keeping momentum)", "How much do I want to quickly get to the new position? (Acceleration speed)", "How much resistance do I feel when I move quickly? (Slowing down speed)"; note "Screen Studio uses Newtonian laws of motion to calculate animations."
- **Behaviour:** The viewport position and scale follow a spring towards the zoom target; motion blur for "Screen moving"/"Screen zooming in" is applied while it moves (`motionBlurScreenMoveAmount`, `motionBlurScreenZoomAmount`, both 1).
- **Constraints and edge cases:** Instant zooms (115) bypass the spring.
- **Stored as:** `config.screenMovementSpring`, `config.motionBlurScreenMoveAmount`, `config.motionBlurScreenZoomAmount`.
- **Confidence:** Build-confirmed (values, strings); mapping of presets to exact numbers Not documented.

### 124. Zoomed view keeps cursor visible
- **Where:** Automatic behaviour of Auto zooms; described in the Zoom mode option text.
- **Purpose:** Prevent the cursor from leaving the zoomed frame.
- **Controls and options:** None beyond zoom type (105/106) and Snap to edges (112). Text: "Zoomed camera will automatically try to keep the mouse cursor visible."
- **Behaviour:** The viewport target follows the cursor through the screen-movement spring; near the edges Snap to edges clamps the view so it never shows outside the recording.
- **Constraints and edge cases:** Manual zooms do not follow the cursor; cursor hidden per clip (96) still influences the target (Not documented).
- **Stored as:** Derived; nothing extra stored.
- **Confidence:** Build-confirmed (string); mechanism Inferred.


## Part 3 — Cursor, Camera, Background and Screen, Masks, Shortcut overlay

Sources for this part: `project.json` of the open project (values quoted as "current"), the app bundle (slider ranges, defaults and labels read from the editor code; marked Build-confirmed), the UI string table (`ui-strings.txt`), the asset list (`assets.txt`) and the official guide (marked Guide). Where a field could not be established from any of these it says "Not documented".

### 125. Cursor style sets (macOS, macOS Tahoe, touch, Halloween, 20 custom)
- **Where:** Editor sidebar → **Cursor** panel → "Cursor style" picker (string: "Change appearance of mouse cursor in …").
- **Purpose:** Replace the recorded system cursor with one of the bundled vector cursor sets so the pointer in the final video looks consistent and sharp at any zoom.
- **Controls and options:** Picker of cursor sets with ids `macos`, `macos-tahoe`, `touch`, `halloween`, `custom-1` … `custom-20` (24 sets). Bundled files per set (assets.txt): `macos` 42 SVG cursor types (pointer, pointinghand, ibeam, resize*, crosshair, openhand/closedhand, beachball, zoomin/zoomout, screenshot*, …), `macos-tahoe` the same 42 types in the Tahoe style, `touch` 1 (a single round touch pointer), `halloween` 8 pointer variants, `custom-1…20` 1–14 SVGs each (pointer variants plus a `pointinghand` for most; `custom-8` also has `closedhand`). Current: `macos-tahoe` (bundle default is the same key). Display labels for the sets are not in the string table ("Not documented").
- **Behaviour:** Each recorded cursor type (from `cursors.json` in the raw recording) is mapped to the matching SVG of the chosen set; types missing from a set fall back to its pointer. The set is applied to the whole project, drawn at the size of 126 and animated by 128–133. The `touch` set draws a single round pointer regardless of cursor type (Inferred from the set having one file). Changing the set logs "Cursor style changed".
- **Constraints and edge cases:** If the recording has no cursor data the panel shows "There is no mouse cursor recorded" and cursor controls do nothing. Per-clip "Hide mouse cursor" (clip settings) shows "Cursor is hidden in this part of the recording, so you will not see changes you make to it." Variants per set are stored but currently empty (`cursorSet.variants = {}`).
- **Stored as:** `config.cursorSet.id` (and `config.cursorSet.variants`) in project.json.
- **Confidence:** Build-confirmed (ids, files, default); labels and the fallback rule Inferred.

### 126. Cursor size
- **Where:** Cursor panel → "Cursor size" slider.
- **Purpose:** Scale the rendered cursor so it stays readable in the exported video, especially when zoomed out or on high-resolution recordings.
- **Controls and options:** Slider, min 0.5, max 4, shown as a multiplier with the suffix "×" (e.g. "1.5×"); reset button returns to the bundle default 1.5. Current: `cursorSize = 1.5`.
- **Behaviour:** The chosen cursor set (125) is drawn at the recorded hotspot position scaled by this factor; motion blur (145) and click effects (141) scale with it. The slider is only visible while "Hide cursor" (127) is off. Analytics event "Cursor size changed".
- **Constraints and edge cases:** When the value is below 0.75 the panel shows the note "With small cursor size, consider disabling mouse cursor motion blur as it might reduce cursor visibility". The app reads the macOS pointer size at import; on failure it logs "Failed to detect system settings for cursor size" and uses the default.
- **Stored as:** `config.cursorSize` in project.json.
- **Confidence:** Build-confirmed (range, default, note, visibility rule); system-size detection Build-confirmed string, behaviour Inferred.

### 127. Hide cursor entirely
- **Where:** Cursor panel → "Hide cursor" toggle (top of the panel). Per clip: right-click a clip → "Hide mouse cursor" / command "Hide mouse cursor for slice" ("Hide mouse cursor during this part of the recording").
- **Purpose:** Remove the pointer from the whole video (or from one clip) when it distracts from the content.
- **Controls and options:** Project toggle `hideCursor` on/off, current off. Clip-level flag `slices[].hideCursor`, current false on the only clip.
- **Behaviour:** With the project toggle on, the cursor, click effects, click sounds and cursor motion blur are not rendered and every other cursor control in the panel is hidden (the panel body is only rendered when `hideCursor` is false). With a clip-level hide, only that clip is affected; an arrow icon marks the clip on the timeline (Guide) and the panel warns "Cursor is hidden in this part of the recording, so you will not see changes you make to it." when the playhead is inside it.
- **Constraints and edge cases:** Automatic zooms still follow the recorded clicks even when the cursor is hidden (zooms are driven by click data, not by the drawn cursor — Inferred). Hiding does not delete cursor data; turning it off restores everything.
- **Stored as:** `config.hideCursor`; per clip `scenes[].slices[].hideCursor`.
- **Confidence:** Build-confirmed (keys, strings, panel visibility); clip icon Guide; zoom interaction Inferred.

### 128. Smooth cursor movement on/off
- **Where:** Project level: **Animation** panel → "Cursor animation style" with the option "None"; per clip: clip settings → "Disable smooth mouse movement" ("Disable smooth mouse movement during this part of the recording"), command "Disable smooth mouse movement for slice".
- **Purpose:** The editor replays the pointer through a spring simulation so movement looks fluid; this switch returns to the raw recorded path where exact alignment matters.
- **Controls and options:** Project flag `disableMouseMovementSpring` (current false = smoothing on). Clip flag `slices[].disableSmoothMouseMovement` (current false). "Cursor animation style" presets: Smooth, Medium, Rapid, None (None carries no spring config).
- **Behaviour:** When smoothing is on, the cursor position is driven by the spring in 129 toward the recorded position. When off (project or clip), the recorded coordinates are used frame by frame, so the drawn cursor sits exactly where the real one was. The help text explains the use case: "This is useful, for example, when recording drop-down menus, where precise alignment is required."
- **Constraints and edge cases:** Turning smoothing off also removes the overshoot that cursor rotation (132) relies on, so rotation has no visible effect (Inferred). The clip flag only applies inside that clip's time range.
- **Stored as:** `config.disableMouseMovementSpring`; `scenes[].slices[].disableSmoothMouseMovement`.
- **Confidence:** Build-confirmed (keys, strings, preset list); Guide for the per-clip workflow; rotation interaction Inferred.

### 129. Movement physics stiffness/damping/mass
- **Where:** Animation panel → "Cursor animation style" → "Customize" (advanced spring editor with a live demo, "SpringConfigDemo").
- **Purpose:** Fine-tune how the smoothed cursor accelerates, settles and overshoots. Note shown: "Screen Studio uses Newtonian laws of motion to calculate animations."
- **Controls and options:** Three sliders: "Rigidity" (= stiffness) min 5, max 600, step 1, tooltip "How much do I want to quickly get to the new position? (Acceleration speed)"; "Smoothness" (= damping) min 5, max 200, step 1, tooltip "How much resistance do I feel when I move quickly? (Slowing down speed)"; "Momentum" (= mass) min 0.1, max 15, step 0.1, tooltip "How hard is it to change my current speed? (Wiggle and keeping momentum)". "Reset" restores the preset. Current: stiffness 470, damping 70, mass 3 (bundle default).
- **Behaviour:** Every cursor sample is fed to a damped spring with these constants; the demo dot in the panel animates with the same values so the effect can be judged before playback. Choosing a preset (130) overwrites all three.
- **Constraints and edge cases:** Validation errors "Stiffness value must be greater than 0" and "Mass value must be greater or equal 0" exist for out-of-range values; "Spring is not settling" / "Spring emulation is too long, finishing simulation" are logged if a configuration never comes to rest. Has no effect when smoothing is disabled (128).
- **Stored as:** `config.mouseMovementSpring.{stiffness,damping,mass}`.
- **Confidence:** Build-confirmed.

### 130. Movement presets Slow/Medium/Fast
- **Where:** Animation panel → "Cursor animation style" segmented picker.
- **Purpose:** One-click choice of cursor feel without touching the physics sliders.
- **Controls and options:** Four presets in the build: **Smooth** (stiffness 470, damping 70, mass 3 — the project default), **Medium** (340 / 60 / 3), **Rapid** (530 / 40 / 1) and **None** (no spring, see 128). The names "Slow/Medium/Fast" from the inventory are not present as cursor presets in the build's string table; the build labels are Smooth / Medium / Rapid / None (the guide uses the same four).
- **Behaviour:** Selecting a preset writes its three constants into `mouseMovementSpring` (and None sets the spring off); the picker shows which preset matches the current values, and "Customize" opens the sliders of 129. Analytics "Cursor animations changed".
- **Constraints and edge cases:** After manual edits the values may match no preset; the picker then shows none selected and "Reset" returns to the preset values. A second picker in the same panel, "Screen animation style", offers **Focused** (200 / 40 / 2.25, "Animation stabilizes quickly making it easier to follow and read the content") and **Smooth** (170 / 50 / 3, "Animation is more fluid. Great for more creative content not focused on reading") for `screenMovementSpring` (zoom/pan), current Focused.
- **Stored as:** `config.mouseMovementSpring`; screen style in `config.screenMovementSpring`.
- **Confidence:** Build-confirmed (constants, labels, descriptions); mapping of the inventory's Slow/Fast names is Not documented.

### 131. Click animation physics
- **Where:** Not exposed as a slider in the Cursor or Animation panel strings; stored in the project and editable through presets/project file only (no "click spring" UI string exists).
- **Purpose:** Controls the spring that animates the cursor's press/release squash when a click is replayed (and the click effect of 141).
- **Controls and options:** `mouseClickSpring` with stiffness 700, damping 30, mass 1 (bundle default and current value). Ranges: Not documented (no slider found).
- **Behaviour:** On each recorded mouse-down the cursor sprite is scaled down and released on mouse-up through this spring; the same timing drives the circle/ripple effect and the click sound trigger (Inferred from shared click events).
- **Constraints and edge cases:** Same validation as 129 ("Stiffness value must be greater than 0", "Mass value must be greater or equal 0"). Ignored when the cursor is hidden (127).
- **Stored as:** `config.mouseClickSpring.{stiffness,damping,mass}`.
- **Confidence:** Build-confirmed (key and values); animation details Inferred; UI exposure Not documented.

### 132. Rotate cursor while moving
- **Where:** Cursor panel → "Advanced" → "Rotate cursor while moving" (togglable group) with a slider.
- **Purpose:** Adds a tilt to the pointer while it travels so it looks like it is "chasing the mouse".
- **Controls and options:** Group toggle plus slider `cursorRotateOnXMovementRatio` min 0, max 2, reset to default 0.5. Current 0.5. Help text: "If cursor is moving horizontally, it will slightly rotate as if it is chasing the mouse."
- **Behaviour:** The horizontal velocity of the smoothed cursor is multiplied by this ratio to produce a rotation around the hotspot; the rotation decays to the base rotation (133) when the cursor stops. 0 disables the effect, 2 doubles it. Analytics "Cursor rotation while moving changed".
- **Constraints and edge cases:** Only horizontal movement contributes. Has no visible effect when smoothing is off (128) because there is no velocity overshoot (Inferred). Not applied to the `touch` set's symmetric pointer in any visible way (Inferred).
- **Stored as:** `config.cursorRotateOnXMovementRatio`.
- **Confidence:** Build-confirmed (range, default, text); interactions Inferred.

### 133. Base rotation
- **Where:** Cursor panel → Advanced → "Rotate cursor" slider ("Rotation").
- **Purpose:** Permanently tilt the pointer, for stylised videos or to match a custom cursor set's artwork.
- **Controls and options:** Slider `cursorBaseRotation` min −180, max 180, displayed with "°", reset to 0. Current 0.
- **Behaviour:** The cursor sprite is rotated by this angle around its hotspot at all times; the movement rotation (132) is added on top. Analytics "Cursor rotation changed".
- **Constraints and edge cases:** Rotation is applied to the sprite only; click effects (141) are drawn unrotated at the hotspot (Inferred). Hidden while "Hide cursor" is on.
- **Stored as:** `config.cursorBaseRotation`.
- **Confidence:** Build-confirmed (range, default); effect details Inferred.

### 134. Always use pointer cursor
- **Where:** Cursor panel → "Always use pointer cursor" toggle (guide calls it "Always use default system cursor").
- **Purpose:** Keep the plain arrow throughout instead of switching to I-beam, hand, resize and other cursor types.
- **Controls and options:** Toggle `alwaysUseDefaultCursor` on/off; description "Don't change cursor, even if selecting text, etc." Current off.
- **Behaviour:** When on, the recorded cursor-type changes are ignored and the set's `pointer` image is drawn for the whole video; when off, each recorded type is mapped to the set (125). Analytics "Always use pointer cursor changed".
- **Constraints and edge cases:** Overrides 135 and 136 (there are no type changes left to optimise). Sets with only a pointer (e.g. `touch`, most custom sets) behave as if this were on (Inferred).
- **Stored as:** `config.alwaysUseDefaultCursor`.
- **Confidence:** Build-confirmed (key, strings); override relationships Inferred.

### 135. Sharp cursor fallback
- **Where:** Cursor panel (advanced); the toggle's visible label is not in the string table ("Not documented").
- **Purpose:** Avoid blurry pointers from apps that supply low-resolution custom cursors by substituting the sharp bundled cursor.
- **Controls and options:** Toggle `useDefaultCursorIfAppCursorHasLowResolution` on/off; current on (bundle default on).
- **Behaviour:** When an app-provided cursor image captured during recording is lower resolution than the display scale, the editor swaps in the matching vector cursor from the chosen set instead of upscaling the captured bitmap; when the recorded cursor is sharp it is used as captured. With the toggle off, captured images are always used (Inferred from the key name).
- **Constraints and edge cases:** Irrelevant when 134 is on. Resolution threshold: Not documented.
- **Stored as:** `config.useDefaultCursorIfAppCursorHasLowResolution`.
- **Confidence:** Build-confirmed (key, default); behaviour Inferred; label Not documented.

### 136. Optimise cursor type changes
- **Where:** Cursor panel → Advanced → "Optimize cursor changes" (guide: "Optimize original cursor types").
- **Purpose:** Suppress flickering between cursor types when the mouse sweeps quickly across UI elements.
- **Controls and options:** Toggle `optimizeOriginalCursorTypes` on/off; current on. Description: "Screen Studio will try to minimize rapid cursor changes (eg when quickly moving over some elements) when this option is enabled."
- **Behaviour:** Short-lived cursor-type changes in the recorded `cursors.json` stream are dropped so the drawn cursor keeps its previous type during fast moves; longer-lasting changes (hovering a link, text field) are kept.
- **Constraints and edge cases:** Minimum duration threshold: Not documented. No effect when 134 is on.
- **Stored as:** `config.optimizeOriginalCursorTypes`.
- **Confidence:** Build-confirmed (key, default, description); threshold Not documented.

### 137. Hide cursor when idle
- **Where:** Cursor panel → "Hide cursor if not moving" toggle, revealing the "Hide not moving cursor after" slider.
- **Purpose:** Fade the pointer out while the user is not moving it so it does not sit over content.
- **Controls and options:** Toggle writes `hideNotMovingCursorAfterMs` = 2000 (on) or `null` (off). Slider min 500 ms, max 5000 ms. Current: `null` (off).
- **Behaviour:** During playback/export, if no mouse-move sample arrives for longer than the threshold the cursor is hidden until the next movement; the cursor is also hidden for the whole clip if the first move happens after the threshold. Analytics "Hide cursor if not moving changed".
- **Constraints and edge cases:** Clicks without movement do not reveal the cursor (Inferred). Interacts with 138/139: when a loop or stop-at-end window is active, the end-of-video logic takes precedence inside that window.
- **Stored as:** `config.hideNotMovingCursorAfterMs` (number or null).
- **Confidence:** Build-confirmed (keys, default 2000, range); click behaviour Inferred.

### 138. Loop cursor back to start
- **Where:** Cursor panel → "Loop cursor position" toggle plus "Loop cursor position duration" slider.
- **Purpose:** Make seamless loops (e.g. GIFs) by animating the cursor back to where it started before the video ends.
- **Controls and options:** Toggle writes `loopCursorPositionBeforeEndMs` = 1000 (on) or `null` (off). Slider min 1000 ms, max 4000 ms; description "How long before the end of the recording to reset position of the mouse". Toggle description: "Near the end of the video, cursor will move back to its initial position". Current: `null`.
- **Behaviour:** In the last N ms of the recording range the target position fed to the movement spring becomes the cursor's first recorded position, so the cursor glides home and the last frame matches the first. Analytics "Loop cursor position changed".
- **Constraints and edge cases:** Enabling it hides the "Stop cursor movement at the end of the video" control (139) — the two are mutually exclusive. The window is clamped to the clip's source range.
- **Stored as:** `config.loopCursorPositionBeforeEndMs` (number or null).
- **Confidence:** Build-confirmed.

### 139. Stop cursor movement at end
- **Where:** Cursor panel → "Stop cursor movement at the end of the video" slider (shown only while loop (138) is off).
- **Purpose:** Freeze the cursor before the end so the final move toward the stop-recording button is not visible.
- **Controls and options:** Slider `stopCursorMovementInLastPartMs` min 0, max 5000 ms, step 50, displayed in seconds with one decimal ("1.5s"); reset to 0. Current 0. Description: "Near the end of the video, the last mouse movement often leads to clicking "Stop Recording," which you might not want to be visible. Adjust how long before the end of the video the mouse cursor will stop moving."
- **Behaviour:** Mouse samples inside the last N ms are ignored; the cursor rests at its position at (end − N). Dragging the slider also seeks the preview to (duration − N) so the freeze point is visible immediately.
- **Constraints and edge cases:** Hidden when `loopCursorPositionBeforeEndMs` is set. A value of 0 disables the feature.
- **Stored as:** `config.stopCursorMovementInLastPartMs`.
- **Confidence:** Build-confirmed.

### 140. Remove cursor shakes
- **Where:** Cursor panel → Advanced → "Remove cursor shakes" toggle with "Remove cursor shakes threshold" slider.
- **Purpose:** Filter the sudden short jumps that accessibility or mouse-control utilities inject into the pointer path.
- **Controls and options:** Toggle writes `removeCurshorShakeTreshold` = 500 (on) or 0 (off). Slider min 100, max 2000, step 20 (unit: Not documented, likely px/s or px — Inferred). Current 500 (on). Description: "If you use some accessibility apps that can control your mouse, it is possible those apps will cause sudden, short movements of your mouse. This option allows trying to detect and remove them."
- **Behaviour:** Movement samples whose jump exceeds the threshold and immediately return are discarded before smoothing, so the spring never sees the spike.
- **Constraints and edge cases:** Large legitimate flicks above the threshold could also be removed; lower the slider if real movements disappear (Inferred). Key name is misspelt in the file (`Curshor`, `Treshold`) and must be kept as is.
- **Stored as:** `config.removeCurshorShakeTreshold` (0 = off).
- **Confidence:** Build-confirmed (key, values, range, description); detection detail Inferred.

### 141. Click effect none/circle/ripple
- **Where:** Cursor panel → "Click effect" picker.
- **Purpose:** Visually mark mouse clicks in the video.
- **Controls and options:** Options "None", "Circle", "Ripple" → `clickEffect` = `null`, `circle`, `ripple`. Current `null`. (The inventory notes "Highlight" is only a mask type, not a click effect.)
- **Behaviour:** On each recorded mouse-down a circle (static ring that fades) or ripple (expanding ring) is drawn at the hotspot, scaled with cursor size and timed by the click spring (131). Analytics "Click effect changed".
- **Constraints and edge cases:** Not drawn when the cursor is hidden (127, project or clip). Colour and size are not user-adjustable in this build (Not documented).
- **Stored as:** `config.clickEffect` (null | "circle" | "ripple").
- **Confidence:** Build-confirmed (options, key); drawing details Inferred.

### 142. Click sound
- **Where:** Cursor panel → "Click sound" section → effect picker.
- **Purpose:** Add an audible click for every recorded mouse press.
- **Controls and options:** Options "None", "Magic Mouse™" (`apple-magic-mouse`), "MX Master™" (`logitech-mx-master`). Current `null`. Bundled samples per set: `click.wav`, `down.wav`, `up.wav` under `/assets/sounds/clicks/<set>/`.
- **Behaviour:** For each mouse-down/up pair in `mouseclicks-*.json` the matching `down`/`up` sample is mixed into the export at the click time at the volume of 143; the preview plays them too. Analytics event on change.
- **Constraints and edge cases:** Sounds are not played for parts sped up above 2× (audio is dropped there: "Sound will not be played for parts with a playback speed greater than 2x."). Not played when the cursor is hidden for that clip (Inferred).
- **Stored as:** `config.clickSoundEffect` (null | "apple-magic-mouse" | "logitech-mx-master").
- **Confidence:** Build-confirmed (options, assets); mixing rules Inferred.

### 143. Click sound volume and preview
- **Where:** Cursor panel → Click sound → "Click sound volume" slider and the "Play click sound preview" button.
- **Purpose:** Balance click sounds against voice and system audio and audition them before export.
- **Controls and options:** Slider `clickSoundEffectVolume`, range 0–1 (inventory), default and current 0.25. Preview button plays the selected set's click sample at the current volume.
- **Behaviour:** Volume is applied as a gain on the click samples during preview and export; the preview button is only useful when a sound other than "None" is selected.
- **Constraints and edge cases:** Slider range is from the inventory, not confirmed in code. Muting the project (master `audioVolume` 0) also silences click sounds (Inferred).
- **Stored as:** `config.clickSoundEffectVolume`.
- **Confidence:** Build-confirmed (key, default, button string); range Guide/inventory; interaction Inferred.

### 144. Motion blur amount
- **Where:** Animation panel → "Motion blur" slider (also summarised in the Cursor panel per the guide).
- **Purpose:** Cinematic blur while the cursor or the framed screen is moving. Help text: "While mouse cursor or screen is moving, cinematic motion blur effect will be applied".
- **Controls and options:** Slider `motionBlurAmount` min 0, max 1, shown as a percentage; current 1 (100 %). "Advanced motion blur settings" is a togglable group containing 145–147.
- **Behaviour:** Acts as the master multiplier for the three advanced amounts; 0 disables all blur. Analytics "Motion blur changed".
- **Constraints and edge cases:** Blur increases export time (Inferred). With small cursor sizes the Cursor panel advises disabling cursor blur (see 126).
- **Stored as:** `config.motionBlurAmount`.
- **Confidence:** Build-confirmed.

### 145. Motion blur cursor
- **Where:** Animation panel → Advanced motion blur settings → "Cursor movement".
- **Purpose:** Blur only the pointer sprite along its velocity.
- **Controls and options:** Slider `motionBlurCursorAmount` 0–1, current 1.
- **Behaviour:** Blur strength = master (144) × this value, applied to the cursor layer only, proportional to the smoothed cursor speed.
- **Constraints and edge cases:** Advised off when cursor size < 0.75 ("…might reduce cursor visibility"). No effect when the cursor is hidden.
- **Stored as:** `config.motionBlurCursorAmount`.
- **Confidence:** Build-confirmed (key, range); formula Inferred.

### 146. Motion blur screen movement
- **Where:** Animation panel → Advanced motion blur settings → "Screen moving" ("Blur screen movement while it is not zooming in or out").
- **Purpose:** Blur the recording layer while a zoomed-in view pans to follow the cursor.
- **Controls and options:** Slider `motionBlurScreenMoveAmount` 0–1, current 1.
- **Behaviour:** Applied to the screen layer during pans (zoom level constant); strength scales with pan speed from `screenMovementSpring`.
- **Constraints and edge cases:** Only visible when a zoom is active (there is no pan at 1×).
- **Stored as:** `config.motionBlurScreenMoveAmount`.
- **Confidence:** Build-confirmed (key, string); formula Inferred.

### 147. Motion blur screen zoom
- **Where:** Animation panel → Advanced motion blur settings → "Screen zooming in" ("Blur screen while it is zooming in or out").
- **Purpose:** Blur the recording layer during zoom-in/zoom-out transitions.
- **Controls and options:** Slider `motionBlurScreenZoomAmount` 0–1, current 1.
- **Behaviour:** Applied while the zoom level is changing; instant zooms ("Instant animation") skip it because there is no transition.
- **Constraints and edge cases:** None beyond 144's master multiplier.
- **Stored as:** `config.motionBlurScreenZoomAmount`.
- **Confidence:** Build-confirmed (key, string); instant-zoom interaction Inferred.

### 148. Hide camera
- **Where:** Editor sidebar → **Camera** panel → "Hide camera" toggle (icon `eye.slash`); command "Hide camera".
- **Purpose:** Drop the webcam overlay from the whole video while keeping the recording.
- **Controls and options:** Toggle `hideCamera` on/off; current off.
- **Behaviour:** When on, the camera layer is not composited in preview or export and the remaining camera controls (shape, size, position, layouts) are hidden; the camera recording stays in the project so it can be re-enabled. "Webcam is disabled in your project, do you want to enable it?" is asked when a camera-dependent action (e.g. adding a camera layout) is triggered with the camera hidden.
- **Constraints and edge cases:** If no camera was recorded the panel shows "No camera recorded" and the toggle is irrelevant. Timeline layouts (156) still exist but render as screen-only while hidden (Inferred).
- **Stored as:** `config.hideCamera`.
- **Confidence:** Build-confirmed (key, strings); layout interaction Inferred.

### 149. Mirror horizontally
- **Where:** Camera panel → "Mirror horizontally" toggle.
- **Purpose:** Flip the webcam image so it matches what the presenter sees in a mirror (text on shirts etc. remains reversed).
- **Controls and options:** Toggle `mirrorCamera` on/off; current off. Analytics "Mirror camera horizontally changed".
- **Behaviour:** Applies a horizontal flip to the camera texture before shape/roundness are applied; affects every layout.
- **Constraints and edge cases:** Hidden when the camera is hidden (148).
- **Stored as:** `config.mirrorCamera`.
- **Confidence:** Build-confirmed.

### 150. Shape original/square
- **Where:** Camera panel → "Shape" picker.
- **Purpose:** Choose between the camera's native aspect ratio and a centre-cropped square.
- **Controls and options:** Options "Original" (`original`) and "Square" (`square`); current `original`. Analytics "Camera shape changed".
- **Behaviour:** Square crops the recorded frame to its shorter side around the centre; Original keeps the full sensor frame. Roundness (151) is applied to the resulting rectangle, so Square + roundness 0.5 gives a circle.
- **Constraints and edge cases:** The recorder's own "Full-frame webcam preview" / square preview preference (`webcamPreviewType`) only affects the live preview window, not this setting.
- **Stored as:** `config.cameraAspectRatio`.
- **Confidence:** Build-confirmed (options, key); crop rule Inferred.

### 151. Roundness
- **Where:** Camera panel → "Roundness" slider.
- **Purpose:** Round the corners of the camera overlay up to a full circle.
- **Controls and options:** Slider `cameraRoundness` min 0, max 0.5, shown as a percentage; reset to 0.25. Current 0.25. Analytics "Camera roundness changed".
- **Behaviour:** Corner radius = value × shorter side of the camera box; 0.5 produces a pill (Original shape) or circle (Square shape).
- **Constraints and edge cases:** Applied uniformly in every layout including fullscreen camera layouts (Inferred).
- **Stored as:** `config.cameraRoundness`.
- **Confidence:** Build-confirmed (range, default); geometry Inferred.

### 152. Camera size
- **Where:** Camera panel → "Camera size" slider (edits the default layout).
- **Purpose:** Set how large the camera overlay is relative to the output frame.
- **Controls and options:** Slider min 0.2, max 1 (fraction of the frame), current 0.35 in both `config.cameraSize` and `config.defaultLayout.cameraSize`. Analytics "Camera size changed".
- **Behaviour:** The slider writes `defaultLayout.cameraSize` (the project-wide default) and the legacy `cameraSize` mirrors it. Timeline layouts can override it (157) and "Apply camera size to all layouts" (160) copies it everywhere.
- **Constraints and edge cases:** While a custom layout is playing, the panel warns "Custom layout is played on the timeline, so you might not see the changes you make." Value 1 fills the frame.
- **Stored as:** `config.defaultLayout.cameraSize` (and `config.cameraSize`).
- **Confidence:** Build-confirmed.

### 153. Size during zoom
- **Where:** Camera panel → "Make smaller during zoom" toggle and "Camera size during zoom" ("Size during zoom") slider.
- **Purpose:** Shrink the camera while a zoom is active so it does not cover the zoomed content. Help: "When zooming in, the camera will shrink to avoid covering the recording itself."
- **Controls and options:** Toggle on = `cameraScaleDuringZoom` 0.7 (default), off = 1. Slider min 0.25, max 0.8, shown as a percentage. Current 0.7. Analytics "Camera size during zoom changed".
- **Behaviour:** During any zoom range the camera box is scaled by this factor relative to its layout size; the preview seeks to a zoomed moment when the slider is dragged so the effect is visible.
- **Constraints and edge cases:** The toggle is derived (value ≠ 1 means on); setting the slider to 0.8 is the maximum, there is no "grow" option.
- **Stored as:** `config.cameraScaleDuringZoom`.
- **Confidence:** Build-confirmed.

### 154. Position
- **Where:** Camera panel → "Camera position" control; also by dragging the camera on the preview (Guide) and the "Move layout camera up/down/left/right" commands (158).
- **Purpose:** Place the camera overlay in a corner, on an edge or in the centre.
- **Controls and options:** `cameraPosition` corner name (current `bottom-right`) and `cameraPositionPoint` {x, y} in 0–1 (current 1, 1) — also stored per layout as `defaultLayout.cameraPositionPoint`. The move commands step each axis through 0 → 0.5 → 1, giving a 3 × 3 grid.
- **Behaviour:** The camera box is anchored at the point (0,0 = top-left, 1,1 = bottom-right, 0.5 = centred on that axis) with the background padding respected. Analytics "Camera position changed" (string "Camera position").
- **Constraints and edge cases:** Free positions other than the 3 × 3 grid are only reachable by dragging (Guide). Zoomed views keep the camera in the same frame position; the zoom logic tries to keep the cursor visible ("Zoomed camera will automatically try to keep the mouse cursor visible.").
- **Stored as:** `config.cameraPosition`, `config.cameraPositionPoint`, `config.defaultLayout.cameraPositionPoint`.
- **Confidence:** Build-confirmed (keys, grid stepping); drag positioning Guide.

### 155. Default layout type (both, camera only, screen only, hide)
- **Where:** Camera panel → "Default camera layout" → "Layout mode" picker; commands "Set camera layout mode to default / fullscreen / hide" (default shortcuts 1 / 2 / 3 while a layout is targeted).
- **Purpose:** Choose what the video shows when no timeline layout is active.
- **Controls and options:** Picker options in the build: `both` ("Show both camera and screen"), `only-camera` ("Show camera in fullscreen mode" — "Fullscreen camera layout") and `only-screen` ("Only show the screen and hide the camera"). The inventory's "hide" is the `only-screen` type; there is no separate fourth value. Current `defaultLayout.type = both`.
- **Behaviour:** `both` composites screen plus camera box; `only-camera` fills the frame with the camera (shape/roundness still apply); `only-screen` drops the camera. Analytics "Layout mode changed".
- **Constraints and edge cases:** "Edit default camera layout" opens the default layout in the layout editor; with "This layout is not played on the timeline, so you may not see the changes you make." shown when a custom layout covers the playhead.
- **Stored as:** `config.defaultLayout.{type,cameraSize,cameraPositionPoint}`.
- **Confidence:** Build-confirmed (types, descriptions); shortcut digits Inferred from command definitions.

### 156. Timeline camera layouts with animated transitions
- **Where:** Timeline → "Camera Layouts" track (toggle via "Visible timeline tracks"); Camera panel → "Dynamic camera layout" section with "Add screen layout", "Add camera layout", "Add both layout" buttons; commands "Add layout", "Click or drag to create a new layout".
- **Purpose:** Change the camera presentation for parts of the recording: "You can make camera fullscreen, hide it or change its position for certain parts of the recording."
- **Controls and options:** Each layout has `type` (both / only-camera / only-screen), `sourceStartMs`/`sourceEndMs`, `cameraSize`, `cameraPositionPoint`, `isDisabled`. Current `scenes[0].layouts = []`.
- **Behaviour:** Click or drag on the track to create a layout (new layouts start fullscreen per the guide); when the playhead enters a layout the camera animates (springs) from the previous size/position/type to the new one and back to the default at the end. Panel note: "To create a new camera layout click on the camera layouts timeline or use the button below."
- **Constraints and edge cases:** "Not enough space in selected timeline position to add a new layout" when the slot is occupied; layouts cannot overlap. Requires a recorded camera ("No camera recorded").
- **Stored as:** `scenes[].layouts[]`.
- **Confidence:** Build-confirmed (strings, fields); animation Guide/Inferred.

### 157. Per-layout size and position
- **Where:** Camera layout editor (opens when a layout is selected; "Close Camera Layout editor").
- **Purpose:** Give each layout its own camera size and anchor independent of the default layout.
- **Controls and options:** "Custom camera size" toggle ("When enabled, you can set a custom camera size that will be used while this layout is active.") revealing a size slider min 0.2, max 1; position via the 3 × 3 move commands or dragging on the preview. Fields `layouts[].cameraSize` (null = inherit default) and `layouts[].cameraPositionPoint`.
- **Behaviour:** Values apply only while that layout is active; with the custom-size toggle off the default layout size (152) is used.
- **Constraints and edge cases:** "Custom layout is played on the timeline, so you might not see the changes you make." appears when editing the default layout while a custom one is playing, and vice versa ("This layout is not played on the timeline…").
- **Stored as:** `scenes[].layouts[].cameraSize`, `scenes[].layouts[].cameraPositionPoint`.
- **Confidence:** Build-confirmed.

### 158. Move layout camera 1px/10px
- **Where:** Commands "Move layout camera up / down / left / right" (group "Move layout camera"), available when a layout of type `both` is targeted.
- **Purpose:** Nudge the camera anchor with the keyboard.
- **Controls and options:** In this build the commands step the anchor between the three grid positions per axis (x or y: 0 → 0.5 → 1), not by pixels. The strings "Move up/down/left/right by 1px / 10px" exist in the bundle but belong to the crop tool's arrow-key handling ("Use the arrow keys to move the crop selection area"), not to layouts. Default shortcuts: Not documented (obfuscated).
- **Behaviour:** `canApply` is false for `only-camera`/`only-screen` layouts or when already at the edge; executing updates `cameraPositionPoint` and logs "Move layout camera" with the direction.
- **Constraints and edge cases:** No sub-grid precision from the keyboard; use drag for free placement (Guide).
- **Stored as:** `scenes[].layouts[].cameraPositionPoint` (or `defaultLayout.cameraPositionPoint`).
- **Confidence:** Build-confirmed (grid stepping and crop-tool origin of the px strings); shortcuts Not documented.

### 159. Keyboard camera moves and the crop-tool 1px/10px keys
- **Where:** Two different places. (a) Layout camera: select a layout on the Layouts track, then use the arrow keys, or right-click the layout for "Move camera up/down/left/right". (b) Crop tool window: the keyboard icon (tooltip "Show keyboard shortcuts") opens the list of 1 px / 10 px nudge and resize keys.
- **Purpose:** (a) Reposition the camera overlay of one layout without dragging. (b) Fine-tune the crop rectangle by pixel steps.
- **Controls and options:** (a) Commands `moveLayoutCameraUp/Down/Left/Right`, default shortcuts ↑ ↓ ← →. In the command menu they read "Move layout camera up" and so on; in the context menu "Move camera up". `canApply` returns false when the camera is already at that edge of the 3×3 grid. "Apply camera size to all other layouts" (`applyCameraLayoutSizeToAll`, group camera-size) copies the selected layout's `cameraSize` to every layout; it is offered only for a "both" layout when the scene has more than one layout, and shows the toast "Camera size applied to all layouts". (b) Crop keys: ← → ↑ ↓ move the crop by 1 px; ⇧ + arrow moves 10 px; ⌘← "Reduce width by 1px", ⌘→ "Increase width by 1px", ⌘↑ "Increase height by 1px", ⌘↓ "Reduce height by 1px"; ⌘⇧ + arrow does the same by 10 px.
- **Behaviour:** (a) Each move steps the layout's camera position to the next grid slot in that direction; the change is tracked as "Move layout camera" with the direction. (b) Crop nudges change the crop rectangle in source pixels and are shown live in the crop window's dimension fields.
- **Constraints and edge cases:** There is no pixel-step resize for the camera in 3.7.3; camera size is the 0.2–1 slider (152, 157). The 1 px / 10 px strings the inventory attributed to the camera are rendered only inside the crop tool's shortcut popover.
- **Stored as:** (a) `scenes[].layouts[].cameraPosition` and `cameraSize`. (b) `cropConfig.rect01`.
- **Confidence:** Build-confirmed (3.7.3 command definitions and crop-tool popover decoded).

### 160. Apply camera size to all layouts
- **Where:** Layout editor / command "Apply camera size to all other layouts" (also "Apply camera layout size to all other layouts"); tooltip "Set the camera size for all layouts to this value".
- **Purpose:** Propagate one layout's camera size to every other layout and the default.
- **Controls and options:** Single action; no parameters.
- **Behaviour:** Copies the targeted layout's `cameraSize` into every `layouts[].cameraSize` and `defaultLayout.cameraSize`; toast "Camera size applied to all layouts".
- **Constraints and edge cases:** Positions and types are untouched. Undoable (editor undo/redo).
- **Stored as:** `scenes[].layouts[].cameraSize`, `config.defaultLayout.cameraSize`.
- **Confidence:** Build-confirmed.

### 161. Disable a layout
- **Where:** Right-click a layout on the track → "Disable" ("Disable layout" / "Disable camera layout"); command "Toggle layout disabled" / "Toggle disable camera layout"; "Enable camera layout" to re-enable.
- **Purpose:** Temporarily mute a layout without deleting it.
- **Controls and options:** Flag `layouts[].isDisabled`.
- **Behaviour:** A disabled layout stays on the track (drawn dimmed) but the default layout is used during its range.
- **Constraints and edge cases:** Disabled layouts still occupy their time slot for the "Not enough space…" check (Inferred).
- **Stored as:** `scenes[].layouts[].isDisabled`.
- **Confidence:** Build-confirmed (strings, flag); slot rule Inferred.

### 162. Copy/paste layout
- **Where:** Right-click a layout → "Copy layout"; paste onto another layout; commands "Copy layout" / paste ("Layout settings pasted").
- **Purpose:** Reuse one layout's type, size and position on another.
- **Controls and options:** Clipboard holds `{type, cameraPositionPoint, cameraSize, isDisabled}`.
- **Behaviour:** Copy shows "Layout copied"; paste writes those four fields into the targeted layout (time range unchanged) and shows "Layout settings pasted".
- **Constraints and edge cases:** Does not create a new layout — a target layout must exist. Uses the app's internal clipboard, not the system pasteboard (Inferred).
- **Stored as:** `scenes[].layouts[]` fields of the target.
- **Confidence:** Build-confirmed (fields copied, strings); clipboard type Inferred.

### 163. Split layout
- **Where:** Command "Split layout at current time" (right-click a layout at the playhead).
- **Purpose:** Cut one layout into two so each half can have different settings.
- **Controls and options:** Acts at the playhead within the targeted layout.
- **Behaviour:** Produces two layouts with the same settings, divided at the playhead.
- **Constraints and edge cases:** Fails if the playhead is at the layout edge or the result would be too short ("Can't cut item shorter than …", "New duration is too short").
- **Stored as:** `scenes[].layouts[]`.
- **Confidence:** Build-confirmed (command and error strings); minimum length value Not documented.

### 164. Remove one or all layouts
- **Where:** Right-click a layout → "Remove layout"; Camera panel / command "Remove all layouts".
- **Purpose:** Delete layouts and fall back to the default layout.
- **Controls and options:** Single or all.
- **Behaviour:** The entry is removed from `scenes[].layouts`; playback immediately uses the default layout. Undo available.
- **Constraints and edge cases:** "Remove all layouts" has no confirmation string in the bundle (Inferred: none).
- **Stored as:** `scenes[].layouts[]`.
- **Confidence:** Build-confirmed (strings); confirmation Inferred.

### 165. Gradient
- **Where:** Sidebar → **Background & Screen** panel → "Background" type picker → "Gradient" ("Background Gradient").
- **Purpose:** Fill the area around the padded recording with a two-colour gradient.
- **Controls and options:** `backgroundType = gradient` (current). Gradient object `backgroundGradient` with `start {x,y}`, `end {x,y}` and `stops[{color, at}]`; current start (0,0), end (1,1), stops `#03045e` at 0 and `#caf0f8` at 1 (inventory). Preset grid "Gradient presets" (171) and custom colours (172).
- **Behaviour:** Rendered as a linear gradient between the two points across the whole output frame, behind the inset/shadow/recording. Analytics "Background gradient changed", "Background type changed".
- **Constraints and edge cases:** Padding 0 (174) hides the gradient completely. Background blur (173) is only offered for image/wallpaper types.
- **Stored as:** `config.backgroundType`, `config.backgroundGradient`.
- **Confidence:** Build-confirmed.

### 166. Colour
- **Where:** Background & Screen → "Background" → "Color" ("Background Color").
- **Purpose:** Flat single-colour background.
- **Controls and options:** `backgroundType = color`; hex field plus native colour swatch (`ColorPicker__UIInput`, webkit colour swatch) and palette (Guide). Current `backgroundColor = #3F37C9` (bundle default is the first stop of the default gradient).
- **Behaviour:** Fills the frame with the colour. Analytics "Background color changed".
- **Constraints and edge cases:** Invalid strings raise "Unable to parse color from string: …" internally. Alpha is not supported (hex only — Inferred).
- **Stored as:** `config.backgroundType`, `config.backgroundColor`.
- **Confidence:** Build-confirmed (key, default); palette Guide; alpha Inferred.

### 167. Image
- **Where:** Background & Screen → "Background" → "Image" ("Background Image") drop zone: "Click to select, drop image, or press ⌘V".
- **Purpose:** Use your own picture behind the recording.
- **Controls and options:** Picker accepts image files (png/jpg/jpeg extensions in the file dialog); drag-and-drop and paste from clipboard supported. `backgroundImage` = path inside the project bundle or null (current null). "Background blur" slider (173) appears for this type.
- **Behaviour:** The file is copied into the project ("Error copying file to project" on failure), scaled to cover the frame, optionally blurred. Analytics "Background image changed".
- **Constraints and edge cases:** "Invalid file selected" / "Invalid mime type" for unsupported files. Minimum size "Minimal size is 150×150px." (string present; applies to this picker — Inferred).
- **Stored as:** `config.backgroundType = image`, `config.backgroundImage`.
- **Confidence:** Build-confirmed (strings, key); minimum-size attribution Inferred.

### 168. Wallpaper
- **Where:** Background & Screen → "Background" → "Wallpaper" (system image picker with collection tabs, favourites and "Pick random wallpaper").
- **Purpose:** Pick one of the bundled backgrounds.
- **Controls and options:** `backgroundType = system`; `backgroundSystemName` = `<Collection>/<file>.jpg`, current `macOS/tahoe-light.jpg` (bundle default). Right-click a tile → "Add to favourites" (tab "Favourites": "You have no favourite backgrounds yet. To add a background to your favourites, right-click on it and…"). Blur slider (173) available. Credit line "Those beautiful images were created by …" with a link for collections that have an author (Raycast).
- **Behaviour:** The image is loaded from the app bundle (`screen-studio-asset://`) and drawn to cover the frame. Analytics "Background system image changed".
- **Constraints and edge cases:** Favourites are stored in app state (`favouriteBackgrounds`), not in the project. A wallpaper missing in a newer/older build falls back to default (Inferred).
- **Stored as:** `config.backgroundType`, `config.backgroundSystemName`; favourites in app preferences.
- **Confidence:** Build-confirmed (keys, strings); fallback Inferred.

### 169. 180 bundled wallpapers in nine collections
- **Where:** Wallpaper picker tabs.
- **Purpose:** Catalogue of what ships in 3.7.3.
- **Controls and options:** From assets.txt (`/assets/backgrounds/`): **Energy** 23, **Glassmorphism** 10, **Iridescent** 17, **Midnight** 18, **Radiant** 20, **Raycast** 31 (named: Autumnal Peach, Blob, Blob Red, Blossom, Blue Distortion 1–2, Blushing Fire, Bright Rain, Chromatic Dark 1–2, Chromatic Light 1–2, Cube Mono, Cube Prod, Floss, Glass Rainbow, Good Vibes, Loupe, Loupe Mono Dark/Light, Mono Dark Distortion 1–2, Mono Light Distortion 1–2, Moonrise, Ray Of Lights, Red Distortion 1–4, Rose Thorn), **Spring** 24, **Sunset** 21, **macOS** 16 (iPad 17 Dark/Light, Sequoia Blue, Sequoia Blue Orange, Sonoma Clouds/Dark/Evening/From Above/Horizon/Light/River, Tahoe Dark/Light, Ventura, Ventura Dark, Ventura Semi Dark). Total 180.
- **Behaviour:** Numbered collections show as tiles without names; Raycast and macOS tiles use the display names above.
- **Constraints and edge cases:** All are JPEG; no user collections can be added (own images go through 167).
- **Stored as:** Asset bundle; selection in `config.backgroundSystemName`.
- **Confidence:** Build-confirmed (counts and names from assets and string table).

### 170. Random wallpaper
- **Where:** Wallpaper picker → "Pick random wallpaper" button.
- **Purpose:** Quickly try a different look.
- **Controls and options:** One button.
- **Behaviour:** Chooses a random entry from the 180 wallpapers (any collection) and sets `backgroundSystemName`; type switches to `system` if needed.
- **Constraints and edge cases:** May pick the current one again; no "exclude current" logic documented.
- **Stored as:** `config.backgroundSystemName`.
- **Confidence:** Build-confirmed (string); selection pool Inferred.

### 171. 35 gradient presets
- **Where:** Gradient type → "Gradient presets" grid.
- **Purpose:** Ready-made two-colour gradients.
- **Controls and options:** 35 presets (inventory count); each sets start/end points and two stops. The bundle's default gradient (`#03045e` → `#caf0f8`, top-left to bottom-right) is one of them.
- **Behaviour:** Clicking a preset replaces `backgroundGradient` entirely; the custom controls (172) then show its colours.
- **Constraints and edge cases:** Preset names are not shown (tiles only). Exact list: Not documented.
- **Stored as:** `config.backgroundGradient`.
- **Confidence:** Build-confirmed (string "Gradient presets", default gradient); count from inventory.

### 172. Custom two-colour gradient
- **Where:** Gradient type → the two colour swatches/hex inputs under the presets.
- **Purpose:** Build your own gradient.
- **Controls and options:** Start colour (`stops[0].color`) and end colour (`stops[1].color`); direction is fixed by `start`/`end` points of the chosen preset (current (0,0) → (1,1)). Current colours `#03045e` / `#caf0f8`.
- **Behaviour:** Editing either colour keeps the preset's direction and updates the preview live.
- **Constraints and edge cases:** Only two stops and no angle control are exposed (more stops are possible in the file format but not in the UI — Inferred).
- **Stored as:** `config.backgroundGradient.stops[]`, `.start`, `.end`.
- **Confidence:** Build-confirmed (data shape); UI limits Inferred.

### 173. Background image blur
- **Where:** Background & Screen → "Background blur" slider (shown only when type is Image or Wallpaper).
- **Purpose:** Soften a busy photo so the recording stands out.
- **Controls and options:** Slider `backgroundBlur` min 0, max 100, step 1; current 0. Analytics "Background blur changed".
- **Behaviour:** A Gaussian blur filter proportional to the value and the frame width is applied to the background layer only (camera and recording are not blurred).
- **Constraints and edge cases:** Hidden for gradient/colour types; value is kept when switching types and reapplied when returning.
- **Stored as:** `config.backgroundBlur`.
- **Confidence:** Build-confirmed.

### 174. Padding
- **Where:** Background & Screen → "Padding" slider.
- **Purpose:** Space between the recording and the frame edge, which is where the background shows.
- **Controls and options:** Slider `backgroundPaddingRatio` min 0, max 35, displayed as a percentage; reset to default 10. Current 10.
- **Behaviour:** The recording (plus device mockup if enabled) is scaled down so that this proportion of the frame becomes background on each side; shadow, inset and rounded corners are drawn on the scaled recording. Analytics "Padding changed".
- **Constraints and edge cases:** 0 makes the recording fill the frame, so no background, shadow or inset is visible (Guide: "0 = no background visible").
- **Stored as:** `config.backgroundPaddingRatio`.
- **Confidence:** Build-confirmed (range, default); Guide for the 0 case.

### 175. Rounded corners
- **Where:** Background & Screen → "Rounded corners" slider ("Radius").
- **Purpose:** Round the recording's corners.
- **Controls and options:** Slider `windowBorderRadius` min 0, max 200, step 1; current 10. Analytics "Background rounded corners changed".
- **Behaviour:** Clips the recording layer with the radius; the shadow follows the rounded shape. The Inset slider (181) rewrites this value as `round(inset + base radius)` so the two stay consistent.
- **Constraints and edge cases:** Only rendered when the project capability `changeBorderRadius` is true (e.g. not when a device mockup frame defines its own screen shape — Inferred).
- **Stored as:** `config.windowBorderRadius`.
- **Confidence:** Build-confirmed (range, inset coupling); capability condition Inferred.

### 176. Shadow intensity
- **Where:** Background & Screen → "Shadow" group (togglable) → intensity slider.
- **Purpose:** Drop shadow under the recording.
- **Controls and options:** Slider `shadowIntensity` min 0, max 1; current and default 0.75. Analytics "Shadow intensity changed". "Advanced shadow settings" reveals 177–179.
- **Behaviour:** Opacity of the shadow layer. Turning on "Directional shadow" (180) automatically sets intensity to 0.4; turning it off restores the default 0.75.
- **Constraints and edge cases:** Invisible when padding is 0.
- **Stored as:** `config.shadowIntensity`.
- **Confidence:** Build-confirmed.

### 177. Shadow angle
- **Where:** Advanced shadow settings → "Shadow Angle".
- **Purpose:** Direction the shadow is cast.
- **Controls and options:** Slider `shadowAngle` min 0, max 180, step 1, shown with "°"; current and default 90. Analytics "Shadow angle changed".
- **Behaviour:** Combined with distance (178) to offset the shadow; 90° casts straight down.
- **Constraints and edge cases:** Only 0–180 (no upward-cast shadows).
- **Stored as:** `config.shadowAngle`.
- **Confidence:** Build-confirmed.

### 178. Shadow distance
- **Where:** Advanced shadow settings → "Shadow Distance".
- **Purpose:** How far the shadow is offset from the recording.
- **Controls and options:** Slider `shadowDistance` min 0, max 100, step 1 (px at output scale); current and default 25.
- **Behaviour:** Offset = distance along the angle of 177.
- **Constraints and edge cases:** Large distances with small padding are clipped by the frame edge (Inferred).
- **Stored as:** `config.shadowDistance`.
- **Confidence:** Build-confirmed (range, default); clipping Inferred.

### 179. Shadow blur
- **Where:** Advanced shadow settings → "Shadow Blur".
- **Purpose:** Softness of the shadow edge.
- **Controls and options:** Slider `shadowBlur`; current and default 20; range Not documented. Analytics "Shadow blur changed".
- **Behaviour:** Blur radius of the shadow layer.
- **Constraints and edge cases:** None documented.
- **Stored as:** `config.shadowBlur`.
- **Confidence:** Build-confirmed (key, default); range Not documented.

### 180. Directional shadow
- **Where:** Shadow group → "Directional shadow" toggle.
- **Purpose:** A sharper, offset shadow that reads as light from one direction (vs. the default soft ambient shadow).
- **Controls and options:** Toggle `shadowIsDirectional` on/off; current off. Enabling also sets `shadowIntensity` to 0.4; disabling resets it to 0.75. Analytics "Directional shadow changed".
- **Behaviour:** Switches the shadow renderer to use angle/distance as a hard offset.
- **Constraints and edge cases:** Disabled, with the description "Directional shadow is disabled for recordings on large screens.", when the recording exceeds a size threshold (threshold value: Not documented).
- **Stored as:** `config.shadowIsDirectional`.
- **Confidence:** Build-confirmed (intensity coupling, string); threshold Not documented.

### 181. Inset padding
- **Where:** Background & Screen → "Inset" group (togglable) → inset slider; "Inset balance" slider.
- **Purpose:** Draw a coloured border band inside the rounded recording edge, like a window bezel.
- **Controls and options:** Inset slider min 0, max 60, reset 0; writes all four sides of `insetPadding` (top/right/bottom/left, current 0) and recomputes `windowBorderRadius`. "Inset balance" redistributes the band between sides (analytics "Inset balance changed"; exact mapping Not documented).
- **Behaviour:** The recording is scaled into the inset rectangle and the band around it is filled with the inset colour at the inset opacity.
- **Constraints and edge cases:** 0 disables the band and resets the sides to 0. Not visible when padding is 0.
- **Stored as:** `config.insetPadding.{top,right,bottom,left}`.
- **Confidence:** Build-confirmed (range, coupling); balance mapping Not documented.

### 182. Inset colour
- **Where:** Inset group → "Inset color".
- **Purpose:** Colour of the inset band.
- **Controls and options:** Hex/colour swatch `insetColor`; current and default `#000000`. Analytics "Inset color changed".
- **Behaviour:** Fill colour of the band (181).
- **Constraints and edge cases:** Only shown while the inset is greater than 0.
- **Stored as:** `config.insetColor`.
- **Confidence:** Build-confirmed.

### 183. Inset opacity
- **Where:** Inset group → "Inset opacity".
- **Purpose:** Let the background show through the inset band.
- **Controls and options:** Slider `insetAlpha` min 0, max 1; current and default 0.5. Analytics "Inset opacity changed".
- **Behaviour:** Alpha applied to the inset colour.
- **Constraints and edge cases:** Only shown while the inset is greater than 0.
- **Stored as:** `config.insetAlpha`.
- **Confidence:** Build-confirmed.

### 184. Output aspect ratio
- **Where:** Control above the preview ("Output aspect ratio" / "Aspect ratio changed").
- **Purpose:** Choose the canvas shape of the exported video.
- **Controls and options:** Options in the build: **Auto** (original, `null`), **Wide** 16:9, **Square** 1:1, **Classic** 4:3, **Vertical** 9:16 (tip "Tiktok, Intagram stories, etc."), **Tall** 3:4, **Social Media** 4:5 (tip "Optimized for Instagram and Facebook feeds"); the string "Custom aspect ratio" also exists. "Always keep zoomed in" toggle (`alwaysKeepZoomedIn`, current false) crops the visible area to the ratio and follows the cursor (Guide). Current `defaultOutputAspectRatio = null` (Auto).
- **Behaviour:** The output frame takes the ratio; the padded recording is fitted inside it and the background fills the rest. Changing it re-evaluates which device frames match (186).
- **Constraints and edge cases:** "Always keep zoomed in" is disabled while Auto is selected (Inferred from `isDisabled`). Shareable links are always exported at a fixed resolution regardless of ratio ("Shareable links are always exported as …").
- **Stored as:** `config.defaultOutputAspectRatio` (string ratio or null), `config.alwaysKeepZoomedIn`.
- **Confidence:** Build-confirmed (option list and tips); disabled rule Inferred; crop behaviour Guide.

### 185. Device mockup on/off
- **Where:** Background & Screen → "Device frame" section → "Use device mockup" toggle ("Wrap recording in device mockup.").
- **Purpose:** Place the recording inside a Mac, iPad or iPhone bezel.
- **Controls and options:** Toggle `enableDeviceMockup`; current true. When on, the frame picker (186) and "Adjust device size" (187) appear.
- **Behaviour:** The chosen frame PNG is drawn around the recording and the recording is clipped to the frame's screen rectangle (`screenX/Y`, `screenWidth/Height`, `borderRadius` per frame definition).
- **Constraints and edge cases:** With the toggle on but no matching frame (`deviceFrameKey = null`, current) nothing is drawn. "No mockups available for that device" when the recording size matches no frame in Perfect mode. External-device recordings (iPhone/iPad over USB) override the preset's frame key ("Project with external device, overriding deviceFrameKey in preset config"). Shadow and rounded corners apply to the frame (Inferred).
- **Stored as:** `config.enableDeviceMockup`, `config.deviceFrameKey`.
- **Confidence:** Build-confirmed (keys, strings); drawing details Inferred.

### 186. Device frames
- **Where:** Device frame section → "Device frames" picker with a filter: **Perfect** ("Show only device frames that precisely match your recording size.") / **Flexible** ("Show all device frames, even those that don't precisely match your recording size."); "Toggle debug device frames" developer command.
- **Purpose:** Pick the bezel artwork.
- **Controls and options:** 148 PNG frames in `/assets/devices/` (assets.txt), grouped by family → colour count: MacBook Air 1, MacBook Air M2 4 (Midnight, Silver, Space Gray, Starlight), MacBook Pro 1, MacBook Pro 16-inch 1, Pro Display XDR 1, Studio Display 1, iMac 24-inch 7 (Blue, Green, Orange, Pink, Purple, Silver, Yellow); iPad 2, iPad Air 4 2 (portrait + horizontal), iPad Air 5th Gen 10 (5 colours × 2 orientations), iPad Mini 8 (4 × 2), iPad Pro 11 2, iPad Pro 11 M4 4, iPad Pro 12 4; iPhone 11 1, 11 Pro 1, 12 7, 12 Mini 1, 12 Pro Max 1, 13 6, 13 Mini 6, 13 Pro 5, 13 Pro Max 5, 14 6, 14 Pro 4, 14 Pro Max 4, 15 5, 15 Plus 5, 15 Pro 5, 15 Pro Max 5, 16 5, 16 Plus 4, 16 Pro 4, 16 Pro Max 4, 17 Pro 5, 17 Pro Max 3, iPhone Air 4, iPhone SE 4. The bundle defines 27 frame families with per-family colour lists and screen geometry.
- **Behaviour:** Perfect lists only frames whose screen size equals the recording size; Flexible lists all and stretches per 187. Selecting writes `deviceFrameKey`.
- **Constraints and edge cases:** Two iPhone 15 Pro files carry the misspelling "Titatnium" alongside the correct ones. Current `deviceFrameKey = null`.
- **Stored as:** `config.deviceFrameKey`.
- **Confidence:** Build-confirmed (assets, filter strings).

### 187. Fit mockup to recording size
- **Where:** Device frame section → "Adjust device size" toggle ("Stretch or shrink the device mockup to match the recording size.").
- **Purpose:** Allow non-exact frames (Flexible mode) to wrap the recording.
- **Controls and options:** Toggle `adjustDeviceFrameToRecordingSize`; current true.
- **Behaviour:** When on, the frame image is scaled non-uniformly so its screen rectangle matches the recording; when off, the recording is fitted inside the frame's native screen area (letterboxed — Inferred).
- **Constraints and edge cases:** Only shown while "Use device mockup" is on. Extreme ratio mismatches distort the bezel.
- **Stored as:** `config.adjustDeviceFrameToRecordingSize`.
- **Confidence:** Build-confirmed (key, string); off-behaviour Inferred.

### 188. Screen animation style
- **Where:** Animation panel → "Screen animation style" picker (+ "Customize").
- **Purpose:** Character of zoom and pan movement of the screen layer.
- **Controls and options:** **Focused** — stiffness 200, damping 40, mass 2.25 ("Animation stabilizes quickly making it easier to follow and read the content"; bundle default and current) and **Smooth** — 170 / 50 / 3 ("Animation is more fluid. Great for more creative content not focused on reading"). Customize exposes Rigidity / Smoothness / Momentum sliders with the same ranges as 129. Analytics "Zoom animations changed".
- **Behaviour:** The spring drives zoom level and pan target for every zoom range (except instant zooms).
- **Constraints and edge cases:** Edited values that match neither preset show no selection; "Reset" returns to the preset.
- **Stored as:** `config.screenMovementSpring.{stiffness,damping,mass}`.
- **Confidence:** Build-confirmed.

### 189. Sensitive-data mask
- **Where:** Timeline → "Masks" track (key 4 per the guide); commands "Add sensitive data mask", "Create mask…"; Mask editor in the sidebar ("Close Mask editor", "Finish editing mask").
- **Purpose:** Hide passwords, e-mail addresses or other private content with a blurred/covered rectangle.
- **Controls and options:** Mask `type = sensitive-data`; region rectangle drawn on the preview; `sourceStartTime`/`sourceEndTime`; `isDisabled`. Editor note: "Make sure the mask covers the entire part of the timeline where sensitive data is present." Current `scenes[0].masks = []`.
- **Behaviour:** Within its time range the region is obscured in preview and export. Dragging the rectangle on the preview sets the area; the timeline block sets the duration.
- **Constraints and edge cases:** Masks do not follow scrolling (Guide); the timeline warns "Data may be visible" where coverage is incomplete (Inferred placement). Masks and highlights cannot overlap in time: "Not enough space in selected timeline position to add a new mask".
- **Stored as:** `scenes[].masks[]`.
- **Confidence:** Build-confirmed (strings, type); scrolling rule Guide; warning placement Inferred.

### 190. Highlight mask
- **Where:** Masks track / command "Add highlight mask"; Mask editor with "Highlight mask opacity".
- **Purpose:** Dim everything except a region to draw attention to it.
- **Controls and options:** Mask `type = highlight`; `highlightMaskOpacity` slider min 0.1, max 0.9, shown as a percentage, reset 0.5.
- **Behaviour:** Everything outside the rectangle is darkened by the opacity for the mask's duration; the region itself is untouched.
- **Constraints and edge cases:** Same overlap and coverage rules as 189. Highlight is a mask type only, not a click effect.
- **Stored as:** `scenes[].masks[].type`, `.highlightMaskOpacity`.
- **Confidence:** Build-confirmed.

### 191. Highlight opacity apply to all
- **Where:** Mask editor → "Apply to all masks" button next to the opacity slider (shown when the scene has more than one mask); command "Apply highlight mask opacity to all masks".
- **Purpose:** Keep dimming consistent across several highlights.
- **Controls and options:** Single action.
- **Behaviour:** Copies the current mask's `highlightMaskOpacity` to every mask; toast "Highlight mask opacity applied to all masks".
- **Constraints and edge cases:** Sensitive-data masks store the value but it has no visual effect for them (Inferred).
- **Stored as:** `scenes[].masks[].highlightMaskOpacity`.
- **Confidence:** Build-confirmed (condition >1 mask, strings).

### 192. Draw masks on preview or timeline
- **Where:** Masks track: "Click or drag to create a new mask"; preview: drag the mask rectangle (crop-style handles).
- **Purpose:** Two entry points for creating and sizing a mask.
- **Controls and options:** Click on the track adds a mask of default length at that time; drag sets the range; the rectangle on the preview is resized with corner/edge handles (ReactCrop-based, arrow-key nudging as in the crop tool).
- **Behaviour:** New masks open the Mask editor; "Start is source of the mask" marks that the region is captured at the mask's start frame.
- **Constraints and edge cases:** When the playhead is outside the mask the editor warns "Preview is showing different part of the recording than the one covered by the mask." with a button to jump there (196). "Not enough space…" if the slot is taken.
- **Stored as:** `scenes[].masks[]` (region + times).
- **Confidence:** Build-confirmed (strings); handle details Inferred.

### 193. Change mask type
- **Where:** Mask editor → "Mask type" picker ("Sensitive Data" / "Highlight"); commands "Change mask type to highlight" / "Change mask type to sensitive data".
- **Purpose:** Convert a mask without redrawing it.
- **Controls and options:** Two values.
- **Behaviour:** Keeps region and timing; switches the renderer; the opacity slider appears for highlight.
- **Constraints and edge cases:** None documented.
- **Stored as:** `scenes[].masks[].type`.
- **Confidence:** Build-confirmed.

### 194. Enable/disable one or all masks
- **Where:** Right-click a mask → "Disable mask" / "Enable mask"; commands "Toggle mask disabled", "Disable all masks".
- **Purpose:** Temporarily switch masks off. Help: "When disabled, the mask will not be applied, but it will still be present in the timeline."
- **Controls and options:** `isDisabled` per mask; "Disable all masks" sets it on every mask.
- **Behaviour:** Disabled masks are drawn dimmed on the track and ignored in rendering.
- **Constraints and edge cases:** There is no "Enable all" command string; re-enable individually.
- **Stored as:** `scenes[].masks[].isDisabled`.
- **Confidence:** Build-confirmed.

### 195. Copy mask
- **Where:** Right-click a mask → "Copy mask"; command "Copy mask".
- **Purpose:** Duplicate region/type/opacity to another position.
- **Controls and options:** Single action; toast "Mask copied".
- **Behaviour:** Stores the mask settings in the app clipboard; pasting into the track creates/updates a mask ("Mask applied").
- **Constraints and edge cases:** Paste target must have free space ("Not enough space…").
- **Stored as:** `scenes[].masks[]`.
- **Confidence:** Build-confirmed (strings); paste mechanics Inferred.

### 196. Focus timeline on a mask
- **Where:** Mask editor → "Focus the timeline on the mask" / "Focus the timeline on the mask start" buttons; commands of the same name.
- **Purpose:** Jump the playhead and timeline view to the mask so the preview shows the masked frames.
- **Controls and options:** Two actions.
- **Behaviour:** Scrolls/zooms the timeline to the mask range and seeks to its start, clearing the "Preview is showing different part…" warning.
- **Constraints and edge cases:** None documented.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed.

### 197. Masked content shift detection
- **Where:** Settings → Editor → "Masked content shift detection" toggle (app preference); timeline indicator "Detecting masked content shift".
- **Purpose:** Experimental check that warns when the content under a mask moves (scrolls) so the mask may stop covering it. Note: "This is an experimental feature."
- **Controls and options:** Preference `detectMaskedContentShift` on/off; current off.
- **Behaviour:** When on, the app analyses frames inside each mask range and flags shifts on the timeline ("Data may be visible"); errors log "Failed to detect masked content shift".
- **Constraints and edge cases:** Off by default; analysis costs CPU during editing (Inferred).
- **Stored as:** app preference `detectMaskedContentShift`.
- **Confidence:** Build-confirmed (keys, strings); flag placement Inferred.

### 198. Remove one or all masks
- **Where:** Right-click a mask → "Remove mask"; command "Remove all masks"; trash icon in the Mask editor.
- **Purpose:** Delete masks.
- **Controls and options:** Single or all.
- **Behaviour:** Removes entries from `scenes[].masks`; undoable.
- **Constraints and edge cases:** No confirmation string exists for "Remove all masks" (Inferred: none).
- **Stored as:** `scenes[].masks[]`.
- **Confidence:** Build-confirmed (strings).

### 199. Show pressed shortcuts
- **Where:** Sidebar → "Keyboard Shortcuts" panel → "Show shortcuts" toggle ("Show pressed shortcut labels in the video."); timeline "Shortcuts track" (key 3).
- **Purpose:** Overlay key-combination labels when the recording captured keystrokes.
- **Controls and options:** Toggle `showShortcuts`; current false.
- **Behaviour:** Recorded keystrokes (`keystrokes-*.json`) are grouped into shortcuts and rendered as labels at the moment they were pressed. Opening the track while the project has labels off asks "Shortcut labels are disabled in your project, do you want to enable them?" with the button "Enable shortcuts".
- **Constraints and edge cases:** The track command is disabled when no keystrokes were recorded (Guide: "disabled if no keys pressed"; build checks `recording.keystrokes.length === 0`). Note: "No keyboard shortcuts during recording" is the recorder option that suppresses app shortcuts, not this feature.
- **Stored as:** `config.showShortcuts`.
- **Confidence:** Build-confirmed.

### 200. Show single-key shortcuts
- **Where:** Keyboard Shortcuts panel → "Show single key shortcuts" toggle.
- **Purpose:** Include plain key presses, not only modifier combinations. Help: "By default, only 2+ keys shortcuts are shown. Enable this option to show single letter shortcuts as well."
- **Controls and options:** Toggle `showShortcutsWithSingleLetters`; current false.
- **Behaviour:** Adds single-key events to the overlay and the track.
- **Constraints and edge cases:** Typing text produces many labels; combine with 202/203 to prune.
- **Stored as:** `config.showShortcutsWithSingleLetters`.
- **Confidence:** Build-confirmed.

### 201. Label size
- **Where:** Keyboard Shortcuts panel → "Shortcut labels size" slider.
- **Purpose:** Scale the overlay labels.
- **Controls and options:** Slider `shortcutsSizeRatio` min 0.5, max 2, shown as a percentage; reset 1. Current 1. Analytics "Shortcuts size changed".
- **Behaviour:** Multiplies the label font/box size.
- **Constraints and edge cases:** Only shown while "Show shortcuts" is on (Inferred).
- **Stored as:** `config.shortcutsSizeRatio`.
- **Confidence:** Build-confirmed (range, default).

### 202. Hide individual shortcuts
- **Where:** Shortcuts track → click a shortcut block ("Hide shortcut"; "Show shortcut" to restore).
- **Purpose:** Drop a specific pressed shortcut from the overlay.
- **Controls and options:** Per-occurrence flag kept in `config.hiddenShortcuts` (object, default `{}`).
- **Behaviour:** Hidden entries stay on the track (dimmed) but are not rendered.
- **Constraints and edge cases:** Key structure of `hiddenShortcuts`: Not documented.
- **Stored as:** `config.hiddenShortcuts`.
- **Confidence:** Build-confirmed (strings, key); structure Not documented.

### 203. Disable all of one kind
- **Where:** Shortcuts track → right-click a shortcut label. Also by clicking a label on the track (toggles that one occurrence; tooltip "Hide shortcut" or "Show shortcut", followed by the key combination when the label is truncated).
- **Purpose:** Hide every on-screen label for one key combination (for example every ⌘C) in one action, without turning the overlay off.
- **Controls and options:** The context menu has up to three entries: "Hide shortcut" / "Show shortcut" (this occurrence); "Hide all ⌘C" / "Show all ⌘C" (the combination of the clicked label, shown only when that combination occurs more than once in the recording); and "Hide all shortcuts" / "Show all shortcuts" (every label; the verb flips to Show once every shortcut is hidden).
- **Behaviour:** `hiddenShortcuts` is a map keyed by the shortcut event's `recordingTimeMs` with the value `true`. "All of one kind" finds every event whose `shortcut.toString()` equals the clicked one and sets or deletes each key. "All shortcuts" fills or clears the map for every event. Hidden labels stay on the track, drawn disabled, so they can be shown again.
- **Constraints and edge cases:** The track is only drawn when "Show keyboard shortcuts" is on; opening it while labels are off asks "Shortcut labels are disabled in your project, do you want to enable them?". Hiding is per occurrence, so a shortcut recorded again later is visible until hidden.
- **Stored as:** `config.hiddenShortcuts` as `{ "<recordingTimeMs>": true }`.
- **Confidence:** Build-confirmed (3.7.3 Shortcuts track code decoded; same structure in 4.1.0 where the menu reads "Show this shortcut" and "Show every ⌘C").

### 204. Hide shortcuts track
- **Where:** Shortcuts track header → "Hide Shortcuts Track"; "Visible timeline tracks" menu; command "Hide" for the shortcuts timeline.
- **Purpose:** Declutter the timeline.
- **Controls and options:** Track visibility toggle.
- **Behaviour:** Hides the track only; labels are still rendered according to 199.
- **Constraints and edge cases:** The track auto-shows ("tryToShowTrack") when the Keyboard Shortcuts panel is opened.
- **Stored as:** runtime only (editor view state).
- **Confidence:** Build-confirmed.


## Part 4 — Captions, Audio, Presets, Export and Sharing

Sources: installed build 3.7.3 (4475) string table (`ui-strings.txt`), project file and preference dump (`project-settings.txt`), bundle asset list (`assets.txt`), the obfuscated renderer bundle for a handful of option values, and the official guide for behaviour the build does not spell out. Any field marked "Not documented" has no supporting fact in those sources.

### 205. Generate transcript with local Whisper
- **Where:** Editor sidebar, "Captions" panel; command menu "Generate transcript".
- **Purpose:** Produce a timed transcript from the microphone track, entirely on-device, so captions can be shown over the video and exported.
- **Controls and options:** "Transcript method" picker with two options, `whisper` (label "Whisper") and `system` (label "Apple Speech Recognition"). When Whisper is chosen: AI model "Base" ("Will download 142MB on first use. Fastest, but less accurate."), "Small" ("Will download 466MB on first use. 2.5 times slower than Base, but more accurate. Produces good results in most cases."), "Medium" ("Will download 1.5GB on first use. 8 times slower than Base, but more accurate. Requires 5GB of RAM."); "Language" (see 207); "Prompt" free-text ("Prompt will help generating accurate transcript for your recording. It is especially useful if you talk using custom names, such as your product name."); "Generate transcript" button. Captions are off until a transcript exists (guide).
- **Behaviour:** Panel note: "Transcript will be generated using Whisper AI model. No data will be sent to the server." Clicking "Generate transcript" downloads the chosen model on first use, then shows "Generating transcript" and the toast "Transcript is being generated. You can still edit your project while it's being generated." On completion "Transcript generated" is logged, captions appear on the preview, and the panel switches to the post-generation controls (208–212). Build log strings "Starting transcript generation for location", "Checking if all transcripts exist", "Finished generating missing transcripts" show generation runs per recording session location.
- **Constraints and edge cases:** Needs a microphone track ("No microphone recorded" otherwise; guide). The guide states generation takes minutes. Model download requires internet once; transcription itself is local. "Invalid transcript location" is the failure string when the session path cannot be resolved.
- **Stored as:** Transcript data in the project bundle per session location (runtime path; exact file name not documented); model choice, language and prompt: Not documented.
- **Confidence:** Build-confirmed for labels, model sizes and descriptions; Guide for microphone requirement and duration.

### 206. Generate transcript with Apple Speech Recognition
- **Where:** "Captions" panel, "Transcript method" picker, option "Apple Speech Recognition".
- **Purpose:** Use the macOS native speech engine instead of Whisper, avoiding the model download.
- **Controls and options:** Same "Transcript method" picker as 205; selecting `system` replaces the Whisper model/prompt controls with the Apple-specific generation block, then "Generate transcript". Language picker availability for this engine: Not documented.
- **Behaviour:** Panel description: "Transcript will be generated locally using Apple's native speech recognition engine (requires macOS 26.0 or later). No data will be sent to the server." Generation, progress and completion follow 205 and feed the same captions, editor and export features.
- **Constraints and edge cases:** Requires macOS 26.0 or later; on older systems the option is present in the build but the engine is unavailable (behaviour on older macOS: Not documented). No internet needed. Microphone track required (guide).
- **Stored as:** Chosen method: Not documented (not a project.json config key in the dump); transcript output as in 205.
- **Confidence:** Build-confirmed for labels, option values and the macOS 26.0 requirement; Guide for the microphone requirement.

### 207. 60-plus transcript languages
- **Where:** "Captions" panel, "Language" picker (Whisper method).
- **Purpose:** Fix the spoken language for better accuracy, or let Whisper detect it.
- **Controls and options:** "Auto" plus named languages. The build string table contains these 58 language names: Armenian, Azerbaijani, Basque, Belarusian, Bengali, Bulgarian, Catalan, Chinese, Croatian, Czech, Danish, Dutch, English, Estonian, Filipino, Finnish, French, Galician, Georgian, German, Greek, Gujarati, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Italian, Japanese, Kannada, Korean, Latin, Latvian, Lithuanian, Macedonian, Malay, Maltese, Norwegian, Persian, Polish, Portuguese, Romanian, Russian, Serbian, Slovak, Slovenian, Spanish, Swahili, Swedish, Tamil, Telugu, Thai, Turkish, Ukrainian, Urdu, Vietnamese, Welsh, Yiddish. The guide says "60+"; the supported list is fetched via `captions.supportedLocales`, so the live list may differ slightly from the string table. Default: "Auto" (guide: auto-detect).
- **Behaviour:** The chosen language is passed to the Whisper run. A truncated warning string "Language you selected has " exists in the build (its completion is not in the table), implying a per-language caveat is shown for some selections.
- **Constraints and edge cases:** Accuracy varies by model size (205). Whether the Apple engine uses this picker: Not documented.
- **Stored as:** Not documented.
- **Confidence:** Build-confirmed for the 58 names and "Auto"; Guide for "60+" and auto-detect; Inferred that the list is server-provided.

### 208. Show or hide captions
- **Where:** "Captions" panel toggle; command menu "Hide transcript".
- **Purpose:** Keep a generated transcript but choose whether captions are rendered on the preview and in exports.
- **Controls and options:** On/off. Current value `config.showTranscript = True`.
- **Behaviour:** Toggling fires "Hide transcript changed"; captions disappear from the preview and from any subsequent export while the transcript data is retained for editing (210) and export (212). The caption burn-in follows the project aspect ratio and crop.
- **Constraints and edge cases:** Has no effect until a transcript exists (guide: captions are off by default and need a generated transcript). Hiding does not delete the transcript; only "Re-Generate transcript" (211) replaces it.
- **Stored as:** `config.showTranscript` in project.json.
- **Confidence:** Build-confirmed for key, label and current value; Inferred for export behaviour.

### 209. Caption size
- **Where:** "Captions" panel, "Transcript size" slider.
- **Purpose:** Scale the on-video caption text.
- **Controls and options:** Slider, min 0.5, max 2 (build), current `config.transcriptSizeRatio = 1`.
- **Behaviour:** Changing the slider fires "Transcript size changed" and re-renders the captions on the preview at the new ratio; exports use the same ratio.
- **Constraints and edge cases:** Only shown when a transcript exists and captions are visible (208). Font, colour and position are not user-configurable in this build (no strings found).
- **Stored as:** `config.transcriptSizeRatio` in project.json.
- **Confidence:** Build-confirmed for key, label, range and current value.

### 210. Edit transcript
- **Where:** "Captions" panel, "Edit transcript" button (opens the captions editor); command menu "Edit transcript".
- **Purpose:** Correct recognition mistakes, names and punctuation before captions are shown or exported.
- **Controls and options:** Captions editor with per-segment text; "Update transcript" applies changes ("Updating transcript" while saving). Timing adjustment: Not documented.
- **Behaviour:** Opening the editor loads the current transcript ("Loaded transcript"). Edits are held as dirty data (`maybeDirtyTranscriptData` in the build) until "Update transcript" writes them back; captions on the preview and the exported file (212) then reflect the edited text.
- **Constraints and edge cases:** "When re-generating transcript, previous transcript (and all changes you made to it) will be lost." Edit-by-transcript (cutting video by deleting words) is a 4.x feature and is not in this build.
- **Stored as:** Transcript data in the project bundle (runtime path).
- **Confidence:** Build-confirmed for labels and warning; Guide for the workflow; Inferred for the dirty-state behaviour.

### 211. Re-generate transcript
- **Where:** "Captions" panel, "Re-Generate transcript" button; command menu "Re-generate transcript".
- **Purpose:** Run recognition again with a different method, model, language or prompt.
- **Controls and options:** Same settings as 205/206 become editable again before confirming.
- **Behaviour:** Shows the warning "When re-generating transcript, previous transcript (and all changes you made to it) will be lost." then repeats generation (progress and toasts as in 205). The new transcript replaces the old one and captions update.
- **Constraints and edge cases:** Destructive to manual edits (210); export the transcript first (212) if the edits are valuable. Only one generation runs at a time ("Finished generating all transcripts" marks completion across sessions).
- **Stored as:** Transcript data in the project bundle.
- **Confidence:** Build-confirmed for labels and warning; Guide for workflow.

### 212. Export transcript
- **Where:** "Captions" panel, "Export transcript" button; command menu "Export transcript".
- **Purpose:** Save the (edited) transcript as a subtitle file for other players or editors.
- **Controls and options:** macOS save dialog titled "Where to save the transcript?", file extension `srt`, default file name = project name.
- **Behaviour:** The build calls `captions.exportTranscriptAsSRT` with the current transcript and the chosen path, then reveals the file in Finder (`files.showFileInFolder`). Timings follow the edited project timeline so the SRT lines up with the exported video.
- **Constraints and edge cases:** Disabled until a transcript exists. Only SRT is offered in this build (no VTT/TXT strings). Whether cuts and speed changes are reflected in the SRT timings: Not documented.
- **Stored as:** Runtime only (writes an external .srt file).
- **Confidence:** Build-confirmed for dialog title, extension and Finder reveal; Inferred for timing behaviour.

### 213. Master volume
- **Where:** Editor sidebar, "Audio" panel, project volume slider; per-clip "Set volume" via right-click on a clip or the command "Set slice volume".
- **Purpose:** Set the overall loudness of the mixed microphone/system/device audio in preview and export.
- **Controls and options:** Project level: `config.audioVolume`, current 1 (slider range: Not documented). Per clip: "Set volume" opens a level list (guide); stored per slice as `volume` (current 1 on the only slice). Separate per-slice "Set slice system audio volume" and "Set slice external device audio volume".
- **Behaviour:** The project value scales the final mix; slice values scale their own clip only, so the two multiply. Changes apply immediately to preview playback and to the next export. Background music (220) and click sounds have independent volumes and are not scaled by this control (Inferred).
- **Constraints and edge cases:** Clips played above 2x speed are muted regardless of volume (Part 3, build string). Muting a source (214–216) overrides its volume.
- **Stored as:** `config.audioVolume`; `scenes[].slices[].volume`, `systemAudioVolume`, `externalDeviceAudioVolume` in project.json.
- **Confidence:** Build-confirmed for keys and values; Guide for the "Set volume" list; Inferred for the multiply relationship.

### 214. Mute microphone
- **Where:** "Audio" panel toggle "Mute microphone"; command menu "Mute microphone".
- **Purpose:** Drop the narration track from preview and export without deleting the recording.
- **Controls and options:** On/off, current `config.muteMicrophone = False`.
- **Behaviour:** Logs "Microphone muted"; the panel shows "Microphone is muted." and the microphone waveform is hidden/ignored in the mix. Background music, system audio and voiceovers are unaffected.
- **Constraints and edge cases:** If no microphone was recorded, the panel states "No microphone recorded" and the control is moot. Captions generation (205) still needs the underlying track, so muting does not block transcription (Inferred). Related project option "Stereo mode" (`microphoneInStereoMode`, off): "When enabled, the microphone is in stereo, if disabled it will be mono".
- **Stored as:** `config.muteMicrophone` in project.json.
- **Confidence:** Build-confirmed for labels, key and value; Inferred for the captions note.

### 215. Mute system audio
- **Where:** "Audio" panel toggle "Mute system audio"; command "Mute system audio"; per-clip "Set system audio volume".
- **Purpose:** Silence captured app/system sound while keeping the microphone.
- **Controls and options:** On/off, current `config.muteSystemAudio = False`; "System audio volume" slider (range: Not documented); per-slice `systemAudioVolume` (current 1).
- **Behaviour:** Logs "System audio muted"; panel shows "System audio is muted."; the system-audio waveform ("Generating system audio waveform...") is removed from the mix in preview and export.
- **Constraints and edge cases:** Only present when the recording captured system audio (recording-time option: all apps or selected apps, modern engine only; Part 2). No track → "No audio track declared." style states. Mute overrides both project and slice volumes.
- **Stored as:** `config.muteSystemAudio`; `scenes[].slices[].systemAudioVolume`.
- **Confidence:** Build-confirmed.

### 216. Mute external device audio
- **Where:** "Audio" panel toggle "Mute external device audio"; command "Mute external device audio"; per-clip "Set external device audio volume".
- **Purpose:** Silence the audio captured from a USB-connected iPhone/iPad recording.
- **Controls and options:** On/off, current `config.muteExternalDeviceAudio = False`; "External device audio volume" slider (range: Not documented); per-slice `externalDeviceAudioVolume` (current 1).
- **Behaviour:** Logs "External device audio muted"; panel shows "External device audio is muted."; the device waveform ("Generating external device audio waveform...") is dropped from the mix.
- **Constraints and edge cases:** Relevant only for projects recorded from an external device; requires the app preference `enableExternalDeviceRecording` (currently off) at recording time. For ordinary screen recordings the control is hidden or inert (Inferred).
- **Stored as:** `config.muteExternalDeviceAudio`; `scenes[].slices[].externalDeviceAudioVolume`.
- **Confidence:** Build-confirmed for keys and strings; Inferred for visibility.

### 217. Improve microphone audio
- **Where:** "Audio" panel toggle "Improve microphone audio".
- **Purpose:** Clean up narration after the fact with noise reduction and loudness normalisation.
- **Controls and options:** On/off, current `config.improveMicrophoneAudio = False`. Description strings: "Reduce microphone recording noise and normalize volume" / "Reduce noise and normalize volume".
- **Behaviour:** When enabled the microphone track is processed ("Normalizing audio") before mixing, in preview and export. Distinct from the recording-time preference `enableVoiceRecordingEnhancements` (off) and from microphone auto gain control (`enableAutoGainControl`, on), which act while recording.
- **Constraints and edge cases:** No effect without a microphone track. Processing adds export time (amount not documented). The 4.x "AI voice cleanup"/podcast mode is not in this build.
- **Stored as:** `config.improveMicrophoneAudio` in project.json.
- **Confidence:** Build-confirmed for key, label and descriptions; Inferred for processing stage.

### 218. Background music from 17 bundled tracks
- **Where:** "Audio" panel, "Background audio" section, "Add background audio".
- **Purpose:** Lay a royalty-free music bed under the recording.
- **Controls and options:** Bundled tracks under `/assets/background-audio/`, by category: Commercial — Focus Mallets, Marimba Bed, Product Uplift, Smile Piano; Electronic — Ambient Electronica, Breezy House, Electro Pop, Pastel Synthwave; Instrumental — Corporate Smile, Friendly Folk, Noble Documentary, Piano Smile; Lo-fi — Bright Lounge, Cozy Chillhop, Lean Groove, Sunny Lo‑Fi, Uplifting Sunset. Also "Drop background audio file here" for a local mp3/mp4 (guide). "Remove background audio" clears it.
- **Behaviour:** Choosing a track logs "Background audio file added", sets `backgroundAudioFileName`, starts the track from project start and mixes it at the background volume (220); a waveform is generated ("Generating external background audio waveform..."). Default volume 0.05 keeps it under narration.
- **Constraints and edge cases:** One track per project. The build string "Mutating project config to remove background audio file name for new projects" shows the track is not carried into new projects by presets or last-project settings. Looping or fade behaviour: Not documented.
- **Stored as:** `config.backgroundAudioFileName` (current None).
- **Confidence:** Build-confirmed for track names, labels and key; Guide for accepted file types.

### 219. Background music from own library folder
- **Where:** "Audio" panel, "Background audio" picker, "Library" tab; command "Open audio library folder".
- **Purpose:** Reuse your own music files across projects without re-adding them.
- **Controls and options:** "Open audio library folder" reveals the folder in Finder. Empty state: "Add background audio tracks to your library folder to access them here".
- **Behaviour:** Files placed in the folder appear in the Library tab next to the bundled categories and are selected the same way as 218. The folder is app-managed; its path is not a user preference in this build.
- **Constraints and edge cases:** Supported formats follow 218 (mp3/mp4 per guide). Folder location: Not documented. Removing a file from the folder breaks projects referencing it (Inferred).
- **Stored as:** `config.backgroundAudioFileName` (file reference); library contents on disk.
- **Confidence:** Build-confirmed for labels; Guide for formats; Inferred for breakage.

### 220. Background music volume and mute
- **Where:** "Audio" panel: "Mute background audio" toggle and "Background audio volume" slider.
- **Purpose:** Balance the music bed against narration, or silence it temporarily.
- **Controls and options:** "Background audio volume" slider min 0, max 1, step 0.01 (build), current `config.backgroundAudioVolume = 0.05`. "Mute background audio" on/off, current `config.muteBackgroundAudio = False`.
- **Behaviour:** The build renders the volume slider only while the track is not muted; muting hides the slider and removes the track from the mix. The value is kept, so unmuting restores it.
- **Constraints and edge cases:** Controls appear only after a track is added (218/219). Independent of the master volume (213).
- **Stored as:** `config.backgroundAudioVolume`, `config.muteBackgroundAudio`.
- **Confidence:** Build-confirmed.

### 221. Record voiceover in the editor
- **Where:** "Audio" panel / command menu "Record voiceover"; opens the "Voiceover editor".
- **Purpose:** Add narration after recording, placed at the current playhead.
- **Controls and options:** "Start recording" / "Stop recording"; "Close Voiceover editor"; microphone choice remembered as `voiceover-preferred-microphone-id`. Playback button and time info inside the editor (`VoiceoverRecordingManager__PlayButton`, `__UITimeInfo`).
- **Behaviour:** Recording starts at the current playback time and is saved into the project ("Saving voiceover recording file to project…", "Voiceover added to project"); the clip appears in `scenes[].voiceOvers` with its duration and is mixed with the other tracks. Audio is converted to mono (`convertAudioChannelsToMono`).
- **Constraints and edge cases:** "Please allow access to your microphone in order to record your voice." if permission is missing. "Voiceover already present at current playback time" blocks starting over an existing clip; a running recording stops automatically with "Finishing recording because another voiceover is present at the current playback time". Editing or trimming a voiceover after recording: Not documented.
- **Stored as:** `scenes[].voiceOvers` in project.json plus audio files in the bundle.
- **Confidence:** Build-confirmed for strings and key; Inferred for mixing.

### 222. Audio waveform display
- **Where:** Timeline; commands "Toggle audio waveform" / "Show audio waveform" and "Toggle smooth waveform" / "Smooth waveform"; Settings > Editing.
- **Purpose:** Visualise microphone, system, device, background and voiceover audio on the timeline to place cuts and zooms.
- **Controls and options:** App preferences `hideAudioWaveform` (current False) and `enableSmoothWaveform` (current True). Related experimental "Enable audio scrubber (experimental)" (`playbackAudioScrubber`, False).
- **Behaviour:** Waveforms are generated per track ("Generating microphone waveform...", "Generating system audio waveform...", "Generating external device audio waveform...", "Generating external background audio waveform..."). Smooth mode draws an averaged envelope; off draws raw peaks. Muted tracks are hidden from the mix but the toggle controls display only.
- **Constraints and edge cases:** Generation runs when the project opens or a track is added; large recordings take longer. No waveform when "No audio recorded".
- **Stored as:** `hideAudioWaveform`, `enableSmoothWaveform` app preferences.
- **Confidence:** Build-confirmed for keys and strings; Inferred for the smooth/raw rendering description.

### 223. Audio export engine Swift or FFmpeg
- **Where:** Settings > Advanced, "Audio exporter" picker.
- **Purpose:** Choose which pipeline mixes and encodes audio during export, as a fallback when one misbehaves.
- **Controls and options:** Description "Select the method used to export audio." Options (build): `swift-audio-composer` (default, current `audioComposerMethod = swift-audio-composer`) and `ffmpeg`. Display labels for the two options: Not documented (indexed in the bundle).
- **Behaviour:** Changing logs "Audio exporter changed" and affects the next export only. The FFmpeg path uses the bundled ffmpeg for mixing and mono conversion ("Audio Router: convertToMono - FFmpeg error while converting audio to mono: ").
- **Constraints and edge cases:** "Cannot find ffmpeg" if the binary is missing; "Unable to parse duration from ffmpeg output: " on malformed output. Quality or speed differences: Not documented.
- **Stored as:** `audioComposerMethod` app preference.
- **Confidence:** Build-confirmed for key, values and strings; Inferred that it is in the Advanced tab.

### 224. Create preset from current project
- **Where:** Editor toolbar "Presets" button → "Create new preset"; command menu "Create new preset".
- **Purpose:** Save the current project's look (background, cursor, camera, animation, audio and caption settings) for reuse. Panel intro: "Presets will help you re-use the same project settings across projects".
- **Controls and options:** Name field "New preset name..."; confirm. No per-setting selection in this build.
- **Behaviour:** Snapshots the project `config` object into a preset file in the presets folder (231) and logs "Preset created"; the preset then appears in the Presets list. Timeline items (zooms, cuts, masks, layouts) are not part of a preset. The background music file name is excluded for new projects (build string in 218).
- **Constraints and edge cases:** "Failed to create preset" on write error, typically a Documents-folder permission problem (231). Duplicate names: Not documented.
- **Stored as:** Preset file in `presetsFolderPath`; file format: Not documented.
- **Confidence:** Build-confirmed for labels and messages; Guide for what a preset contains; Inferred that it is the `config` object.

### 225. Apply preset to one project
- **Where:** "Presets" popover, click a preset; command menu "Apply preset to project".
- **Purpose:** Replace the open project's settings with the preset's.
- **Controls and options:** Click to apply; "Preset options..." on each preset for the actions in 226–230.
- **Behaviour:** Logs "Applying preset to project" then "Preset used"; the sidebar updates and the preview re-renders immediately. Undo via the normal edit history (Inferred).
- **Constraints and edge cases:** "Failed to apply preset to project " on error. For projects recorded from an iPhone/iPad the build keeps the project's device frame: "Project with external device, overriding deviceFrameKey in preset config". Settings tied to the recording (crop, recording range, aspect-ratio-dependent values) may need re-adjustment.
- **Stored as:** Writes into the project's `config` keys in project.json; no reference to the preset is kept.
- **Confidence:** Build-confirmed for strings; Guide for the click-to-apply flow; Inferred for undo.

### 226. Apply preset to multiple projects
- **Where:** "Preset options..." → "Apply preset to multiple projects" (command id `applyPresetToMultipleProjects`).
- **Purpose:** Batch-restyle several saved projects without opening each.
- **Controls and options:** Project multi-select (dialog string "Apply preset to " followed by the project list; exact picker UI: Not documented).
- **Behaviour:** Each chosen project is opened in the background, its `config` overwritten as in 225, and saved; per-project failures surface as "Failed to apply preset to project <name>".
- **Constraints and edge cases:** Projects must be reachable on disk ("Project file was not found. It might have been moved or deleted"). Timeline edits are untouched. Progress UI and cancel: Not documented.
- **Stored as:** Each target project's project.json.
- **Confidence:** Build-confirmed for labels; Guide for the feature; Inferred for mechanics.

### 227. Set preset as default for new projects
- **Where:** "Preset options..." → "Use as default for new projects".
- **Purpose:** Have every new recording open with the preset's settings already applied.
- **Controls and options:** Toggle per preset; one default at a time. App preference `defaultPresetId`, current None.
- **Behaviour:** When a recording finishes and the editor project is created, the build logs "Applying default preset to new project" then "Applied default preset". Precedence over "Use last project settings as default for new recordings" (232): Not documented.
- **Constraints and edge cases:** "Error while applying default preset to project" if the preset file is missing or unreadable; the project still opens with built-in defaults (Inferred). Removing the default preset clears the preference (Inferred).
- **Stored as:** `defaultPresetId` app preference.
- **Confidence:** Build-confirmed for key, label and log strings; Inferred for precedence and fallback.

### 228. Update preset to match current project
- **Where:** "Preset options..." → "Update to match currently edited project".
- **Purpose:** Overwrite a saved preset with the open project's current settings after tweaking.
- **Controls and options:** Single action; no confirmation string found.
- **Behaviour:** Logs "Syncing preset with project" then "Preset updated to match"; the preset file is rewritten with the current `config` (same exclusions as 224). Other projects that used the preset are not changed retroactively.
- **Constraints and edge cases:** Irreversible for the preset's previous contents. Fails under the presets-folder permission problem (231).
- **Stored as:** Preset file in `presetsFolderPath`.
- **Confidence:** Build-confirmed for strings; Guide for label; Inferred for non-retroactivity.

### 229. Import and export preset files
- **Where:** "Presets" popover → "Import preset..."; export via "Preset options..." → "Show in finder" (guide wording: "Open in finder") and sharing the file.
- **Purpose:** Move presets between Macs or share them with a team.
- **Controls and options:** "Import preset..." opens a file picker; the import copies the file into the presets folder and logs "Preset imported". There is no separate export command: the file revealed in Finder is the shareable artefact.
- **Behaviour:** Imported presets appear immediately in the list. Presets created by older versions are migrated on launch ("Upgrading legacy presets", "Upgrading preset", "Preset upgraded. Removing legacy preset", "Legacy presets upgraded"; failure: "Legacy presets not upgraded"; the UI waits with "Waiting for legacy presets to be upgraded").
- **Constraints and edge cases:** File extension and schema: Not documented. Importing a file with the same name as an existing preset: Not documented.
- **Stored as:** Preset files in `presetsFolderPath`.
- **Confidence:** Build-confirmed for labels and migration strings; Guide for the share-by-Finder workflow.

### 230. Rename and remove presets
- **Where:** "Preset options..." → "Rename..." and "Remove preset".
- **Purpose:** Keep the preset list tidy.
- **Controls and options:** Rename prompts for a new name; remove shows the confirmation "Are you sure you want to remove this preset?".
- **Behaviour:** Rename rewrites the preset file name/title; remove deletes the file from the presets folder. Projects that already used the preset keep their settings (presets are copied, not linked).
- **Constraints and edge cases:** "Failed to rename preset" / "Failed to remove preset" on file-system errors. Removing the default preset: see 227. Confirmation text for removal is the only destructive guard; there is no undo.
- **Stored as:** Preset files in `presetsFolderPath`.
- **Confidence:** Build-confirmed for labels and messages; Inferred for copy-not-link semantics.

### 231. Presets folder location
- **Where:** Settings > General, "Save presets in" with a folder picker ("Select a folder to save your presets").
- **Purpose:** Choose where preset files live, e.g. a synced folder shared across Macs.
- **Controls and options:** Folder path; app preference `presetsFolderPath`, current `/Users/subhamdas/Documents/Screen Studio Presets` (default `~/Documents/Screen Studio Presets`, guide).
- **Behaviour:** The Presets list is read from this folder on launch and after changes; moving the folder does not move existing files automatically (Inferred).
- **Constraints and edge cases:** The default lives in Documents, so macOS must grant Screen Studio access to the Documents folder (System Settings > Privacy & Security > Files and Folders). Otherwise the app shows "There is a problem with access to presets location. " and preset creation/import fails (guide + build). iCloud-synced Documents is handled (build references `/Library/Mobile Documents/com~apple~CloudDocs`).
- **Stored as:** `presetsFolderPath` app preference.
- **Confidence:** Build-confirmed for key, value and error string; Guide for the permission remedy and default path; Inferred for move behaviour.

### 232. Use last project settings for new recordings
- **Where:** Settings > Editing, toggle "Use last project settings as default for new recordings".
- **Purpose:** Carry the settings you last edited into the next recording without creating a preset.
- **Controls and options:** On/off; app preference `useLastProjectConfigForNewProjects`, current False (default off).
- **Behaviour:** When on, the `config` of the most recently edited project seeds each new project (log "Use last project settings as default for new recordings changed" on toggle). The background music file name is stripped for new projects (218). When off, built-in defaults apply (or the default preset, 227).
- **Constraints and edge cases:** Interaction order with `defaultPresetId`: Not documented. Recording-specific values (crop, recording range) are not carried (Inferred).
- **Stored as:** `useLastProjectConfigForNewProjects` app preference.
- **Confidence:** Build-confirmed for key, label and default; Guide for location; Inferred for exclusions.

### 233. Export MP4
- **Where:** "Export" button top-right of the editor (window title "Export & Share"); File menu "Export as..."; command "Export to...".
- **Purpose:** Render the edited project to an H.264 MP4 for upload or further editing.
- **Controls and options:** "Format" / "Export format" picker: MP4 or GIF (`EXPORT_FILE_FORMATS`). Then resolution (235), frame rate (236), quality (237) and target (240–242). Default format: Not documented.
- **Behaviour:** Clicking a target starts rendering ("Starting export", "Preparing export...", "Exporting video"); frames are composed with all effects, audio is mixed by the audio exporter (223) and muxed ("Mp4 Muxer"; "Video converted to H.264 format."). Completion shows "Export completed" and, for files, the path via the ⓘ button (guide).
- **Constraints and edge cases:** Trial builds block export: "Feel free to play with all Screen Studio features, except video export." / "You only need to activate Screen Studio when exporting recordings to video files." "Only one export can be active at a time". ProRes/HEVC appear in the encoder layer but are not offered in the dialog (inventory). Preview quality settings do not affect export: "Changing those settings only affects video preview. Exported video will always have the best quality."
- **Stored as:** Last-used export settings: Not documented; "Default export settings" preference for quick export (245).
- **Confidence:** Build-confirmed for strings; Guide for the ⓘ path; Inferred for pipeline order.

### 234. Export GIF once or looping
- **Where:** Export dialog, "Format" = GIF; extra toggle "Disable loop".
- **Purpose:** Produce an animated GIF for chats, READMEs and issue trackers.
- **Controls and options:** "Disable loop" toggle (build key `gifDisableLoop`) with description "Exported GIF will only play once and then stop". Default: looping (toggle off) (Inferred from the key name). Resolution, fps and quality as for MP4.
- **Behaviour:** Export runs as in 233 but encodes GIF frames; audio is dropped (Inferred). The dialog shows "Output size and export time are significantly bigger for GIFs. Consider using MP4 if possible." and the estimate panel adds a GIF-specific note (the build renders extra content when format is gif).
- **Constraints and edge cases:** Guide: GIF export is slower; keep clips under about 1 minute. Clipboard and shareable-link targets with GIF: Not documented. Projects created from an existing .gif file are supported as input (Part 2).
- **Stored as:** `gifDisableLoop` within export settings (location: Not documented).
- **Confidence:** Build-confirmed for toggle, key and warnings; Guide for the duration advice; Inferred for default and audio.

### 235. Resolution 480p/720p/1080p/1440p/4K
- **Where:** Export dialog "Resolution" picker; command "Export resolution...".
- **Purpose:** Choose output height; width follows the project aspect ratio.
- **Controls and options:** 480p, 720p, 1080p, 1440p, 2160p (4K), mapped to heights 480/720/1080/1440/2160 (`ALL_RESOLUTIONS_MODES`). Default: Not documented. Shareable links ignore this picker (242).
- **Behaviour:** The chosen height sets the render canvas; the estimate (247) updates. Guide: 4K takes roughly four times as long as 1080p. Format-string placeholders `%w`, `%h`, `%r` can be used in file names; failure string "Could not determine video resolution to replace %w, %h or %r".
- **Constraints and edge cases:** Upscaling beyond the recording's native size is allowed but adds no detail (Inferred); the 4.x "Clarity upscaler" is not in this build. Odd aspect ratios may round the width (Not documented).
- **Stored as:** Export settings (runtime) and "Default export settings" for quick export.
- **Confidence:** Build-confirmed for the five values; Guide for timing; Inferred for upscaling note.

### 236. Frame rate selection
- **Where:** Export dialog "Frame rate" picker (`FpsPicker`); commands "Export fps" / "Export framerate...".
- **Purpose:** Trade smoothness against file size and encode time.
- **Controls and options:** Numeric list; exact values in the build are not resolvable from the obfuscated bundle (Not documented). Guide: 24 and 30 fps are standard, 60 fps is smoother; inventory confirms up to 60 fps. Default: Not documented.
- **Behaviour:** Sets the output timebase; motion blur and cursor animation are re-sampled at that rate. Invalid values are rejected with "Invalid video frame rate: ".
- **Constraints and edge cases:** Shareable links use a fixed fps shown in the dialog (242). Recording capture rate is independent of export rate.
- **Stored as:** Export settings (runtime); quick-export default (245).
- **Confidence:** Build-confirmed for labels and error; Guide for the typical values.

### 237. Quality Web/Medium/High
- **Where:** Export dialog "Quality" picker; command "Export quality...".
- **Purpose:** Set the encoder's compression level.
- **Controls and options:** "Web (Low)", "Medium", "High". Descriptions present in the build: "Good for sharing on the web, where quality is less important, increasing loading speed. Compressions is clearly visible."; "Good for directly playing on websites. Compression is slightly visible, but not distracting."; "Highest quality, best for further editing. Compression is almost impossible to notice." The first two map to Web and Medium respectively (Inferred from wording). Footnote: "Quality setting does not impact export speed."
- **Behaviour:** Changes the bitrate/quality parameter passed to the encoder; the time estimate does not change.
- **Constraints and edge cases:** A separate "High quality (slower export)" string exists, tied to a different (software-encoding) path, not this picker (Inferred). GIF quality semantics: Not documented.
- **Stored as:** Export settings (runtime); quick-export default (245).
- **Confidence:** Build-confirmed for labels and descriptions; Inferred for the Web/Medium mapping.

### 238. Hardware or software encoder
- **Where:** Export dialog "Export Encoder" picker; Settings > Advanced toggle "Disable hardware accelerated video encoding and decoding".
- **Purpose:** Fall back to software encoding when the Mac's media engine misbehaves or produces artefacts.
- **Controls and options:** "Export Encoder" option labels: Not documented (indexed). App preference `disableHardwareAcceleratedVideoEncodingAndDecoding`, current False, with warning "Disabling hardware acceleration might reduce quality of the exported video."
- **Behaviour:** With acceleration enabled the Apple media engine encodes H.264; when disabled, a CPU encoder is used for both decoding the source and encoding output, which is slower ("High quality (slower export)" string accompanies that path, Inferred). Toggle logs "... changed" and applies to the next export.
- **Constraints and edge cases:** "No supported video encoder found" aborts the export if neither path is available. Guide links the toggle to troubleshooting export failures.
- **Stored as:** `disableHardwareAcceleratedVideoEncodingAndDecoding` app preference.
- **Confidence:** Build-confirmed for key, label and warning; Inferred for the engine details.

### 239. Multithreaded encoder
- **Where:** App preferences only; no UI label found in the string table.
- **Purpose:** Encode on several threads/tracks to shorten export time.
- **Controls and options:** `useMultithreadedVideoEncoder`, current True; `experimentalUseMultithreadedVideoEncoder`, current False.
- **Behaviour:** The export splits work across tracks ("Exporting on track #" log). The experimental variant enables a newer path (details: Not documented).
- **Constraints and edge cases:** Not exposed in Settings in this build; changing it requires editing the preferences file. The roadmap's "3x faster exports" item corresponds to this work (guide).
- **Stored as:** `useMultithreadedVideoEncoder`, `experimentalUseMultithreadedVideoEncoder` app preferences.
- **Confidence:** Build-confirmed for keys and values; Inferred for the rest.

### 240. Save to file
- **Where:** Export dialog target "Export to file..." / "Export and save to file"; File menu "Save to file...".
- **Purpose:** Write the rendered MP4/GIF to a location you choose.
- **Controls and options:** macOS save dialog; default name from the project title; `%w`, `%h`, `%r` placeholders are substituted (235).
- **Behaviour:** Export runs with progress (247); on "Export completed" the dialog offers the path (ⓘ, guide) and "Back to export options". If no project window exists (quick export) the save dialog is shown globally (build log).
- **Constraints and edge cases:** Trial blocks export (233). Destination must be writable; low disk space is not pre-checked (Not documented).
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed for labels; Guide for the path reveal.

### 241. Copy to clipboard
- **Where:** Export dialog target "Copy to clipboard" / "Export and copy to clipboard"; command "Export to clipboard".
- **Purpose:** Paste the finished video straight into Slack, Mail or a document without a save dialog.
- **Controls and options:** No options beyond format/resolution/fps/quality. "Open recent Clipboard exports" / "Show previous clipboard exports" reveal earlier files.
- **Behaviour:** The file is rendered to a temporary clipboard-exports folder (`export.getTempClipboardExportsPath`) and placed on the pasteboard as a file; toast "Copied to clipboard". While rendering: "Video will be available after export".
- **Constraints and edge cases:** Temporary files accumulate until cleared (policy: Not documented). Apps that accept only images will not accept the video. Current frame copy is a separate feature ("Current frame image copied to clipboard").
- **Stored as:** Runtime only (temp folder).
- **Confidence:** Build-confirmed for strings and temp-path call; Inferred for retention.

### 242. Create shareable link public or private
- **Where:** Export dialog target "Create shareable link" / "Export to shareable link"; quick-share widget "Share"; recording picker "Record & Create Link".
- **Purpose:** Upload the export to screen.studio and get a URL (screen.studio/share/xxxx) with comments.
- **Controls and options:** Visibility "Public" ("Your video will be uploaded and everyone with the link will be able to view it.") or "Private" / "Private Shareable Link" ("Only the people you share this video with will be able to watch it."); stored under preference prefix `export-settings-preference-shareable-link-visibility-`. Resolution/fps are fixed: "Shareable links are always exported as <height>p video at <fps>fps." (values filled at runtime; not documented).
- **Behaviour:** First use: "Creating your first shareable link", terms prompt "Before we can continue, please take a moment to review our shareable links terms of service and privacy policy." and "We will automatically create an account for you to manage your shareable links." Then "Starting export to shareable link" → "Exporting to shareable link" → "Uploading video" → "Link copied to clipboard" and the link opens in the browser.
- **Constraints and edge cases:** "To create a shareable link, you need to have an active license or subscribe to a plan."; "Can't export to shareable link because of activation"; "Can't export to shareable link because of internet connection"; "Can't create shareable link because of permissions". Length cap: "Max shareable link video duration is " / "Cannot create shareable link for projects longer than" — 30 minutes per guide. Upload troubleshooting: Settings > Experimental "Enhanced shareable links upload settings" (`useExperimentalUploadFeatures`, False): "Using this feature should solves problems with uploading shareable links like 'Host not found' errors (ENOTFOUND) and SSL certificate issues." Privacy: uploads happen only for links.
- **Stored as:** Visibility preference per above; link records on the server.
- **Confidence:** Build-confirmed for strings and keys; Guide for the 30-minute limit and URL form.

### 243. Shareable link title
- **Where:** Export dialog field "Video title..." before link export; Settings > Export "Edit project title before exporting to shareable link".
- **Purpose:** Name the hosted video independently of the project file name.
- **Controls and options:** Text field "Video title". Preference `editProjectTitleWhenUsingQuickExportWidget`, current False: "If enabled, you will be able to edit the project title before exporting to shareable link."
- **Behaviour:** The title is sent with the upload and shown on the share page. With the preference on, quick-link exports from the widget pause for a title prompt; off, the project name is used (normalised per "Screen Studio will automatically normalize project name").
- **Constraints and edge cases:** Changing the title later is done on the manage page (244), not in the app (Inferred). Length limit: Not documented.
- **Stored as:** `editProjectTitleWhenUsingQuickExportWidget` app preference; title on the server.
- **Confidence:** Build-confirmed for labels, key and description; Inferred for later edits.

### 244. Manage shareable links page
- **Where:** Screen Studio menu "Manage shareable links" (command "Open manage shareable links page"); also "Open account dashboard".
- **Purpose:** Review, retitle, change visibility of or delete uploaded videos, and read comments.
- **Controls and options:** Opens screen.studio/dashboard in the browser; no in-app list. Viewer side: "Show Comments", username with pencil edit, "Write a comment" (⌘⏎ posts at the current timestamp), "Report" button (guide).
- **Behaviour:** Requires the auto-created account (242). Access status can be refreshed in-app after a licence change: "If you have already extended your license, refresh sharable links access status." → "Sharable links status refreshed".
- **Constraints and edge cases:** Internet required. Deleting a link stops playback for everyone (Inferred). View counts are shown on the page per inventory; exact metrics: Not documented.
- **Stored as:** Server side; `auth` state in app preferences.
- **Confidence:** Build-confirmed for menu strings; Guide for page contents and comments.

### 245. Quick export with own default settings
- **Where:** Settings > Export "Default export settings" / "Quick export settings..."; recording picker icon "Edit quick export settings".
- **Purpose:** Keep a separate preset of format, resolution, fps, quality and target for one-click exports.
- **Controls and options:** Same pickers as the main dialog. Note: "These settings will be used when using quick export or exporting from the widget". Related prefs: `showQuickExportWidget` (True; "After the recording is done, a widget will appear that allows you to quickly export the recording. If disabled - full editor will be opened instead."), `muteQuickExportWidgetPreview` (False; "Mute widget preview"/"Unmute widget preview"), `actionAfterQuickExport` (do-nothing), `alwaysSaveProjectWhenUsingQuickExportWidget` (False; "If enabled, the project will be always saved after using the quick export widget. If disabled, You will be asked if you want to save or delete project.").
- **Behaviour:** Quick exports read these values instead of the last dialog state; the main dialog is unaffected. Analytics strings distinguish "Export via quick export", "Export via record button", "Export from widget" and "Export from main export window".
- **Constraints and edge cases:** Licence and trial rules as in 233/242. Default values of the quick settings: Not documented.
- **Stored as:** "Default export settings" preference (key name: Not documented) plus the listed app preferences.
- **Confidence:** Build-confirmed for labels, keys and descriptions.

### 246. Quick export to file, clipboard or link
- **Where:** Quick-share widget after recording ("Save", "Copy", "Share", "Edit"); editor commands "Quick export to file..." (default shortcut ends in S; modifiers not resolvable), "Quick export to clipboard", "Quick export to shareable link".
- **Purpose:** Skip the dialog and export with the defaults from 245.
- **Controls and options:** Three targets; widget "Edit" or double-click opens the full editor. Picker setting "Show quick export widget after recording" / "Open quick share widget after recording".
- **Behaviour:** Widget actions export the automatic project immediately; afterwards `actionAfterQuickExport` decides whether to open the project or do nothing, and unless "Always save project when using quick export widget" is on you are asked whether to save or delete the project. Link exports may first prompt for a title (243).
- **Constraints and edge cases:** Same licence/internet/duration constraints as 240–242. Widget preview can be muted. If no project window exists the save dialog appears globally.
- **Stored as:** Runtime; preferences listed in 245.
- **Confidence:** Build-confirmed for labels and preferences; Guide for widget button semantics.

### 247. Export progress with time estimate
- **Where:** Export progress window (replaces the settings view after starting).
- **Purpose:** Show how far the render is and how long it will take.
- **Controls and options:** Progress indicator; "Estimation — Export time <value>"; a second line (for non-GIF) with another figure, and a GIF-specific note when the format is GIF; "Stop export" button (248).
- **Behaviour:** Phases: "Preparing export..." → "Exporting video" (or "Exporting to shareable link" then "Uploading video") → "Export completed" / "Export cancelled". Estimates derive from resolution and duration; quality does not change them (237). Guide: 4K ≈ 4× HD time; GIF slower.
- **Constraints and edge cases:** "Waiting for previous export to finish" and "Cannot start export, there is already an export in progress" when another export runs. Debug aids exist behind `enableExportDebugWindow` ("Debug exports").
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed for strings; Guide for timing rules.

### 248. Cancel export
- **Where:** Progress window "Stop export".
- **Purpose:** Abort a long render.
- **Controls and options:** Confirmation "Are you sure you want to stop current export?" with "Don't stop export" / stop.
- **Behaviour:** On confirm the encoder is finalised and partial output discarded; status "Export cancelled" / "Export was cancelled" and the app returns to idle ("Set to idle after cancellation."). If the export finishes while the confirmation is open, the build logs "Seems export finished while waiting for cancel confirmation" and the result is kept.
- **Constraints and edge cases:** "Cannot cancel export, there is no export in progress". Cancelling a link export after upload began: Not documented. Partial files for clipboard/file targets are not left behind (Inferred).
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed for strings; Inferred for cleanup.

### 249. Copy and zip whole project
- **Where:** File menu / command "Copy and zip project" (id `copy-and-zip-project`).
- **Purpose:** Package the `.screenstudio` bundle (a folder) into one zip on the clipboard for sending to a colleague or support.
- **Controls and options:** Single action; no options.
- **Behaviour:** Zips the project bundle to a temporary file and puts it on the pasteboard; toast "Copied project to clipboard". Paste into Finder, Mail, Slack or WeTransfer (guide recommends WeTransfer for support).
- **Constraints and edge cases:** "Failed to copy project to clipboard" / "Failed to copy zipped project file to clipboard" on error. Size equals the raw recordings plus assets, so large projects are slow (no limit documented). Unsaved changes are included only if saved first (Inferred; autosave every 30 s, `autoSaveProject` True).
- **Stored as:** Runtime only (temp zip).
- **Confidence:** Build-confirmed for strings; Guide for sharing advice; Inferred for save timing.

### 250. Open shared projects
- **Where:** File > "Open project..." (and "Open recent", "Open last project"); drag-and-drop ("Drop Screen Studio file here"); Dock icon recent list.
- **Purpose:** Open a `.screenstudio` bundle received from someone else or restored from backup.
- **Controls and options:** File picker filtered to the bundle; projects folder default `projectsFolderPath` = `/Users/subhamdas/Screen Studio Projects`.
- **Behaviour:** The bundle is validated ("Reading project file") and opened in the editor; the sender's settings, timeline and transcript come with it. Unzip first if it arrived from 249.
- **Constraints and edge cases:** "File extension must be .screenstudio"; "Folder doesn't contain any Screen Studio project files."; "Project file was not found. It might have been moved or deleted"; "Failed to open project". Projects from newer app versions may need migration ("There is migration requestested after updating from version "). Exporting still requires your own licence.
- **Stored as:** Recent documents list in app preferences.
- **Confidence:** Build-confirmed for strings; Guide for the zip-and-send workflow.

### 251. Extract raw recording files
- **Where:** Export menu / command "Extract raw recording files..." → folder picker "Select folder to extract raw recording files" → "Extract".
- **Purpose:** Get the untouched captures for use in another editor.
- **Controls and options:** Destination folder only.
- **Behaviour:** Copies the session's source files: screen video (`channel-1-display-0.mp4`), `cursors.json` plus cursor images, `mousemoves-0.json`, `mouseclicks-0.json`, `keystrokes-0.json`, `metadata.json`, and camera, microphone and system-audio files when recorded (guide/bundle).
- **Constraints and edge cases:** Screen video is captured at 0.5 scale on Retina displays (inventory), so raw frames are smaller than the rendered export. No effects, zooms or masks are applied; blurred sensitive data is still present in the raw files (privacy page). Projects created from an existing video contain only that video.
- **Stored as:** Runtime only (copies files out of the bundle).
- **Confidence:** Build-confirmed for labels; Guide for folder contents; Inventory for the capture scale.


## Part 5 — Settings, Account, 4.1.0 features

### 252. Start at login
- **Where:** Settings > General, "Start Screen Studio at login" (menu label "Autorun").
- **Purpose:** Launch the app at macOS login so the menu-bar icon and global shortcut are always available.
- **Controls and options:** Toggle; tooltip "Automatically start Screen Studio when starting your computer."; preference `startAtStartup`, current False.
- **Behaviour:** Registers/unregisters the app as a macOS login item. Combined with "Hide Dock Icon" (253) it runs as a menu-bar-only utility.
- **Constraints and edge cases:** macOS may show the app under System Settings > General > Login Items (Inferred). Not documented: behaviour when the app is moved after registration.
- **Stored as:** app preference `startAtStartup`.
- **Confidence:** Build-confirmed label and key; login-item mechanism Inferred.

### 253. Hide dock icon
- **Where:** Settings > General, "Hide Dock Icon" / "Show Screen Studio in Dock".
- **Purpose:** Keep the Dock clean when the app is idle.
- **Controls and options:** Toggle; tooltip "Will hide the Dock icon when there are no opened projects and no recordings in progress. You can still access Screen Studio from the menu bar "; preference `hideDockIcon`, current False.
- **Behaviour:** Icon hides only when no project window is open and no recording runs; reappears when a project opens. The menu-bar icon remains the entry point.
- **Constraints and edge cases:** Separate from "Hide Screen Studio dock icon while recording" (30). The Dock right-click recent-projects list is unavailable while hidden (Inferred).
- **Stored as:** app preference `hideDockIcon`.
- **Confidence:** Build-confirmed.

### 254. Show recording widget
- **Where:** Settings > General, "Show recording widget".
- **Purpose:** Master switch for the floating recording controls described in feature 32.
- **Controls and options:** Toggle; preference `showRecordingWidget`, current True; log "Show recording widget changed".
- **Behaviour:** Off: no widget appears during recording; stop via menu-bar icon, global shortcut or Dock. On: widget with elapsed time, finish, pause, restart and cancel, and later the Quick Export overlay.
- **Constraints and edge cases:** Per-session hide via right-click "Hide current recording control" (Guide) does not change the preference.
- **Stored as:** app preference `showRecordingWidget`.
- **Confidence:** Build-confirmed.

### 255. Projects folder
- **Where:** Settings > General, "Save new projects to" ("Projects Path"); "Select a folder to save your projects" / "Select folder".
- **Purpose:** Choose where `.screenstudio` bundles are written.
- **Controls and options:** Folder picker; current `projectsFolderPath = /Users/subhamdas/Screen Studio Projects` (default `~/Screen Studio Projects`). Related `presetsFolderPath` (`~/Documents/Screen Studio Presets`).
- **Behaviour:** New recordings and "Save as…" default to this folder; "Show previous projects" lists its contents ("No projects found in the folder", "Folder doesn't contain any Screen Studio project files."). Disk-space checks (39) target this path.
- **Constraints and edge cases:** "Screen Studio project folder might be inaccessible"; warning "Projects folder path is outside of the main storage. Type: " for external/network volumes; macOS Files and Folders permission may be needed (Guide for presets).
- **Stored as:** app preference `projectsFolderPath`.
- **Confidence:** Build-confirmed.

### 256. Analytics opt-out
- **Where:** Settings > Advanced ("Analytics" / "Usage data"); also onboarding terms step.
- **Purpose:** Control whether anonymous usage events are sent (PostHog) and errors reported (Sentry).
- **Controls and options:** Toggle under "Usage data"; default: privacy page says analytics is opt-in. Current stored value: no key found among the 55 preferences (Not documented).
- **Behaviour:** When off, events are skipped ("Skipping item because canTrack is false"). Error reporting still notes "If you are online - error will be automatically reported."
- **Constraints and edge cases:** Diagnostics (257) and feedback (258) are explicit sends, unaffected by this toggle.
- **Stored as:** Not documented.
- **Confidence:** Build-confirmed labels and log; opt-in default Guide (privacy policy).

### 257. Diagnostics email
- **Where:** Settings > Advanced, "Diagnostic Email" field and "Share diagnostics info" button; "Reset diagnostic email address".
- **Purpose:** Attach a contact address to diagnostic reports sent to support.
- **Controls and options:** Email field ("Please enter your email address for contact purposes with the support team", validation "Invalid email address"); button tooltip "Click this button to send diagnostic information about your system, hardware," (continues).
- **Behaviour:** "Share diagnostics information" sends app version, macOS version, Mac specs, camera and mic names (Guide) to team@screen.studio; toast "Diagnostics information successfully sent to the support team" or "Failed to send diagnostics information to the support team".
- **Constraints and edge cases:** Needs internet. Reset clears the stored address.
- **Stored as:** app preference (key Not documented).
- **Confidence:** Build-confirmed labels; report contents Guide.

### 258. Send feedback
- **Where:** Help / command menu "Send feedback" ("Screen Studio Feedback", "Create email to support team", "Contact Support").
- **Purpose:** Open a feedback channel to the team.
- **Controls and options:** Single action; a Sentry user-feedback hook also exists ("SDK not enabled, will not capture user feedback.").
- **Behaviour:** Opens a feedback window or pre-addressed email to support (which one is used in 3.7.3: Not documented).
- **Constraints and edge cases:** None documented.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed labels; delivery path Inferred.

### 259. Automatic update checks
- **Where:** Settings > General "App updates" / "Version Updates"; command "Check for updates…"; "Refresh updates status".
- **Purpose:** Keep the app current within the licence's update window.
- **Controls and options:** Automatic periodic check ("Screen Studio will automatically check for updates periodically."); manual check; dev "Force updates" (`devForceUpdates`, current False).
- **Behaviour:** States: "Checking for updates" → "You are using the latest version of Screen Studio" or "A new version of Screen Studio is available." → "A new version of Screen Studio is being downloaded." → "A new version of Screen Studio is ready to be installed." (see 260). Current build 3.7.3 (4475) is offered 4.1.0 (5005).
- **Constraints and edge cases:** "Check for updates timed out", "Can't check for updates", "App updater encountered an error". "You need to activate your license key to check get updates", "You need a valid license or subscription to get updates". "Can't update while app is on a read-only volume. Move app to an application folder and try again." Architecture notice: "This version isn't optimized for your Mac. Please download the " ("App Compatibility Notice").
- **Stored as:** app state `check-for-update`.
- **Confidence:** Build-confirmed.

### 260. Install update now or next launch
- **Where:** Update dialog ("App Update" / "Update Available").
- **Purpose:** Let the user pick when the downloaded update is applied.
- **Controls and options:** "Install now" ("Install the new version of Screen Studio now."), "Install on next launch" ("New version will be installed when you restart Screen Studio."), "Download the latest version" ("Download the new version of Screen Studio now."), "Update now", "Install update".
- **Behaviour:** Install now quits and relaunches into the new version; next-launch defers. "Update downloaded" / "Update ready to install" toasts.
- **Constraints and edge cases:** "Failed to install the new version now", "Failed to install update", "Failed to download the latest version"; fallback text "If you are experiencing issues updating, please download the latest version from" / "Please try again later or manually download the latest version from our website."
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed.

### 261. Keep current version or downgrade
- **Where:** Update dialog when the licence does not cover the new version.
- **Purpose:** Handle expired one-year update windows without breaking the installed app.
- **Controls and options:** "Keep using the current version" ("You can keep using the version you have installed."), "Restore last supported version", "Renew license" / "Open renew license page", "Refresh updates status" ("If you have already extended your license, please refresh the updates status.").
- **Behaviour:** Message "A new version of Screen Studio is available. Your year of updates ended " + date, or "Available update requires license renewal" / "Your license doesn't cover this version of Screen Studio". "The latest version of Screen Studio you can download is " names the last permitted build; choosing it downgrades.
- **Constraints and edge cases:** "Failed to downgrade to the latest available version". Subscriptions always cover the current version (Guide).
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed.

### 262. Beta channel
- **Where:** Settings > General/Advanced, "Beta" option (exact section Not documented).
- **Purpose:** Receive pre-release builds (website beta: 4.2.1-5069-beta).
- **Controls and options:** Toggle; preference key Not documented.
- **Behaviour:** Update checks include beta builds; beta DMGs exist for Apple Silicon and Intel (Guide).
- **Constraints and edge cases:** "Access to Screen Studio Beta requires an active license.", "You can't use Screen Studio Beta", "You can't use Screen Studio Beta with expired license", "You cannot download beta updates with an expired license", "Your license has expired. Access to Screen Studio Beta requires an active license."
- **Stored as:** Not documented.
- **Confidence:** Build-confirmed strings; channel mechanics Inferred; beta version Guide.

### 263. Changelog view
- **Where:** Help / command menu "Open changelog page"; post-update prompt "What's new in this version?" / "See what's new in Screen Studio".
- **Purpose:** Show release notes.
- **Controls and options:** Links only ("See what changed in the latest version of Screen Studio.", "Check out our changelog to see what's new.").
- **Behaviour:** Opens the website changelog in the browser (page is client-rendered; entries not retrievable offline).
- **Constraints and edge cases:** Needs internet.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed labels.

### 264. Skip certificate validation
- **Where:** Settings > Advanced, "Skip network certificate validation".
- **Purpose:** Work around corporate proxies/SSL inspection that break activation and uploads.
- **Controls and options:** Toggle; preference `bypasNetworkCertificateValidation` (sic), current False. Companion experimental toggle "Enhanced shareable links upload settings" (`useExperimentalUploadFeatures`, False; tooltip "Using this feature should solves problems with uploading shareable links like 'Host not found' errors (ENOTFOUND) and SSL certificate issues.").
- **Behaviour:** Disables TLS certificate checks for app network calls ("Accepting certificate for").
- **Constraints and edge cases:** Security trade-off; guide recommends it only for account-access issues.
- **Stored as:** app preference `bypasNetworkCertificateValidation`.
- **Confidence:** Build-confirmed.

### 265. Log level
- **Where:** Settings > Advanced (developer area), "Log level" submenu; command "Set log level".
- **Purpose:** Control verbosity of app logs for diagnostics.
- **Controls and options:** Submenu of levels (names Not documented); preference `logLevel`, current 2.
- **Behaviour:** Affects what is written to the log files in the app data folder (270) and included in diagnostics.
- **Constraints and edge cases:** Not documented.
- **Stored as:** app preference `logLevel`.
- **Confidence:** Build-confirmed key and label.

### 266. Debug windows
- **Where:** Settings > Advanced / "Developer Tools" menu.
- **Purpose:** Developer diagnostics for export, video pipeline and the share widget.
- **Controls and options:** "Debug exports" (`enableExportDebugWindow`), "Debug video frame info" (`enableVideoDebugInfo`), "Debug webcodecs in preview" (`enableDebugWebcodecsInPreview`), "Debug share widget" (`debugShareWidget`); all currently False. Also `devMode` (False), "Show test toast", "Debug cut project", "Toggle debug device frames".
- **Behaviour:** Each opens an extra window or overlay with internal state.
- **Constraints and edge cases:** Intended for support; no user-facing effect otherwise.
- **Stored as:** app preferences named above.
- **Confidence:** Build-confirmed.

### 267. Reset onboarding
- **Where:** Settings > Advanced, "Reset onboarding flags" ("Show onboarding window", "Reset ignored windows", "Reset terms").
- **Purpose:** Re-run first-launch steps (permissions, terms, new/returning user).
- **Controls and options:** Action buttons.
- **Behaviour:** Clears onboarding state so the "Welcome to Screen Studio!" flow with "Have you used Screen Studio before?" appears again ("Onboarding completed" resets).
- **Constraints and edge cases:** "Reset terms" forces re-acceptance ("You must accept the terms and conditions to continue.").
- **Stored as:** onboarding flags in app state (key Not documented).
- **Confidence:** Build-confirmed labels.

### 268. Reset window positions
- **Where:** Settings > Advanced, "Reset windows positions".
- **Purpose:** Recover windows that are off-screen after display changes.
- **Controls and options:** Action button.
- **Behaviour:** Clears saved window bounds so editor, settings and speaker-notes windows reopen at defaults.
- **Constraints and edge cases:** None documented.
- **Stored as:** app state "window bounds".
- **Confidence:** Build-confirmed label; stored-state name from inventory.

### 269. Reset preferences
- **Where:** Settings > Advanced, "Reset preferences".
- **Purpose:** Restore every app preference to default.
- **Controls and options:** Confirmation "Are you sure you want to reset all preferences? This will include all your recording preferences."
- **Behaviour:** Rewrites `settings-persistance.json` with defaults (e.g. `recordingUseScreenCaptureKit = auto`, `recordingCountdownDuration = null`).
- **Constraints and edge cases:** Whether auth/licence state survives: Not documented.
- **Stored as:** app preferences file.
- **Confidence:** Build-confirmed.

### 270. Open app data folder
- **Where:** Settings > Advanced / command "Open app data folder".
- **Purpose:** Reveal Application Support data (preferences, logs, unfinished recordings) in Finder.
- **Controls and options:** Action.
- **Behaviour:** Opens the folder in Finder.
- **Constraints and edge cases:** None documented.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed label.

### 271. Open audio library folder
- **Where:** Editor Audio panel / command "Open audio library folder".
- **Purpose:** Add your own background-music files to the picker.
- **Controls and options:** Action; empty-state "Add background audio tracks to your library folder to access them here".
- **Behaviour:** Opens the user library folder; mp3/mp4 files dropped there appear alongside the 17 bundled tracks.
- **Constraints and edge cases:** Folder location Not documented.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed label; file types Guide.

### 272. Permissions onboarding
- **Where:** First launch ("Welcome to Screen Studio!") and whenever a permission is missing.
- **Purpose:** Obtain Screen Recording, Accessibility, Camera and Microphone access.
- **Controls and options:** Intro "Before you can start recording, we need to ask you for a few permissions."; cards "Screen Recording Permission" / "Allow Screen Recording", "Accessibility Permission" / "Allow Accessibility access"; "Open System Settings"; status "Screen Recording enabled", "Accessibility access enabled", "Permission refreshed".
- **Behaviour:** Allow opens the macOS pane; the app polls and updates status. Missing permissions block starting a recording ("Screen Studio does not have permission to record your screen", "… use your camera", "… use your microphone"; "Please check your system privacy settings.").
- **Constraints and edge cases:** Device recording asks for camera permission separately ("Screen Studio will ask for camera recording permission").
- **Stored as:** macOS TCC; onboarding flag in app state.
- **Confidence:** Build-confirmed.

### 273. Activate with license key
- **Where:** Menu bar Screen Studio > "Activate Screen Studio" > "Use license key instead" ("Enter license key", field "License key…").
- **Purpose:** Activate legacy one-time licences.
- **Controls and options:** 36-character key ("License key must be 36 characters long"); note "Only for one-time purchases. If you purchased a subscription, please sign in with your email." and "If you already have a license key, enter it here."
- **Behaviour:** "Verifying license key…" → "Screen Studio has been activated" / "Screen Studio is active".
- **Constraints and edge cases:** "License key is invalid", "Activation Error", "Something went wrong while activating Screen Studio. ", "Cannot connect to Screen Studio servers. Please check your internet connection and try again."
- **Stored as:** app state `license` / `auth`.
- **Confidence:** Build-confirmed; "legacy only" Guide.

### 274. Activate with email code
- **Where:** "Activate Screen Studio" default path: "Enter your email address".
- **Purpose:** Sign in subscribers without a key.
- **Controls and options:** Email field ("Please enter your email address to login.", "You can use the email address associated with your license key or subscription."); "Confirm verification code" (6 digits: "Code must be 6 digits long"); "Send code again"; "Use different email address".
- **Behaviour:** "Verification code sent" → user enters code → "Verifying account…" → activated.
- **Constraints and edge cases:** "Seems like there is still no customer with this email address.", "No active subscriptions or license keys found", "No active plan found", "Please enter a valid email address".
- **Stored as:** app state `auth`.
- **Confidence:** Build-confirmed.

### 275. Activate with SSO
- **Where:** Activation window "Activate with SSO" / "Use SSO".
- **Purpose:** Enterprise sign-in through the team's identity provider.
- **Controls and options:** Button; note "Available for enterprise teams with enabled SSO."; team picker "Pick a team" when "Multiple teams use SSO for your email. Choose the one you want to sign in to."
- **Behaviour:** Opens the browser SSO flow and returns to the app.
- **Constraints and edge cases:** "Failed to start SSO", "Unexpected SSO result: ".
- **Stored as:** app state `auth`.
- **Confidence:** Build-confirmed.

### 276. Choose product/team
- **Where:** After sign-in when several entitlements exist.
- **Purpose:** Pick which licence/plan this device uses.
- **Controls and options:** "Select a product" list ("Multiple products are linked to your account. Choose the one you'd like to use."); "Pick license key"; SSO team picker (275).
- **Behaviour:** Selection binds the device to that product; changeable via sign-out (278).
- **Constraints and edge cases:** "Failed to pick license key", "Failed to pick authorization type".
- **Stored as:** app state `license`.
- **Confidence:** Build-confirmed.

### 277. Deactivate this device
- **Where:** Account view "Deactivate Screen Studio on this device" / "Deactivate current license key on this device"; dashboard "Disconnect device" (Guide).
- **Purpose:** Free a device seat.
- **Controls and options:** Confirmation "Deactivate your device" — "Screen Studio will no longer be activated on this device."
- **Behaviour:** Server releases the seat; app returns to trial ("Device deactivated", "App deactivated successfully").
- **Constraints and edge cases:** "Can't deactivate device", "An error occurred while deactivating the device. Please try again."
- **Stored as:** app state cleared.
- **Confidence:** Build-confirmed; dashboard route Guide.

### 278. Sign out and use another license
- **Where:** Account view "Sign out and use another license" / "Use different license".
- **Purpose:** Switch between multiple keys or accounts.
- **Controls and options:** Note "If you have multiple license keys, you can disconnect your current license key to use a different one" and "You can sign out and use another license key to activate Screen Studio."; dev "Clear authorization data".
- **Behaviour:** Logs out (`auth.logout`) and reopens activation.
- **Constraints and edge cases:** Terms are re-synced after auth changes ("Syncing terms after auth changed").
- **Stored as:** app state `auth`.
- **Confidence:** Build-confirmed.

### 279. Expired and refunded handling
- **Where:** Account view and update dialogs.
- **Purpose:** Explain state and offer renewal/purchase.
- **Controls and options:** Labels "Expired license", "Your license has expired", "Expired on ", "Refunded license", "License has been refunded", "Your license has been refunded."; actions "Get a new license", "Renew your license", "Open purchase page".
- **Behaviour:** Expired one-time licences keep working on covered versions but lose updates, beta and shareable links; refunded/revoked licences return to trial ("You either don't have a license key or the one you have is expired, refunded or revoked." / "Please get a new one to start using.").
- **Constraints and edge cases:** "If you have already extended your license, refresh sharable links access status."
- **Stored as:** app state `license`.
- **Confidence:** Build-confirmed strings; update-window policy Guide.

### 280. Discounted renewal
- **Where:** Account view renewal card.
- **Purpose:** Extend a one-time licence for another year of updates at a reduced price.
- **Controls and options:** Text "You can extend your license at a discounted price to get the latest updates and features." and "Includes all Screen Studio features and one year of updates."; "Renew license" opens the renew page; "Thank you for supporting us!" on success.
- **Behaviour:** Purchase happens on the website (Lemon Squeezy); app refreshes status ("Refresh updates status").
- **Constraints and edge cases:** Price not stated in the bundle; website now sells subscriptions only (Guide, unverified).
- **Stored as:** server-side.
- **Confidence:** Build-confirmed strings; pricing Guide.

### 281. Trial mode
- **Where:** Default state before activation.
- **Purpose:** Full evaluation without export.
- **Controls and options:** Banner "Feel free to play with all Screen Studio features, except video export." and "You only need to activate Screen Studio when exporting recordings to video files."; "Get Screen Studio" / "Purchase Screen Studio".
- **Behaviour:** Recording and editing work; export, quick export and shareable links prompt "To continue, please activate your license of Screen Studio."
- **Constraints and edge cases:** No time limit documented.
- **Stored as:** absence of `license`.
- **Confidence:** Build-confirmed.

### 282. Dashboard, subscription and orders pages
- **Where:** Screen Studio menu: "Open account dashboard" ("Manage your devices, licenses, invoices and more"), "Manage subscription", "Open my orders page", "Manage shareable links".
- **Purpose:** Web management of devices, billing and links.
- **Controls and options:** Links to screen.studio/dashboard and app.lemonsqueezy.com/my-orders (Guide).
- **Behaviour:** Opens the browser; dashboard devices tab allows "Disconnect device".
- **Constraints and edge cases:** Needs internet and the same account.
- **Stored as:** runtime only.
- **Confidence:** Build-confirmed labels; URLs Guide.

### 283. Loupe zoom
- **Where:** 4.1.0 (read from the pending update bundle). Zoom settings panel → "Zoom style" with two thumbnails, "Classic" and "Glass Loupe"; command menu "Toggle zoom loupe mode" (shortcut L, icon plus.magnifyingglass); context menu "Change zoom to classic zoom" / "Change zoom to loupe zoom" (group Presentation, with hover preview); when placing a manual zoom the stage says "Click where to place the loupe" instead of "Click where to zoom in". Loupe zooms are labelled "Glass Loupe zoom" on the timeline.
- **Purpose:** Present a zoom as a round magnifying glass laid over the unzoomed screen instead of zooming the whole frame.
- **Controls and options:** Per zoom `presentation`: `screen` (Classic, default) or `loupe`. "Glass Loupe size" slider 25–75 % (`loupeOptions.radius01`, default 0.35). "Zoom level" 1–4 (default 2 in this build; keys 1–9 pick preset levels, 0 restores the default). The rest of `loupeOptions` has defaults but no slider: `bevelRatio` 0.2, `chromaticAberration` 0.5, `hasGlassOptics` true. "Instant animation" is hidden for loupe zooms.
- **Behaviour:** A loupe zoom keeps auto (follow click groups), follow-mouse or manual targeting like a classic zoom, and renders a glass disc with bevel, rim reflection, chromatic fringe and an outer shadow (shader stages named in the bundle: loupe steady state, screen-to-loupe presentation switch). The style of the last edited zoom (zoom, presentation, loupe options, instant flag) is reused for new zooms.
- **Constraints and edge cases:** Not in 3.7.3; the only "Loupe" strings there are wallpaper names. The render planner treats "jump to 4× under loupe" as its worst case, so 4× loupe zooms are the most expensive to preview.
- **Stored as:** `scenes[].zooms[].presentation`, `scenes[].zooms[].loupeOptions { radius01, bevelRatio, chromaticAberration, hasGlassOptics }`.
- **Confidence:** Build-confirmed (4.1.0-5005 bundle).

### 284. Screen super-resolution ("Clarity upscaler")
- **Where:** 4.1.0. No panel or switch. It is an automatic render pass labelled "Screen super-resolution" that runs on the screen footage when it is drawn larger than its source pixels.
- **Purpose:** Keep zoomed-in screen content sharp instead of blurry when a zoom or loupe magnifies the recording.
- **Controls and options:** None exposed. Strength is computed per frame: 0 until the screen is drawn at more than 1.02 device pixels per footage pixel, full at 1.2×; reduced by motion (full strength when pixels move 4 device px per frame or less, zero at 8 px for the stage pass and 28 px for the blur pass); faded by loupe presence; skipped entirely when strength is below 0.2 (`SUPERRESOLUTION_MIN_MIX01`) or when the preview quality mode does not allow it.
- **Behaviour:** The pass picks a neural network for the required scale from the bundled Anime4K v3.2 "Upscale-CNN x2" shaders (S and M variants) and upsamples only the visible region with an 8 px clamp margin; the result is mixed with the plain footage by the strength value. Export uses the same pass.
- **Constraints and edge cases:** Logged failures fall back to the plain video: "The super-resolution pass failed; frames show the plain video", "anime4k: an empty region has nothing to upscale", "Super-resolution of a small image failed; it shows at its own size". A debug tint (`DEBUG_SHOW_SUPERRESOLUTION_TINT`) is compiled in but off.
- **Stored as:** Runtime only.
- **Confidence:** Build-confirmed (4.1.0 bundle). "Clarity" is the website's name for it; the bundle never uses that word.

### 285. Camera cutout
- **Where:** 4.1.0. Camera panel → "Default layout" picker (allowed types: Camera overlay, Split screen, Camera cutout); Layouts track → "Add camera cutout layout"; command "Set camera layout mode to camera cutout". Layout types in this build are Camera overlay, Split screen, Camera cutout, Fullscreen camera and Hide camera (five, versus three in 3.7.3).
- **Purpose:** Remove the webcam background so only the presenter is composited over the screen recording.
- **Controls and options:** Cutout layout settings: "Camera Position" with three slots along the bottom edge (`cutoutCameraPositionX01` 0, 0.5 or 1; default 1, bottom right); "Camera Size" 20–100 % (`cutoutCameraSizeRatio01`); "Camera size during zoom" section with "Make smaller during zoom" (sets `cutoutCameraZoomedScale` to 0.8; off = 1; description "When zooming in, the camera will shrink to avoid covering the recording itself.") and "Size during zoom" 25–100 %; "Edge softness" 0–100 % (`camera.background.edgeFalloff01`) and "Edge inset" 0–8 px in 0.1 px steps (`edgeInsetPx`), both badged "The cutout's edge is shared by every cutout layout in the project." "Avoid empty area" (`stageConfig.avoidEmptyZoomArea`, "Will try to avoid showing too much empty space around the recording.") appears for overlay and cutout layouts when a zoom leaves uncovered area.
- **Behaviour:** Person matting runs on device with bundled CoreML models (pp-mattingv2-ss8, ss9 and ss10 "refined"; ss9 is the shipped default, switchable by the developer command "Camera matte model", which reloads the editor). A project task "Preparing camera cutout" computes and caches mattes per frame; export waits for it: "Wait for project tasks to finish (audio, camera cutout, transcripts, …), then try again." Adding a camera layout when the webcam is hidden asks "Enable webcam — Webcam is disabled in your project, do you want to enable it?".
- **Constraints and edge cases:** Needs a webcam track. The matte models and the native helper ship only in `bin/arm64`, so Apple silicon is required; the app checks "Camera matte support" and logs "could not ask the native client whether the camera matte runs — no cutout" when the helper is unavailable.
- **Stored as:** `defaultLayoutConfig.type = "cutout-camera"` or `scenes[].layouts[].type`, with `cutoutCamera { cutoutCameraPositionX01, cutoutCameraSizeRatio01, cutoutCameraZoomedScale }`; `camera.background { edgeFalloff01, edgeInsetPx }`.
- **Confidence:** Build-confirmed (4.1.0 bundle). The 3.7.3 face-detector binary is unrelated to this feature.

### 286. Hide camera during silence
- **Where:** 4.1.0. Camera panel → Camera Layout settings → toggle "Hide during silence" (icon person.wave.2.fill, description "Hide the camera during silence."). When on, a "Minimum silence duration" slider appears beneath it.
- **Purpose:** Automatically drop the webcam overlay while the presenter is not speaking, so the screen is unobstructed.
- **Controls and options:** Toggle off = `null`; turning it on sets 5000 ms. Slider 2.0 s to 15.0 s (`hideDuringSilenceMs` 2000–15000, shown with one decimal, reset value 5000).
- **Behaviour:** Speech ranges are detected from the microphone track (`media.speechRanges`, with a level threshold below speech in dB); any silence longer than the minimum hides the camera for that span, with the normal layout animation in and out. The same detector auto-mutes a microphone track that contains no speech at all; if the check fails the app logs "Could not check the microphone for speech, so it stays unmuted".
- **Constraints and edge cases:** Needs a microphone track; with the microphone muted the camera never hides. Works with overlay, split and cutout layouts; a manual hide-camera layout still wins.
- **Stored as:** `camera.hideDuringSilenceMs` (number or `null`).
- **Confidence:** Build-confirmed (4.1.0 bundle).

### 287. Camera looks, color presets and sharpen
- **Where:** 4.1.0. Camera panel → "Color grading" (thumbnail strip rendered on the webcam frame), "Color grading intensity", "Disable color grading", "Sharpen"; the "+" menu offers "Create your color preset..." (opens the "Color preset studio" window) and "Load your LUT file..." (file picker "Choose a 3D LUT (.cube) file"); right-click a user preset → "Move to Trash".
- **Purpose:** Colour-grade and sharpen the webcam track without external tools.
- **Controls and options:** Looks: "Original" plus twelve built-in looks: Studio (the "make it look finished" default), Cinema (teal-shadow blockbuster grade), Film (35 mm 2383 print emulation), Golden (golden-hour glow), Cream (soft pastel portrait film), Terra (earthy editorial), Moody (dark, desaturated, warm skin), Arctic (bright winter daylight), Neon (for RGB-lit rooms), Punch (vivid commercial pop), Fade (sun-bleached nostalgia), Mono (warm black and white). "Color grading intensity" 0–100 % (`lutIntensity`, default 100 %). "Sharpen" 0–100 % (`sharpen01`, default 0 shown as "Off"). Color preset studio: Preset name (placeholder "My preset"), Warmth −1 to 1 (default 0), Background pop 0–1 (default 0.2), Contrast −1 to 1 (default 0.25), Color intensity −1 to 1 (default 0.15), "Create preset" / "Cancel". Same panel in 4.1.0 also adds "Face tracking" (`enableFaceTracking`, "Screen Studio will adjust the camera picture to center it on your face. Done locally, no data is sent to the server.") and, under Advanced, "Camera delay" −200 to +200 ms in 5 ms steps (`delayAdjustmentMs`, "If your lips look out of sync with your voice, raise it when they move after the words, lower it when they move before.").
- **Behaviour:** A look is a 3D LUT applied on the GPU, mixed by the intensity value; user `.cube` files are added to a LUT library (`luts.addToLibrary`) and copied into the project. "Create preset" renders the studio sliders into a `.cube` file with the comment "Custom color preset created in Screen Studio." and writes it to the library ("Camera LUT preset created"). Changes are tracked as "Camera LUT changed", "Camera sharpen changed".
- **Constraints and edge cases:** "No camera video in the project — the preset studio previews the color swatch." "Failed to create the color preset", "Failed to fetch LUT", "Failed to parse LUT", "a LUT needs at least 2 texels per edge". LUTs are display-referred ("expects and outputs standard sRGB"). A `grain` field exists in the camera schema with default 0 but no slider was found.
- **Stored as:** `camera.lut` (built-in look id or project-relative `.cube` path), `camera.lutIntensity`, `camera.sharpen01`, `camera.enableFaceTracking`, `camera.delayAdjustmentMs`, `camera.grain`.
- **Confidence:** Build-confirmed (4.1.0 bundle). The macOS "Background, Portrait, Studio Light" effects mentioned in the guide are Apple's, not these.

### 288. Reactions
- **Where:** Not a Screen Studio feature in either build. Neither the installed 3.7.3 bundle nor the 4.1.0 update bundle contains any reaction UI strings; the only matches are MobX internals ("Error disposing reaction").
- **Purpose:** The inventory entry came from the website. The guide's "Reactions" page is about macOS Reactions (hearts, confetti, thumbs-up triggered by hand gestures), which macOS draws into any webcam feed and which therefore appear in Screen Studio recordings.
- **Controls and options:** None in the app. In macOS: Control Center or menu bar → green camera icon → Reactions → off.
- **Behaviour:** With macOS Reactions on, a gesture during recording bakes the effect into the webcam video; Screen Studio cannot remove it afterwards.
- **Constraints and edge cases:** Applies on macOS Sonoma 14 and later with a supported Mac. Nothing is recorded in the project file.
- **Stored as:** n/a.
- **Confidence:** Build-confirmed that the app has no such feature (both bundles searched). The macOS behaviour is from the guide and Apple's documentation.

### 289. Edit by transcript
- **Where:** 4.1.0. Captions sidebar → "Edit by transcript" section. Without a transcript it shows "Edit your video by editing its text: delete words to cut them out, remove filler words and long pauses in one click.", "Generate a transcript first to get started." and a "Generate transcript" button. With one, a text editor opens with the hint "Type to correct the text — ⌫ cuts words out of the video, ⌘⌫ cuts them from the transcript only." and a "Close Transcript editor" button.
- **Purpose:** Cut the video by deleting its words, and fix the transcript text, in one place.
- **Controls and options:** Select words, then: "Cut video" (⌫), "Cut transcript" (⌘⌫; "Cut this part from the transcript and captions only — the video is unchanged, and Restore brings it back"), "Restore" ("Bring this part back into the video and captions"), "Play" ("Play this part once"). Typing replaces the selected text; edits commit 800 ms after the last keystroke ("Transcript word corrected"). Toggles "Show deleted text" ("Keep cut words visible as strikethrough so they can be restored.") and "Show hidden words" ("Keep words hidden from captions visible here so they can be restored."). Transcript engines in this build: "Transcript method" Local (Apple speech recognition, macOS 26 or later, "No data will be sent to the server.") or Cloud ("Screen Studio will send project audio to the cloud to generate transcript. After generation, all audio data will be deleted from the server."); Whisper (Base 142 MB, Small 466 MB "2.5 times slower than Base", Medium 1.5 GB "8 times slower than Base… Requires 5GB of RAM") and Deepgram remain in the code but are not offered in the picker. "Export transcript" saves an `.srt` ("Where to save the transcript?").
- **Behaviour:** The transcript is a token stream (words, gaps, sound labels) mapped to source milliseconds. Cutting words removes the matching range from the clip, exactly like a timeline cut, and the token is drawn struck through; cutting from the transcript only hides the words from captions. Both are undoable ("Transcript tokens deleted" / "Transcript tokens restored", "Transcript words hidden" / "Transcript words unhidden"). Hovering a token previews the cut.
- **Constraints and edge cases:** "Can't delete the entire video." Re-generating replaces the transcript and all edits ("When re-generating transcript, previous transcript (and all changes you made to it) will be lost."). Transcript generation runs as a project task; "Transcript is being generated. You can still edit your project while it's being generated." Export waits for transcript tasks.
- **Stored as:** Transcript tokens per recording session (`sessionSources`); cuts as `scenes[].slices`; hidden words as token flags; `captionsConfig.showSoundLabels`.
- **Confidence:** Build-confirmed (4.1.0 bundle).

### 290. Filler-word and pause removal
- **Where:** 4.1.0. Header of the Edit by transcript editor: "Remove N filler words" (icon waveform.badge.minus, tooltip "Cut every detected filled pause ("um", "uh"...) out of the video") and "Tighten N pauses" (icon timeline.selection, tooltip "Shorten every long pause, keeping a natural breath on each side"). Per selection: "Tighten pause" ("Shorten this pause, keeping a natural breath on each side"); pause tokens show "Pause — click to select, then tighten it to a natural breath".
- **Purpose:** Remove "um"/"uh" and shorten long silences in one click each.
- **Controls and options:** Filler detection has two tiers per language, chosen by the first two letters of the transcript language (en, de, fr, es, pt, it, pl, nl; anything else falls back to English). Tier 1 are filled pauses, for example English um, uh, er, ah, hmm, mhmm, mm, mmm, huh, uh-huh, erm, umm, uhh; German äh, ähm, hm, mhm, öh, öhm; French euh, hein, ben, bah; Spanish eh, em, este, mmm. Tier 2 are discourse fillers that are only highlighted, for example English like, you know, so, i mean, kind of, sort of, actually, basically, literally; German halt, also, quasi, sozusagen, naja; French genre, tu vois, en fait, du coup, quoi. Tier marks are drawn on the tokens.
- **Behaviour:** "Remove all" cuts every tier-1 token that is still present ("Transcript fillers removed"). "Tighten" applies to gap tokens that lie inside present clip ranges; each is shortened to a breath on both sides ("Transcript pauses tightened", "Pause tightened to …"). Cloud transcripts arrive without fillers by default; the editor then shows "This transcript was generated without filler words. Regenerate it to detect and remove "um"/"uh"." with a "Regenerate with filler words" button ("Sends the project audio to the cloud; the previous transcript (and edits to its text) will be replaced", task "Generating verbatim transcript").
- **Constraints and edge cases:** Only tier-1 words are removed automatically; tier-2 words must be selected and cut by hand. Regenerating verbatim discards text edits. Exact breath lengths are computed in code and not shown as a setting.
- **Stored as:** Cuts as `scenes[].slices`; transcript tokens with `fillerTier`.
- **Confidence:** Build-confirmed (4.1.0 bundle).

### 291. Podcast audio mode
- **Where:** 4.1.0. Audio panel → Microphone → "Microphone audio mode" segmented control. Shown only when the machine supports more than one preset (`media.supportedMicrophoneAudioPresets`).
- **Purpose:** Process the microphone track with a chosen voice treatment, up to a studio-style "Podcast" enhancement.
- **Controls and options:** Off (`channel-fix`, "Plays your microphone as recorded."), Standard (`voice`, "Adjusts your voice to a consistent volume. Its character stays the same."), Loud (`loud`, "Boosts your voice to a consistent, loud volume."), Noise reduction (`noise-reduction`, "Boosts your voice and reduces background noise and room echo."), Podcast (`podcast`, badge "Beta", "Gives your voice the depth and clarity of a studio recording. Experimental."). This replaces the 3.7.3 "Improve microphone audio" switch (16).
- **Behaviour:** Choosing a mode starts a project task whose progress is drawn on the option: "Preparing audio" (Off and Standard), "Leveling audio" (Loud), "Reducing noise", "Generating podcast audio". Clicking the active option cancels or restarts its task. The processed file replaces the raw microphone audio in preview and export. The bundle ships the models in `bin/arm64`: MossFormer2_SE_48K for speech enhancement and tf-restormer for the podcast pass, run through MLX. Muting the microphone cancels the tasks; a track with no detected speech is auto-muted.
- **Constraints and edge cases:** Apple silicon only (the models and the `screen-studio-speech` helper ship for arm64). Export waits for audio tasks ("Wait for project tasks to finish (audio, camera cutout, transcripts, …), then try again."). Warning when the selfie camera is kept: "Your selfie camera video is still visible, but it will be muted. Consider hiding it in camera settings."
- **Stored as:** `audio.microphoneAudioPreset` (one of the five keys).
- **Confidence:** Build-confirmed (4.1.0 bundle).

### 292. AI and recorded voiceovers
- **Where:** 4.1.0. "Voiceovers track" on the timeline (empty state "Click to add voice over"); track context menu "AI Voiceover..." and "Record Voiceover..."; command "Add AI Voiceover..."; item context menu "Remove voiceover", "Set voiceover volume"; "Remove all voiceovers".
- **Purpose:** Add narration that is either synthesised from text or recorded from the microphone in the editor, and have it play over or instead of the original audio.
- **Controls and options:** AI dialog at the playhead: "Voiceover text" (textarea, placeholder "Enter text to be voiced", "Estimated duration — …"), "Voice" ("Voice to be used for the voiceover": avatar, display name, play/pause sample, "Choose Voice" picker filterable by language, gender and tags; voices come from Speechify via `speech.voices`), "Generate & Add Voiceover" (Enter). Item settings: "Voiceover text — <language>" (editable, 500 characters max) with "Update"; "Voiceover volume" 0–100 % (default 100) with "Apply to other voiceovers"; "Attach to recording": Independent ("Voiceover plays independently of the recording, even if the recording speed is changed or parts of the recording are cut out.") or Synchronized ("Voiceover plays along with the recording. Voiceover automatically adjusts to the recording speed and is cut out if parts of the recording are cut out."); "Hide & Mute original recording" ("When enabled, the original microphone and webcam recording will be hidden and muted while the voiceover is playing."); "Disable" ("When disabled, the voiceover will not be applied, but it will still be present in the timeline."); Remove.
- **Behaviour:** Generated audio is fetched once, cached locally (`screen-studio-cache`) and copied into the project (`speech.generateVoiceoverForProject`); the item is placed at the playhead with the generated duration and can be dragged but not resized. "Record Voiceover..." records the microphone from the playhead and stops automatically when it reaches another voiceover ("Finishing recording because another voiceover is present at the current playback time"); it needs microphone access ("Please allow access to your microphone in order to record your voice."). Synchronized items follow speed changes and cuts; independent ones keep their own clock.
- **Constraints and edge cases:** Both kinds are behind feature flags ("AI voiceover is not enabled", "Recorded voiceover is not enabled"). "Voiceover already present at current playback time" blocks adding on top of another. Text is sent to Speechify (privacy policy). The 3.7.3 editor records human voice-overs only.
- **Stored as:** `scenes[].voiceOvers[] { source { type, language, voiceId, text or file }, sourceStartMs, voiceoverDurationMs, volume, attachMode ("first-frame" or "all-frames"), hideRecording, isDisabled }`.
- **Confidence:** Build-confirmed (4.1.0 bundle); privacy note from the policy.

