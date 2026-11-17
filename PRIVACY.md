# Privacy Policy — Design Snapshot

_Last updated: 2026-11-17_

Design Snapshot is a Chrome extension that turns the page you are viewing into a single Markdown file (HTML structure, CSS, design tokens, animations and data-loading behaviour).

## What the extension does with data
- **Everything stays on your device.** The extension reads the content of the page you are on only when you click "Capture whole page" or "Pick an element", builds the Markdown file locally, saves it to your Downloads folder and copies it to your clipboard.
- **Network activity log.** On every page it records, in that page's memory only, the URL, method, status, timing and a structural outline (field names and types, not values) of fetch/XHR calls, plus IntersectionObserver settings. This log is discarded when you leave or reload the page and is included in a capture file only if you create one.
- **No transmission.** The extension does not send any data to the developer or to any third party. It has no servers, analytics, advertising or tracking, and it does not sell or share data.
- **No storage.** It does not store anything in the browser (no cookies, localStorage or sync storage) and does not require an account.

## Permissions
- `activeTab` and `scripting`: run the capture on the tab you click the extension on.
- Access to all sites (`<all_urls>`): lets the page-level logger start at page load so API calls and lazy loading can be recorded. It is never used to send page data anywhere.

## Your responsibility
A capture file can contain text, links and data visible on the page you captured. Review it before sharing it, especially from pages with personal or confidential information.

## Contact
Questions: open an issue at https://github.com/raza-kontakt/design-snapshot or contact the developer through the GitHub profile https://github.com/raza-kontakt.
