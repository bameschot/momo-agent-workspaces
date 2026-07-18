# eReader — Coding Agent Instructions

## Project Overview

This is a **single-file, self-contained HTML application** — an offline EPUB and plain-text eReader that runs entirely in the browser with no external dependencies, build step, or network requests.

- **Single Artefact**: `index.html` (contains all HTML, CSS, and JavaScript inline)
- **No Dependencies**: No npm, pip, cargo, or other package managers. EPUB files are ZIP archives, so this project includes a hand-written minimal ZIP reader and raw-DEFLATE inflater instead of a library like JSZip.
- **No Build Step**: The file is used directly and can be opened with `file://` or served with any simple HTTP server
- **No Tests**: This is a UI-only application; manual/browser-driven testing (e.g. Playwright against a generated test EPUB) is the validation method

## How to Work on This Project

### Viewing/Testing the Application

Open `index.html` directly in a modern browser:

```bash
# Option 1: Open directly in your default browser
open index.html

# Option 2: Serve locally with Python
python3 -m http.server 8000
# then visit http://localhost:8000/index.html
```

Books uploaded during testing persist in the browser's IndexedDB (`ereader-db`). Clear site data to reset the library.

### Editing the Application

Edit `index.html` directly:
- **HTML markup**: Between `<html>` and `</html>` tags
- **CSS**: Inside the `<style>` block (within `<head>`)
- **JavaScript**: Inside the `<script>` block (before `</body>`), organized into clearly labelled sections: Utils, IndexedDB, Inflate, Zip, Epub parser, Txt parser, Pagination, Bookmarks/Highlights/Search, Backup export/import, State + UI rendering, Theme/Font/Install, Bootstrap.

No build step or transpilation is needed. Save the file and refresh the browser to see changes.

### Code Standards

- **HTML**: Semantic HTML5 with accessibility attributes (`role`, `aria-*`, `alt`)
- **CSS**: Modern CSS (custom properties, flexbox, CSS multi-column layout for pagination, media queries), no preprocessor
- **JavaScript**: ES2020+ vanilla JS (no frameworks or libraries)
- **No external requests**: Everything — including the ZIP/inflate decoder, PWA manifest (inlined as a `data:` URI), and app icons (generated at runtime via `<canvas>`) — must be inline or browser-native

### Key Constraints

1. **Self-contained**: Everything must be in `index.html`. Do not add a `sw.js`, external manifest file, or any other asset file — see "Installability" below for why a Service Worker is intentionally not used.
2. **No dependencies**: No npm packages, CDN links, or external libraries — including no EPUB/ZIP/inflate library. If you need to touch ZIP/EPUB parsing, edit the hand-written `parseZip`/`inflateRaw` functions rather than pulling in a dependency.
3. **Browser-native APIs only**: `IndexedDB`, `FileReader`, `DOMParser`, CSS multi-column layout, `Web Speech API`, etc.
4. **Position tracking is anchor-based, not page-number-based**: every block-level chapter element gets a sequential `data-anchor` attribute at parse time. Saved reading position is `{chapterIndex, anchorId}`, not a raw page index, because total pages per chapter changes with font size and screen rotation. If you touch pagination, preserve this invariant (see `findAnchorPage`/`getTopAnchorOfCurrentPage` in `index.html`).

## Installability

The app declares a Web App Manifest via a `data:` URI `<link rel="manifest">` (generated at runtime in `setupInstallability()`) plus `apple-mobile-web-app-*` meta tags, so it can be added to a mobile home screen in `display: standalone`. There is deliberately **no Service Worker**: browsers only allow registering one from a same-origin script fetched over `https:`/`localhost`, never from an inline or `blob:` script, so it cannot be added without breaking the single-file constraint. Since the app makes zero runtime network requests, this has no functional effect — it just means the Android "Install" banner may only appear when the file is hosted over HTTPS rather than opened via `file://`.

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
index.html              ← The entire application (all HTML, CSS, JS inline)
CLAUDE.md                ← This file
.gitignore               ← Git ignore rules
design/
  ereader.new.md         ← Design document
```

---

**Done!** The application is ready for development. Edit `index.html` directly, save, and refresh your browser to test changes.
