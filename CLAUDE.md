# Recscene

A macOS screen recorder that turns a capture into a polished video automatically. Motto: "Record the screen. Make it a scene."

## Before building anything
- Read `docs/DECISIONS.md`. It is the source of truth for product and architecture decisions and lists the open ones. Do not settle an open question in code; ask.
- Check the feature's milestone in `docs/FEATURES.md`. Build only what the current milestone needs.
- The feature behaviour is specified in `docs/research/screen-studio-feature-specs.md` (292 numbered specs of the competitor). When a spec number is cited in a task, read that spec first; Recscene matches the behaviour unless DECISIONS.md says otherwise.
- The UI is designed in `design/canvas/` (Claude Design canvas, also at https://claude.ai/artifact/TNgyi7613cUPzPLpf3iWDp). Tokens, breakpoints and track colours in `docs/design/README.md`; the CSS tokens are mirrored in `src/renderer/src/styles/tokens.css`. Do not invent new colours or sizes.

## Architecture rules
- `src/core/**` is pure TypeScript: no Electron, React or Node imports (ESLint enforces it). Everything testable lives here first.
- The renderer talks to the system only through `window.recscene`, defined in `src/preload/index.ts`. Add a typed function there and a handler in `src/main/`; never widen `webPreferences`.
- Project data stays on the user's Mac in a `.recscene` project bundle. Nothing is uploaded unless the user shares a link (not built yet).
- Native capture (ScreenCaptureKit) will live in a Swift helper under `native/`; until it exists, do not fake recording with `desktopCapturer`.

## Working loop
- Every feature lands with unit tests in `src/core` (vitest) and passes `npm run check` before it is pushed.
- Commits are small and named after the feature; `main` is always runnable with `npm run dev`.
- Do not run `npm run dist` or sign anything in CI yet; the signing identity is not set up.

## Commands
`npm run dev` · `npm run check` (typecheck + lint + test) · `npm test` · `npm run build` · `npm run dist`
