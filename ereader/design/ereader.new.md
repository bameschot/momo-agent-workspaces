# Design: Offline eReader

## Overview

A single, fully self-contained `ereader.html` file that lets a reader upload EPUB and plain-text books from local storage, keeps a persistent library of them in the browser, and reads them in a paginated, page-turning view with scalable fonts and light/dark themes. No external requests are made — no CDN links, no web fonts, no analytics, no server. The page works when opened directly from `file://` and can be added to a phone's home screen as a standalone app.

The primary interaction loop is: **Library → pick or upload a book → Reader (paginated pages, tap/swipe to turn) → close → Library remembers exactly where you left off.**

## Technology Stack

| Concern | Choice |
|---|---|
| Markup | HTML5 |
| Styling | Vanilla CSS (custom properties for theming, CSS multi-column layout for pagination) |
| Logic | Vanilla JavaScript (ES2020+, no libraries or frameworks) |
| Book persistence | `IndexedDB` (one object store, `books`) |
| Device preferences | `localStorage` (theme, global font default) |
| ZIP/EPUB reading | Hand-written minimal ZIP central-directory reader + DEFLATE inflater, inlined in `<script>` (EPUB files are ZIP archives; no `JSZip` or similar is permitted, so this is written from scratch) |
| XML/XHTML parsing | Browser-native `DOMParser` |
| File input | `<input type="file">` + `FileReader` |
| Installability | Inline (data-URI) Web App Manifest + Apple mobile web app meta tags |
| Optional extra (read-aloud) | Browser-native `Web Speech API` — no dependency, no network call |
| Bundling | None — single file, everything inline |

No build step. No dependencies. The file is the artefact.

## Project Structure

```
ereader.html          ← the entire application (HTML + <style> + <script>)
```

All CSS lives in a `<style>` block in `<head>`. All JavaScript lives in `<script>` blocks before `</body>`, organized as clearly-commented sections (ZIP/inflate, EPUB parsing, TXT parsing, IndexedDB layer, pagination engine, UI/render, app bootstrap). Nothing is loaded from the network at runtime.

## Screens

