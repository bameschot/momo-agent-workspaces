# eReader — Coding Agent Instructions

## Project Overview

This is a **single-file, self-contained HTML application** — an offline EPUB and plain-text eReader that runs entirely in the browser with no external dependencies, build step, or network requests.

- **Single Artefact**: `ereader.html` (contains all HTML, CSS, and JavaScript inline). It is accompanied by one small, static `manifest.json` (Web App Manifest) — see "Installability" below for why that one file isn't inlined.
- **No Dependencies**: No npm, pip, cargo, or other package managers. EPUB files are ZIP archives, so this project includes a hand-written minimal ZIP reader and raw-DEFLATE inflater instead of a library like JSZip.
- **No Build Step**: The file is used directly and can be opened with `file://` or served with any simple HTTP server
- **No Tests**: This is a UI-only application; manual/browser-driven testing (e.g. Playwright against a generated test EPUB) is the validation method

## How to Work on This Project

### Viewing/Testing the Application

Open `ereader.html` directly in a modern browser:

```bash
# Option 1: Open directly in your default browser
open ereader.html

# Option 2: Serve locally with Python
python3 -m http.server 8000
# then visit http://localhost:8000/ereader.html
```

Books uploaded during testing persist in the browser's IndexedDB (`ereader-db`). Clear site data to reset the library.

### Editing the Application

Edit `ereader.html` directly:
- **HTML markup**: Between `<html>` and `</html>` tags
- **CSS**: Inside the `<style>` block (within `<head>`)
- **JavaScript**: Inside the `<script>` block (before `</body>`), organized into clearly labelled sections: Utils, IndexedDB, Inflate, Zip, Epub parser, Txt parser, Pagination, Bookmarks/Highlights/Search, Backup export/import, State + UI rendering, Theme/Font/Install, Bootstrap.

No build step or transpilation is needed. Save the file and refresh the browser to see changes.

### Code Standards

- **HTML**: Semantic HTML5 with accessibility attributes (`role`, `aria-*`, `alt`)
- **CSS**: Modern CSS (custom properties, flexbox, CSS multi-column layout for pagination, media queries), no preprocessor
- **JavaScript**: ES2020+ vanilla JS (no frameworks or libraries)
- **No external requests**: Everything — including the ZIP/inflate decoder and app icons (generated at runtime via `<canvas>`) — must be inline or browser-native. The one exception is `manifest.json` (see "Installability"), which is a same-directory static file, not a network fetch to a remote host.

### Key Constraints

1. **Self-contained**: All HTML/CSS/JS must be in `ereader.html` — `manifest.json` and `sw.js` are the two deliberate exceptions (see "Installability"). Do not add any other asset file beyond those two.
2. **No dependencies**: No npm packages, CDN links, or external libraries — including no EPUB/ZIP/inflate library. If you need to touch ZIP/EPUB parsing, edit the hand-written `parseZip`/`inflateRaw` functions rather than pulling in a dependency.
3. **Browser-native APIs only**: `IndexedDB`, `FileReader`, `DOMParser`, CSS multi-column layout, `Web Speech API`, etc.
4. **Position tracking is anchor-based, not page-number-based**: every block-level chapter element gets a sequential `data-anchor` attribute at parse time. Saved reading position is `{chapterIndex, anchorId}`, not a raw page index, because total pages per chapter changes with font size and screen rotation. If you touch pagination, preserve this invariant (see `findAnchorPage`/`getTopAnchorOfCurrentPage` in `ereader.html`).

## Installability

The app declares a Web App Manifest via `<link rel="manifest" href="manifest.json">` in `ereader.html`'s `<head>`, plus `apple-mobile-web-app-*` meta tags, so it can be added to a mobile home screen in `display: standalone`. `manifest.json` is a **real, static, same-directory file** — not inlined as a `data:` URI — because Android's WebAPK minting is a server-side step that independently re-fetches the manifest by URL later to check for updates, and a `data:` URI manifest has nothing for that fetch to reach. This is the one deliberate exception to the single-file constraint; keep it a plain static file rather than generating it at runtime. Favicon and apple-touch-icon have no such re-fetch requirement and stay dynamically generated `data:` URIs via `<canvas>` (`buildIconDataUrl()` in `setupInstallability()`).

`sw.js` is a **real, static, same-directory service worker file** — registered via `navigator.serviceWorker.register('sw.js')` inside `ereader.html`. This was originally left out (browsers refuse to register a service worker from an inline or `blob:` script, so it can't be inlined the way the rest of the app is), on the assumption that skipping it wouldn't matter since the app makes zero runtime network requests. That assumption turned out to be wrong in practice: Chrome's installability criteria require an *active* service worker with a `fetch` handler in addition to a valid manifest — without one, "Install" can silently fall back to a plain home-screen shortcut (opens with browser chrome visible) instead of a real standalone WebAPK, even though the manifest and `beforeinstallprompt` flow are otherwise correct. `sw.js` is deliberately minimal: network-first for the app shell (`ereader.html`, `manifest.json`) with a cache fallback for offline use, and it never intercepts anything cross-origin (moot here anyway, since the app has no cross-origin requests to begin with). Bump `CACHE_NAME` in `sw.js` only if you need to force-invalidate a previously-cached shell; normal edits to `ereader.html` are picked up automatically since the fetch handler always tries the network first.

## Browser Compatibility

Target modern evergreen browsers (Chrome/Edge, Firefox, Safari — current and one prior major version), including their mobile variants. No IE support required.

## Theme System

- Two themes: `light` and `dark`, as CSS custom properties under `:root` and `[data-theme="dark"]`
- Detected via `window.matchMedia('(prefers-color-scheme: dark)')`, overridable via a toggle in the Settings panel
- The manual override is persisted in `localStorage` (`ereader-theme`) since it's a device-level preference, not tied to any one book

## Accessibility

- WCAG AA colour contrast target in both themes
- Buttons have accessible labels (`aria-label`) and visible `:focus-visible` states
- Page turning is available via swipe, tap-on-edge, and `ArrowLeft`/`ArrowRight` keys — not touch-only

## Agent Exclusion List

No vendored code or build outputs exist in this project. If a Python HTTP server is used for local testing, its artefacts (`__pycache__/`, etc.) are not checked in and do not require exclusion.

## File Structure

```
ereader.html              ← The entire application (all HTML, CSS, JS inline)
manifest.json             ← Web App Manifest (static file; see Installability)
sw.js                     ← Service worker (static file; see Installability)
CLAUDE.md                ← This file
.gitignore               ← Git ignore rules
design/
  ereader.new.md         ← Design document
```

---

**Done!** The application is ready for development. Edit `ereader.html` directly, save, and refresh your browser to test changes.
