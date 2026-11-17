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
| `{"cmd":"start","target":…,"outputDir":"/path/Name.recscene","mic":false,"systemAudio":false,"fps":60,"showCursor":false,"codec":"h264","excludeProcessIds":[]}` | `{"event":"started","outputDir":"…","width":3600,"height":2338}` |
| `{"cmd":"stop"}` | `{"event":"stopped","durationMs":4233.3,"frames":239,"files":{"screen":"…/screen.mov","events":"…/events.json","mic":"…/mic.m4a"},"micOffsetMs":12.5}` |

`excludeProcessIds` lists process ids whose windows are left out of a display or area capture, so the app's own overlays never appear in the footage.

Targets: `{"kind":"display","id":1}`, `{"kind":"window","id":1234}`, or `{"kind":"area","displayId":1,"x":100,"y":80,"width":800,"height":600}` (points, relative to that display's top-left corner).

Display entries: `id, x, y, width, height` (points, global top-left origin), `scale` (pixels per point), `isMain`. Window entries: `id, title, app, bundleId, pid, x, y, width, height`.

Errors: `{"event":"error","code":"…","message":"…"}` with codes `bad-command`, `not-recording`, `already-recording`, `target-not-found`, `permission-screen`, `permission-microphone`, `writer`, `stream`, `internal`.

## Output files

- `screen.mov`: H.264 (or HEVC) at the target's pixel size, up to the requested fps (frames only arrive when the screen changes). The optional system-audio track is AAC 48 kHz stereo.
- `events.json`: `{ version, region, clicks[], keys[], cursor[] }`. Times are milliseconds from the first video frame. Positions are normalised 0..1 within `region` (the recorded display, window or area in global points). `clicks` have `button` left/right/middle; `keys` have a display `label` such as `⌘C`; `cursor` is sampled at up to 60 Hz while the mouse moves.
- `mic.m4a`: AAC mono when `mic` is true. `micOffsetMs` in the `stopped` event is how long after the first frame the microphone started (negative if before).

## Permissions

| Permission | Needed for | Without it |
| --- | --- | --- |
| Screen Recording | everything | `list` and `start` fail with `permission-screen`; `permissions` with `request:true` triggers the system prompt |
| Input Monitoring | keystrokes | clicks and cursor are still recorded (they are polled, not tapped); a `warning` is sent |
| Microphone | `mic:true` | `start` fails with `permission-microphone` |

macOS attributes these permissions to the responsible process: the Recscene app when spawned by it, or the terminal when run by hand. The embedded Info.plist carries the usage descriptions for the stand-alone case.

## Try it by hand

```bash
printf '{"cmd":"list"}\n' | native/bin/recscene-capture
```

```bash
( printf '{"cmd":"start","target":{"kind":"display","id":1},"outputDir":"/tmp/t.recscene"}\n'; sleep 5; printf '{"cmd":"stop"}\n' ) | native/bin/recscene-capture
```
