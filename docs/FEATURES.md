# Features by milestone

Spec numbers refer to `docs/research/screen-studio-feature-specs.md`. A feature is done when its specs' behaviour holds in Recscene and its core logic has unit tests.

## M1 — daily driver
| Area | Specs | Notes |
| --- | --- | --- |
| Recording picker: screen, window, area; countdown; menu bar control | 1–47 | Done: 1–5, 13, 17, 21, 31, 32 (stop only), 33, 37–38. Next: 22–28, 29–30, 34–36, 39–47 |
| Editor shell: stage, rail, inspector, timeline, playhead, scrubber | 48–79 | Layout matches the laptop boards |
| Automatic zooms from clicks; manual zoom regions; zoom speed and depth | 102–124 | `src/core/autoZoom.ts` |
| Cursor: smoothing, size, click highlight, hide when idle | 125–147 | |
| Background, padding, rounded corners, shadow, screen inset | 165–188 | |
| Clips: trim, cut, speed | 80–101 | |
| Export MP4 (H.264, 1080p/4K, frame rate) to `~/Movies/Recscene` | 233–245 | VideoToolbox in the native helper |
| Projects home: open, rename, delete, recover unfinished recording | 252–262 | `.recscene` bundles in `~/Recscene Projects` |

## M2 — private beta
| Area | Specs | Notes |
| --- | --- | --- |
| Camera: layouts, position, size, cutout, looks | 148–164, 285–287 | Cutout needs a CoreML model on Apple silicon |
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
