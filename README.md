# Design Snapshot

A tiny Chrome extension that captures a page (or a single element) into **one Markdown file** you can hand to an AI agent so it can re-implement the design.

One click gives you:

- **Components** – React / Vue / Angular / web-component names, plus `data-component` / `data-testid` hints (marked as `data-cmp` in the HTML)
- **HTML structure** – cleaned, indented markup (small inline SVGs kept)
- **Design tokens** – CSS custom properties, colors and typography in use, `@font-face`
- **CSS** – the rules that actually apply to the captured subtree, plus computed styles
- **Animations** – transitions, `@keyframes`, running animations, animation libraries, scroll-driven timelines
- **Data fetching** – fetch/XHR calls with response shapes, GraphQL operations, hydration state, lazy-loading markers, IntersectionObserver usage (analytics noise filtered out)

## Install (unpacked)

1. Clone or download this repo:
   ```bash
   git clone https://github.com/raza-kontakt/design-snapshot.git
   ```
2. Open `chrome://extensions` in Chrome (or any Chromium browser).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the **`ext`** folder.
5. Optional: pin **Design Snapshot** from the puzzle-piece menu.
6. **Reload the page you want to capture once.** This starts the network and lazy-load logger at page load; without it the API section falls back to a less detailed view.

## Use

Click the extension icon, then:

- **Capture whole page** – scrolls the page top to bottom (to trigger lazy loading), then captures it.
- **Pick an element…** – hover over an element and click it. Press **↑** to select the parent, **Esc** to cancel.

A file named `design-snapshot-<host>-<time>.md` downloads to your Downloads folder and is also copied to the clipboard. Give it to your AI agent and ask it to rebuild the UI from it.

## Limitations

- Production builds often minify component names.
- Stylesheets from other domains that block CORS are listed but not included.
- Shadow DOM contents are not captured.
- Only the current viewport width and theme are captured; resize the window or switch to dark mode and capture again for other variants.
- Review the file before sharing it: it contains text and data visible on the page.

## Privacy

Everything happens locally in your browser; nothing is sent anywhere. See [PRIVACY.md](PRIVACY.md).

## Development

No build step. Edit the files in `ext/` and click the reload icon on the extension in `chrome://extensions`.

| File | Purpose |
|---|---|
| `ext/manifest.json` | Manifest V3 config |
| `ext/hook.js` | Runs at page load; logs fetch/XHR and IntersectionObserver |
| `ext/capture.js` | Builds the Markdown snapshot, element picker, auto-scroll |
| `ext/popup.html`, `ext/popup.js` | Toolbar popup |

## License

[MIT](LICENSE)
