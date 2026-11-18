# Design audit

Compares the running app with the canvas boards, state by state.

1. Render the boards: copy `design/canvas/*.dc.html` into a folder with the canvas runtime saved as `support.js` (the artifact's `artifact-type/dc-runtime.js`), then screenshot each with headless Chrome at 1300×820.
2. `AUDIT_PROJECT="…/Some.recscene" ./scripts/design-audit/states.sh` builds the app, launches it with `--remote-debugging-port=9222`, walks every board state (home, each rail section, each selected item, export, presets, ⌘K, shortcuts guide, crop, light theme, settings tabs, picker tabs and menus), screenshots each into `.audit/` and runs `audit.mjs` on the DOM: clipped text, children overflowing their parent, overlapping siblings, buttons inside buttons, tiny targets, broken images. Findings land in `.audit/audit.log`.
3. `node scripts/design-audit/compose.mjs board.png app.png out.png [x y w h]` puts a board and an app screenshot side by side at the same scale, optionally cropped to a region in board coordinates (inspector: `968 48 312 516`, timeline: `0 564 640 236`).

`cdp.mjs <route> "<js>"` evaluates in a window (`editor`, `settings`, `picker`), `cdp-shot.mjs <route> out.png` screenshots it.
