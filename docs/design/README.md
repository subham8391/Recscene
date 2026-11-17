# Recscene design

The complete UI lives in `design/canvas/` as a Claude Design canvas (31 artboards). The same canvas is published at https://claude.ai/artifact/TNgyi7613cUPzPLpf3iWDp (private; ask the owner for access).

## Boards
- **Design system** — tokens, type scale, components in light and dark.
- **Laptop 1280×800** — Editor (Zooms, Camera & Layouts, Transcript, Cursor, Background & Screen, Masks, Audio), Recording picker over the desktop, Export & share, Settings, Projects home. Light variants import the dark board with `theme="light"` so the two modes never drift apart.
- **Tablet 1024×768** — two-pane editor with the inspector as a side sheet; recording picker.
- **Mobile 390×844** — companion role: projects home, record, single-column editor with a bottom sheet, export.
- **Remaining areas (row 4)** — Clips, Shortcuts, Captions and Enhance (4.1.0: clarity, loupe, looks and LUT studio, fillers, voiceover) panels; the Presets popover; the recording flow (area selection with saved sizes, countdown, floating widget, menu bar item, speaker notes, permissions); the shared video web page with comments; Settings › Account with the trial, expired, refunded and signed-out states as a tweak.

## Tokens
Mirrored exactly in `src/renderer/src/styles/tokens.css`. Font: Inter. Accent `#5F45F0` light / `#8F79FF` dark. Track colours: zoom, clip, layout, mask, shortcut, caption, voice — each pair differs in lightness so it survives greyscale.

## Breakpoints
| Device | Size | Rail | Inspector | Timeline |
| --- | --- | --- | --- | --- |
| Laptop | 1280×800 | 68 | 312 | 236 |
| Tablet | 1024×768 | 56 | 340 side sheet | 200 |
| Mobile | 390×844 | tab bar | bottom sheet | scrubber strip, 44 px targets |

## Editing the canvas
Open the artifact link, or edit the `.dc.html` files here and republish them. Each board is one file; `canvas.json` is the index with positions, order and sticky notes.
