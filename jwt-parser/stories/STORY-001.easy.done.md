# STORY-001: easy HTML Scaffold, CSS Variables, and Responsive Layout

**Index**: 1
**Complexity**: easy
**Design ref**: workspace/design/jwt-parser.processed.md | workspace/design/jwt-parser.new.md
**Depends on**: none

## Context

`index.html` is the single deliverable — a self-contained file with all HTML, CSS, and JavaScript inline. Before any interactive logic can be added, the complete markup skeleton and CSS foundation must be in place: both colour themes defined as CSS custom properties, all UI components present in the DOM (input area with mirror div, error div, action bar, three output panels, privacy notice, theme toggle), and a responsive layout that switches between one-column and three-column at 700 px.

The existing `index.html` has a first-pass implementation. This story verifies and completes the structural and visual layer so subsequent stories can rely on stable IDs, class names, and CSS variables.

## Acceptance Criteria

- [ ] `index.html` opens from the filesystem (`file://`) in any modern evergreen browser with no console errors.
- [ ] A `<style>` block in `<head>` defines all CSS custom properties under `:root` (light) and `[data-theme="dark"]` (dark) using the exact values from the design colour palette.
- [ ] Font stack `ui-monospace, 'Cascadia Code', 'Fira Mono', 'Menlo', 'Consolas', monospace` is referenced as `--font-mono` and applied to all monospace elements (textarea, mirror div, panel `<pre>` blocks).
- [ ] The token input area contains: a `<textarea id="tokenInput">` and a sibling `<div id="tokenMirror">` absolutely positioned over it. The textarea has `color: transparent` and `caret-color` set to the primary text colour so the cursor is visible but the raw text is not. The mirror div carries `pointer-events: none`.
- [ ] An `<div id="errorDisplay" role="alert">` element is present beneath the textarea, hidden by default, with a fade-in CSS animation defined.
- [ ] An action bar between the input and panels contains a `<button id="clearBtn">`.
- [ ] Three panel `<div>` elements are present with classes `panel-header`, `panel-payload`, and `panel-signature`, each containing: a label element with the panel name in the matching accent colour (`--accent-header`, `--accent-payload`, `--accent-signature`), a `<pre>` for content, and a `.copy-btn` button with `data-target` pointing to the `<pre>` id.
- [ ] The privacy notice `"🔒 Your token is decoded entirely in this browser. No data is ever sent anywhere."` is always visible.
- [ ] The theme toggle button `<button id="themeToggle">` is in the top-right of the page header.
- [ ] On viewports wider than 700 px the three output panels are displayed side-by-side (CSS grid or flexbox, three columns). On viewports ≤ 700 px they stack in a single column.
- [ ] No external URLs appear anywhere in the file (no CDN links, no web fonts, no image URLs).

## Implementation Hints

- All work is in `index.html` — CSS in the `<style>` block inside `<head>`, HTML in `<body>`, JS in the `<script>` block before `</body>`.
- The textarea transparency trick: `color: transparent; caret-color: var(--text-primary)`. The mirror div must replicate padding, font, font-size, line-height, and `white-space: pre-wrap` exactly so the coloured overlay aligns with where the user's cursor sits.
- Use `grid-template-columns: repeat(3, 1fr)` on wider viewports and `grid-template-columns: 1fr` inside a `@media (max-width: 700px)` block.
- Panel label accent colours: add a CSS rule per panel type, e.g. `.panel-header .panel-label { color: var(--accent-header); }`.

## Test Requirements

No behavioural tests required — this story is structural. Visual verification in a browser suffices: open `index.html`, confirm all elements are present and styled, resize the window through 700 px to confirm layout switch, and toggle between light and dark via browser DevTools (set `data-theme="dark"` on `<html>`) to confirm the palette swaps correctly.

---
<!-- Coding Agent appends timestamped failure notes below this line -->
