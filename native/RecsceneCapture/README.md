# recscene-capture

The native recording helper. A Swift command-line tool (macOS 14+) that the Electron main process spawns; it records the screen with ScreenCaptureKit, writes the file with AVAssetWriter, and captures clicks, cursor positions and keystrokes alongside. The app never talks to ScreenCaptureKit itself.

```
npm run build:native      # swift build -c release → native/bin/recscene-capture
```

The packaged app ships the binary in `Contents/Resources/bin/`.

## Protocol

One JSON object per line on stdin (commands) and stdout (events). Commands are answered in order; each produces exactly one terminal event (`pong`, `permissions`, `targets`, `started`, `stopped` or `error`). `warning` events can appear at any time and belong to no command. Closing stdin stops any running recording and exits.

| Command | Terminal event |
| --- | --- |
| `{"cmd":"ping"}` | `{"event":"pong","version":"0.1.0"}` |
| `{"cmd":"permissions","request":false}` | `{"event":"permissions","screen":true,"inputMonitoring":false,"accessibility":false,"microphone":"granted"}` |
| `{"cmd":"list"}` | `{"event":"targets","displays":[…],"windows":[…]}` |
| `{"cmd":"cameras"}` | `{"event":"cameras","cameras":[{"id":"…","name":"FaceTime HD Camera","maxHeight":1920}]}` |
| `{"cmd":"start","target":…,"outputDir":"/path/Name.recscene","mic":false,"systemAudio":false,"fps":60,"showCursor":false,"codec":"h264","excludeProcessIds":[],"micAutoGain":true,"micEnhance":false,"camera":null,"cameraMaxHeight":1080}` | `{"event":"started","outputDir":"…","width":3600,"height":2338}` |
| `{"cmd":"pause"}` | `{"event":"paused","timeMs":4210.5}` — frames and audio are dropped until resume; the file stays contiguous |
| `{"cmd":"resume"}` | `{"event":"resumed","timeMs":4210.5}` |
| `{"cmd":"mark","kind":"marker"}` | `{"event":"marked","kind":"marker","timeMs":9120.0}` — `kind` is `marker` or `flag`; the time excludes pauses |
| `{"cmd":"cancel"}` | `{"event":"cancelled"}` — stops and deletes screen.mov, mic.m4a and events.json |
| `{"cmd":"probe","path":"/x.mov"}` | `{"event":"probed","durationMs":5100,"width":2688,"height":1512,"hasAudio":true}` |
| `{"cmd":"import","path":"/x.gif","output":"/p.recscene/screen.mov"}` | `{"event":"imported","output":"…","durationMs":…,"width":…,"height":…,"converted":true}` — mp4/mov with H.264 or HEVC are copied, anything else and GIFs are converted to H.264 |
| `{"cmd":"mux","video":"/tmp/v.mp4","audio":"/tmp/a.wav","output":"/out.mp4"}` | `{"event":"muxed","output":"…","durationMs":…}` — passes the H.264 track through and encodes the WAV as AAC; `audio` may be null |
| `{"cmd":"stop"}` | `{"event":"stopped","durationMs":4233.3,"frames":239,"files":{"screen":"…/screen.mov","events":"…/events.json","mic":"…/mic.m4a","camera":"…/camera.mov"},"micOffsetMs":12.5,"cameraWidth":1280,"cameraHeight":720}` |

`excludeProcessIds` lists process ids whose windows are left out of a display or area capture, so the app's own overlays never appear in the footage.

Targets: `{"kind":"display","id":1}`, `{"kind":"window","id":1234}`, or `{"kind":"area","displayId":1,"x":100,"y":80,"width":800,"height":600}` (points, relative to that display's top-left corner).

Display entries: `id, x, y, width, height` (points, global top-left origin), `scale` (pixels per point), `isMain`. Window entries: `id, title, app, bundleId, pid, x, y, width, height`.

Errors: `{"event":"error","code":"…","message":"…"}` with codes `bad-command`, `not-recording`, `already-recording`, `already-paused`, `not-paused`, `target-not-found`, `permission-screen`, `permission-microphone`, `permission-camera`, `writer`, `stream`, `internal`.

## Output files

- `screen.mov`: H.264 (or HEVC) at the target's pixel size, up to the requested fps, written as a fragmented movie every 2 s so an interrupted recording stays playable. Frames only arrive when the screen changes, so the last frame is repeated at stop time and the file always lasts as long as the recording. Pauses are cut out; timestamps after a resume are shifted back by the paused time. The optional system-audio track is AAC 48 kHz stereo.
- `events.json`: `{ version, region, clicks[], keys[], cursor[] }`. Times are milliseconds from the first video frame. Positions are normalised 0..1 within `region` (the recorded display, window or area in global points). `clicks` have `button` left/right/middle; `keys` have a display `label` such as `⌘C`; `cursor` is sampled at up to 60 Hz while the mouse moves.
- `camera.mov`: H.264 of the webcam when `camera` is set (a `cameras` id or `"default"`), at the tallest device format at or under `cameraMaxHeight`, 30 fps. Time zero is the screen's first frame (earlier camera frames are dropped) and pauses are cut out the same way, so the two files line up without an offset. The sensor's full frame is kept; mirroring and shape are editor decisions. Absent when the camera never delivered a frame.
- `mic.m4a`: AAC when `mic` is true, recorded through AVAudioEngine; `micAutoGain` keeps automatic gain control on and `micEnhance` turns on voice processing (noise suppression); when the audio device refuses voice processing the helper records plainly and sends a `warning`. Buffers are dropped while paused. `micOffsetMs` in the `stopped` event is how long after the first frame the microphone started (negative if before).

## Permissions

| Permission | Needed for | Without it |
| --- | --- | --- |
| Screen Recording | everything | `list` and `start` fail with `permission-screen`; `permissions` with `request:true` triggers the system prompt |
| Input Monitoring | keystrokes | clicks and cursor are still recorded (they are polled, not tapped); a `warning` is sent |
| Microphone | `mic:true` | `start` fails with `permission-microphone` |
| Camera | `camera` set | `start` fails with `permission-camera`; the app asks for access first so the prompt is attributed to it |

macOS attributes these permissions to the responsible process: the Recscene app when spawned by it, or the terminal when run by hand. The embedded Info.plist carries the usage descriptions for the stand-alone case.

## Try it by hand

```bash
printf '{"cmd":"list"}\n' | native/bin/recscene-capture
```

```bash
( printf '{"cmd":"start","target":{"kind":"display","id":1},"outputDir":"/tmp/t.recscene"}\n'; sleep 5; printf '{"cmd":"stop"}\n' ) | native/bin/recscene-capture
```
