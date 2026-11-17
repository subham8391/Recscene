# Architecture

```
┌──────────────────────────── Electron ────────────────────────────┐
│  renderer (React)  ──window.recscene──▶  preload  ──ipc──▶  main  │
│   editor UI, GPU preview (WebGL)                     files, windows│
└───────────────────────────────────────────────────────┬──────────┘
                                                        │ stdio / unix socket
                                              ┌─────────▼──────────┐
                                              │ native/ (Swift)    │
                                              │ ScreenCaptureKit   │
                                              │ AVFoundation       │
                                              │ VideoToolbox export│
                                              └────────────────────┘
```

## Processes
- **main** owns windows, the project bundle on disk, the native helper's lifecycle and export jobs.
- **preload** exposes `window.recscene`, a small typed API. Nothing else reaches the renderer.
- **renderer** is the editor. It renders the preview from the project document and the raw media, and sends edits back as plain data.
- **native** (`native/RecsceneCapture`, see its README for the protocol) records screen, microphone, clicks, keys and cursor. Camera capture and export encoding will join it. It never touches the UI.

## Project bundle
`Name.recscene/` holds `project.json` (the `Project` type in `src/core/project.ts`), `screen.mov`, optional `camera.mov` and `mic.m4a`, and `events.json` with clicks, keys and cursor samples. The bundle is self-contained so it can be copied to another Mac.

## Testing
- `src/core` is covered by vitest; aim to keep every algorithm (auto-zoom, cursor smoothing, timeline edits) there.
- Electron and native code are tested by running the app; end-to-end automation comes once recording exists.
