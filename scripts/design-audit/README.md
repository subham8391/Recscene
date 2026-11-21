# Design audit

Compares the running app with the canvas boards, state by state.

1. Render the boards: copy `design/canvas/*.dc.html` into a folder with the canvas runtime saved as `support.js` (the artifact's `artifact-type/dc-runtime.js`), then screenshot each with headless Chrome at 1300×820.
2. `AUDIT_PROJECT="…/Some.recscene" ./scripts/design-audit/states.sh` builds the app, launches it with `--remote-debugging-port=9222`, walks every board state (home, each rail section, each selected item, export, presets, ⌘K, shortcuts guide, crop, light theme, settings tabs, picker tabs and menus), screenshots each into `.audit/` and runs `audit.mjs` on the DOM: clipped text, children overflowing their parent, overlapping siblings, buttons inside buttons, tiny targets, broken images. Findings land in `.audit/audit.log`.
3. `node scripts/design-audit/compose.mjs board.png app.png out.png [x y w h]` puts a board and an app screenshot side by side at the same scale, optionally cropped to a region in board coordinates (inspector: `968 48 312 516`, timeline: `0 564 640 236`).

`cdp.mjs <route> "<js>"` evaluates in a window (`editor`, `settings`, `picker`), `cdp-shot.mjs <route> out.png` screenshots it.

## Measuring instead of eyeballing

`board.sh <Board> out.json` renders one board headlessly (boards in `$AUDIT_DIR/boards` with the runtime as `support.js`) and dumps a style inventory of every visible element: font size, line height, weight, colour, box, padding, gap, radius, background, border. `probe.mjs 9222 <route> body out.json` dumps the same for a running window. `compare.mjs board.json app.json [x y w h]` matches elements by their text and lists every metric that differs; the region (board coordinates, e.g. the inspector `968 48 312 516`) limits the board side. Boards are the source of truth: body text is 13/400 with the font's own line height, section headings 12/600, helper text 11/400, chips and rail labels 10/500, controls 30–32 px, radii 6/8/10/12.

`compose.mjs` takes `APPW` (and `APPX`/`APPY`) for windows that are not the 1280-wide editor, e.g. `APPW=820 node compose.mjs Settings.png settings.png out.png 198 124 877 624`.
