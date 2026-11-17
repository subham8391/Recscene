# Recscene

**Record the screen. Make it a scene.**

Recscene is a macOS screen recorder that turns a plain capture into a polished video on its own: the camera glides into every click, the cursor moves smoothly, your webcam sits in a layout that fits, and the result exports as a shareable MP4 or GIF. No timeline skills needed.

Status: pre-alpha scaffold. The editor shell runs; recording, rendering and export are being built milestone by milestone (see `docs/FEATURES.md`).

## Getting started

Requires Node 24 (`.nvmrc`) and macOS 14 or later for screen capture.

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app with hot reload |
| `npm run check` | Typecheck, lint and unit tests, the same gate CI runs |
| `npm test` | Unit tests only |
| `npm run build` | Compiles main, preload and renderer into `out/` |
| `npm run dist` | Builds the signed-ready `.dmg` for Apple silicon and Intel into `dist/` |

## Layout

```
src/core       pure TypeScript: project model, auto-zoom, timing. No Electron, React or Node imports.
src/main       Electron main process: windows, recording, files, rendering orchestration
src/preload    the typed bridge the renderer is allowed to call (window.recscene)
src/renderer   the React UI, built from the design canvas tokens
design/canvas  the full UI design (23 artboards, dark + light, laptop/tablet/mobile)
docs           decisions, feature milestones, engineering notes, competitor research
```

## Where decisions live

- `docs/DECISIONS.md` is the source of truth for product and architecture decisions, including the open ones.
- `docs/FEATURES.md` maps every feature to a milestone.
- `docs/research/` holds the 292-feature study of Screen Studio that the feature list was derived from.
- `docs/design/README.md` describes the design system and links the live canvas.
