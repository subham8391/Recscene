# Features by milestone

Spec numbers refer to `docs/research/screen-studio-feature-specs.md`. A feature is done when its specs' behaviour holds in Recscene and its core logic has unit tests.

## M1 — daily driver
| Area | Specs | Notes |
| --- | --- | --- |
| Recording picker: screen, window, area; countdown; menu bar control | 1–47 | Done: 1–5, 7–13, 15–17, 21–41 (41 as a preference; 8–12 record the webcam to `camera.mov` with a live preview bubble, 12's mirror lives in the editor). Deferred: 6 (device: M2), 14 (editor audio panel), 18–19 (per-app and device audio: M2), 20 (single engine, not applicable), 42–47 (need export) |
| Editor shell: stage, rail, inspector, timeline, playhead, scrubber | 48–79 | Done: 48 (aspect picker; Crop and Mask buttons wait for 100–101 and 189–198), 49 (sections and ⌘1–8; panel contents arrive with their specs), 50–65, 67 (preview size), 72–78. Deferred: 66 (remapping, Settings), 68–70 (renderer settings, with the GPU renderer), 71 (reel mode, with 9:16 export), 79 (seasonal) |
| Automatic zooms from clicks; manual zoom regions; zoom speed and depth | 102–124 | Done: 102–112, 114–124 (113 glide is reserved in the competitor too; 123's motion blur waits for the GPU renderer). Logic in `src/core/editor/zooms.ts` and `camera.ts` |
| Cursor: smoothing, size, click highlight, hide when idle | 125–147 | Done: 126–133, 137–145 (144–145 in the preview; 146–147 stored, applied by the GPU renderer). 125 ships four sets with a pointer only and 134–136 are stored but inert until the helper records cursor types; the 20 custom sets are not drawn |
| Background, padding, rounded corners, shadow, screen inset | 165–188 | Done: 165–184, 188 (wallpapers are 180 generated SVGs in the nine collections, not the reference JPEGs). 185–187 device mockups: toggle stored, no frames bundled yet |
| Clips: trim, cut, speed | 80–101 | Done: 80–84, 86–101 (93 for the microphone; 94–95 wait for per-track system and device audio; 85 as X at the playhead). 83's beam mode is not built: C cuts at the playhead |
| Export MP4 (H.264, 1080p/4K, frame rate) to `~/Movies/Recscene` | 233–245 | Done: 233–237, 240–241, 245, with 247–248 (progress, estimate, cancel). Video is rendered on a canvas and encoded with WebCodecs H.264 into an MP4 stream; audio is mixed offline and joined as AAC by the helper. 238–239 are not needed (the encoder is the platform's); 242–244 shareable links wait for M3 |
| Projects home: open, rename, delete, recover unfinished recording | 7, 40, 75, 255 (Projects board) | Done: the home lists every `.recscene` bundle in the projects folder (Recent and All, search, thumbnails cached in the bundle, duration, quality, chips), rename, duplicate, move to Trash, Show in Finder, Create from video…, the unfinished-recording banner (Recover / Delete) and the projects folder (255) with the outside-main-storage warning. 252–254, 256–262 are Settings items and wait for the Settings window |

## M2 — private beta
| Area | Specs | Notes |
| --- | --- | --- |
| Camera: layouts, position, size, cutout, looks | 148–164, 285–287 | Done: 148–164 (hide, mirror, shape, roundness, size, size during zoom, 3 × 3 position, default layout both/split/fullscreen/hide, timeline layouts with spring transitions, per-layout size and position, arrow and 1/2/3 keys, apply size to all, disable, copy/paste, split, remove) plus the camera delay from 287. Not built: 285 cutout (CoreML model, Apple silicon), 286 hide during silence (needs speech ranges from the audio panel), 287 looks, LUTs and sharpen (GPU renderer), face tracking |
| Microphone and system audio, mic modes, hide during silence | 213–223, 288–290 | |
| Masks: blur, pixelate, solid | 189–198 | |
| Keystroke overlays and hidden shortcuts | 199–204 | |
| Captions from transcription | 205–212 | Q2 decides the engine |
| GIF and WebM export, presets, settings | 224–232, 263–272 | |

## M3 — launch
| Area | Specs | Notes |
| --- | --- | --- |
| Licensing, sign-in, devices, auto-update | 273–282 | Q1 |
| Shareable links with comments | 246–251 | the only cloud feature |
| Transcript editing, filler-word removal | 291 | |
| AI and recorded voice-overs | 292 | |
| Super-resolution ("clarity"), loupe zoom | 283–284 | Apple silicon only |