### 1. Library (bookshelf)
- Grid of book tiles: cover image (extracted from the EPUB's OPF metadata) or a generated placeholder tile (title initial + a color derived from the title's hash) when no cover exists.
- Each tile shows title, author, and a thin progress bar (based on last known chapter/anchor position relative to total chapters).
- A prominent **Upload** button/drop-zone: `<input type="file" accept=".epub,.txt">`. Uploading parses the book once, stores the parsed result in IndexedDB, and immediately opens it in the Reader.
- Tapping an existing tile opens that book directly into the Reader at its saved position.
- A "Continue Reading" highlight for the most recently opened book, shown at the top of the grid.
- Long-press / a small "…" menu on a tile offers **Remove from library** (deletes the IndexedDB record; asks for confirmation since it can't be undone without re-uploading the file).

### 2. Reader (paginated view)
- Full-viewport chapter content laid out with CSS multi-column layout so it behaves as fixed "pages" (see **Pagination Engine** below), with tap-left-edge / tap-right-edge / swipe / arrow-key navigation between pages, and between chapters at the first/last page of a chapter.
- A minimal top bar (auto-hides after a short idle period, tap center of screen to toggle) with: back-to-library, book title, TOC button, font-size control, theme toggle.
- A thin progress indicator at the bottom (current page / total pages in chapter, and overall book percentage).
- Position is saved automatically (debounced) as the user turns pages, and again when leaving the Reader.

### 3. Table of Contents (slide-in panel)
- Triggered from the Reader's top bar.
- Lists the parsed navigation entries (from EPUB3 `nav.xhtml`, or NCX for EPUB2, or heuristically detected chapter headings for `.txt`).
- Tapping an entry closes the panel and jumps the Reader to that chapter (and in-chapter anchor, if the TOC entry pointed at one).
- Highlights the entry corresponding to the current reading position.

### 4. Settings (reachable from the Reader top bar)
- Font size control: **–  100%  +** stepper (or slider), adjusting a `--font-scale` CSS custom property; changes trigger repagination (see below) while keeping the reader anchored to the same text.
- Theme toggle: light / dark (system-detected by default via `prefers-color-scheme`, overridable).

## Core Architecture

### File Ingestion

**Plain text (`.txt`)**
1. Read with `FileReader.readAsText`, strip a leading BOM if present.
2. Split into "chapters" heuristically: look for lines matching common chapter markers (`/^\s*(chapter|part|book)\b/i`, or Markdown-style `# Heading` lines). If at least two such markers are found, split there; otherwise treat the whole file as a single chapter and the TOC shows just one "Start" entry.
3. Each chapter's plain text is wrapped into `<p>` elements split on blank lines, so it renders and paginates like any other chapter content.

**EPUB (`.epub`)**
1. Read with `FileReader.readAsArrayBuffer`.
2. **ZIP layer**: parse the End-Of-Central-Directory record and central directory entries to get each file's name, offset, compression method, and sizes. For each entry needed: method `0` (stored) is read as raw bytes; method `8` (deflate) is decompressed with a small vanilla-JS raw-DEFLATE inflater (a self-contained, well-understood ~300–400 line algorithm — Huffman decoding of fixed and dynamic blocks — written once and inlined; this is the only non-trivial "from scratch" piece of the whole app).
3. Read `META-INF/container.xml` to locate the OPF (package document) path.
4. Parse the OPF with `DOMParser`: read `<manifest>` (id → href → media-type) and `<spine>` (ordered list of manifest ids = reading order), plus `<metadata>` (title, author, and cover image reference).
5. Parse the navigation document: EPUB3 `nav.xhtml` (the manifest item with `properties="nav"`) if present, else fall back to the EPUB2 NCX (`toc.ncx`) referenced by the spine's `toc` attribute. Build a flat TOC list of `{label, href, anchor}`.
6. For each spine item, in order: load its XHTML via `DOMParser`, take the `<body>` inner content, and:
   - Strip all `<script>` tags outright (security — never execute embedded book scripts).
   - Rewrite relative `<img src>` / `<image xlink:href>` references to `data:` URIs built from the matching ZIP entry's (decompressed) bytes and its media type.
   - Rewrite internal cross-chapter `<a href>` links to the app's internal chapter/anchor navigation instead of leaving them as file-relative links.
   - Inline the chapter's linked stylesheet(s), if any, into a scoped `<style>` so basic in-book styling (italics via classes, etc.) is preserved without a network fetch.
   - Walk the resulting DOM and assign a sequential `data-anchor="N"` attribute to every block-level element (`p`, `h1`–`h6`, `li`, `blockquote`, `img`, `figure`, `table`) — this is the pagination-independent position marker described next.
7. Store the fully-parsed result (title, author, cover, ordered chapters' HTML, TOC) in IndexedDB so re-opening the book later never re-parses the ZIP/XML.

### Storage (IndexedDB)

One object store, `books`, keyed by an auto-generated id:

```
{
  id: string,
  title: string,
  author: string,
  coverDataUrl: string | null,
  chapters: [ { href: string, title: string, html: string } ],
  toc: [ { label: string, chapterIndex: number, anchorId: number | null } ],
  addedAt: number,
  lastOpenedAt: number,
  position: { chapterIndex: number, anchorId: number },
  settings: { fontScale: number }
}
```

A small promise-based wrapper (`dbOpen`, `dbGet`, `dbPut`, `dbGetAll`, `dbDelete`) sits over the native `indexedDB` API — no dependency, just enough surface for the library's needs. Because `chapters[].html` is pre-parsed at upload time, opening a previously-added book is just an IndexedDB read, not a re-parse.

### Pagination Engine

Rather than writing a custom text-layout/line-breaking engine, pagination is built on **CSS multi-column layout**, which lets the browser's own reflow do the hard work:

- The current chapter's HTML is rendered into an off-screen (or currently active) container styled with `column-width: <viewport width>`, `column-gap: 0`, `height: <viewport height>`, `overflow: hidden`. The browser lays the flowing content out into fixed-width "columns" — each column is one page.
- Total pages in the chapter = `Math.ceil(container.scrollWidth / viewportWidth)`.
- Turning a page moves `scrollLeft` (or an equivalent `transform: translateX`) by exactly one viewport width; this responds to swipe gestures, tap-on-edge, and left/right arrow keys.
- Reaching the last page of a chapter and turning forward loads the next chapter's first page (and symmetrically backward into the previous chapter's last page).

**Position tracking** (the key robustness point, since "total pages" is not a stable number): the stored position is never a raw page index — it's the `data-anchor` id of the element currently at the top of the visible page. On resume, or any time the layout is recomputed (font-size change, screen rotation, window resize), the app:
1. Paginates the chapter as above.
2. Finds the element `[data-anchor="<savedAnchorId>"]`.
3. Reads its `offsetLeft` and jumps to page `Math.floor(offsetLeft / viewportWidth)`.

This means changing font size or rotating the device never loses the reader's place, because the anchor is a piece of content, not a page number.

### Table of Contents Navigation

TOC entries carry `{chapterIndex, anchorId}`. Selecting an entry loads the target chapter, paginates it, and — if an anchor was specified (an in-chapter heading) — jumps straight to the page containing that anchor using the same lookup as position-restore; otherwise it opens at page 0 of the chapter.

### Font Scaling

A single CSS custom property, `--font-scale` (a multiplier, e.g. `1.0`, `1.15`, `1.3`...), applied to the reader's base `font-size` in `rem` units. The –/+ control adjusts this in fixed steps (e.g. 6 steps from 80% to 180%). Any change re-runs the pagination engine and re-anchors to the current `data-anchor`, so the reader's place is preserved across size changes. The chosen scale is saved per book (`settings.fontScale`) and also remembered as the default for the next newly-opened book.

### Theming

CSS custom properties define the full palette under `:root` (light) and `[data-theme="dark"]` (dark), following the same pattern used elsewhere in this repo (see `jwt-parser`):
- On first load, `window.matchMedia('(prefers-color-scheme: dark)')` sets the initial theme.
- A toggle button lets the user override it; the override is persisted in `localStorage` (a device-level preference, not stored per-book).
- A `MediaQueryList` `change` listener updates the theme live if the user hasn't manually overridden it.
- `theme-color` `<meta>` is kept in sync with the active theme so the mobile browser chrome/status bar matches.

### Installability (Add to Home Screen)

- `<link rel="manifest" href="data:application/manifest+json;base64,...">` — the manifest JSON (name, `display: "standalone"`, icons as inline data-URI PNGs generated from an inline SVG at build time) is base64-encoded directly into the `href`, so it stays part of the single file.
- `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" ...>`, and an `apple-touch-icon` `<link>` (data URI) cover iOS Safari's "Add to Home Screen", which does not rely on the manifest at all.
- **Known limitation**: a fully installable PWA with offline Service-Worker pre-caching cannot be achieved from a single inline file, because browsers only allow registering a Service Worker from a same-origin script fetched over `https:`/`localhost` — not from an inline `<script>` or a `blob:` URL. Since root `CLAUDE.md` requires a strict single-file, zero-external-file app, and the app already makes zero runtime network requests (there is nothing to pre-cache), this has no real functional impact — it only means Android Chrome's automatic "Install app" banner may require the file to be hosted over HTTPS (rather than opened via `file://`) to appear, and there's no Service-Worker-guaranteed "available before first load" story. A companion `sw.js` is listed as an optional future enhancement if the single-file constraint is ever relaxed.

## Data Model (in-memory app state)

```
appState {
  screen: 'library' | 'reader' | 'toc' | 'settings'
  library: Book[]                 // loaded from IndexedDB on boot
  currentBook: Book | null
  currentChapterIndex: number
  currentPageIndex: number
  totalPagesInChapter: number
  theme: 'light' | 'dark'
  themeManualOverride: bool
  fontScale: number
}

Book {                            // mirrors the IndexedDB record
  id, title, author, coverDataUrl,
  chapters, toc, addedAt, lastOpenedAt,
  position: { chapterIndex, anchorId },
  settings: { fontScale }
}
```

## API / Interfaces

Purely local, UI-only app. No HTTP endpoints, no external APIs, no inter-page communication.

### Internal JavaScript interface (module-level functions, grouped by concern)

| Function | Responsibility |
|---|---|
| `unzip(arrayBuffer)` | Parses ZIP central directory, returns a map of entry name → decompressed bytes |
| `inflateRaw(bytes)` | Decompresses a raw DEFLATE stream (fixed + dynamic Huffman blocks) |
| `parseEpub(arrayBuffer)` | Orchestrates unzip → container.xml → OPF → nav/NCX → per-chapter XHTML parsing; returns a `Book`-shaped object |
| `parseTxt(text)` | Splits plain text into chapters, wraps paragraphs, returns a `Book`-shaped object |
| `assignAnchors(rootEl)` | Walks a chapter's DOM, stamping sequential `data-anchor` attributes |
| `dbOpen/dbGet/dbPut/dbGetAll/dbDelete` | Thin promise wrapper over IndexedDB for the `books` store |
| `openBook(bookId)` | Loads a book from IndexedDB, switches to the Reader screen, restores position |
| `paginateChapter(chapterHtml, viewportSize)` | Lays out chapter content in CSS columns, returns total page count |
| `goToPage(n)` / `nextPage()` / `prevPage()` | Moves the reader viewport by whole pages, crossing chapter boundaries at the ends |
| `findAnchorPage(anchorId)` | Locates the page index containing a given `data-anchor` after (re)pagination |
| `savePosition()` | Debounced write of `{chapterIndex, anchorId}` back to IndexedDB |
| `setFontScale(scale)` | Updates `--font-scale`, repaginates, re-anchors to current position |
| `applyTheme(theme)` | Sets `data-theme` on `<html>` and updates `theme-color` meta |
| `renderLibrary()` / `renderToc()` | Builds the Library grid / TOC panel DOM from app state |

## Non-Functional Requirements

| Requirement | Detail |
|---|---|
| **Privacy** | Zero network requests at any point. Uploaded book content and reading position never leave the device (IndexedDB is local to the browser profile). |
| **Self-contained** | The single `ereader.html` must work when opened directly from the filesystem (`file://`) — no server required for core reading functionality. |
| **Performance** | EPUB ZIP/XML parsing happens once, at upload time; reopening a book is an IndexedDB read only. Pagination recomputation on font-size/rotation change should feel instant (well under 300ms) for typical chapter sizes. |
| **Accessibility** | WCAG AA colour contrast in both themes; buttons have accessible labels; TOC panel and Settings are keyboard-navigable; page-turn works via arrow keys as well as touch. |
| **Browser support** | Modern evergreen mobile/desktop browsers (Chrome, Firefox, Safari, Edge — current and one prior major version). |
| **Responsiveness** | Reader viewport recalculates page width/height on resize/rotation and repaginates without losing the reader's place. |
| **Font** | System font stack for UI chrome; a serif system stack (`Georgia, 'Times New Roman', serif`) as the default reading font, no web font fetch. |

## Colour Palette

### Light theme
| Role | Value |
|---|---|
| Background | `#f7f5f0` |
| Surface (bars/panels) | `#ffffff` |
| Reading text | `#1a1a1a` |
| Muted text | `#6b7280` |
| Accent | `#8b5cf6` |
| Border | `#e5e7eb` |
| Progress bar | `#8b5cf6` |

### Dark theme
| Role | Value |
|---|---|
| Background | `#121212` |
| Surface (bars/panels) | `#1c1c1c` |
| Reading text | `#e5e5e5` |
| Muted text | `#9ca3af` |
| Accent | `#a78bfa` |
| Border | `#2a2a2a` |
| Progress bar | `#a78bfa` |

## Suggested Extra Features

Not part of the default build — listed here for the user to choose from before implementation starts:

- **Reading themes** beyond light/dark (sepia, night-amber tint).
- **Adjustable typography**: font family choice (serif/sans/dyslexia-friendly) and line-height/margin controls, not just size.
- **Bookmarks**: multiple saved positions with a short text-excerpt preview, distinct from the single auto-tracked "resume" position.
- **Highlights & annotations**: select text, tag it with a colour and an optional note, stored per book.
- **Search**: full-text search within the current book, and library-wide search across all books.
- **Reading stats**: time spent reading, pages/chapters completed, estimated time remaining in the current book.
- **Night-reading overlay**: a brightness/warmth slider independent of the OS display settings.
- **Read-aloud**: browser-native `Web Speech API` narration — no dependency, no network call.
- **Library backup**: export/import the whole library as a downloadable file, since IndexedDB data is lost if the user clears site data — this is the main mitigation for that risk.
- **Drag-and-drop upload**, in addition to the file picker.
- **Page-turn animation** (slide/curl) for a more physical book feel.
- **"Continue reading" card** prominently pinned at the top of the Library.
- **Smarter `.txt` chapter detection** (paragraph-length/blank-line heuristics) when no explicit chapter markers exist.
- **EPUB-embedded font support**: pull `@font-face` sources from the EPUB's own font files and inline them as data URIs, so books with custom typography render as designed.

## Open Questions

_None outstanding. The user has confirmed a persistent multi-book library (IndexedDB) and a paginated page-turn reading experience. Which of the "Suggested Extra Features" above to include is intentionally left open for the user to decide before implementation begins._
