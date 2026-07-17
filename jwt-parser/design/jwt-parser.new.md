# Design: JWT Parser

## Overview

A single, fully self-contained `index.html` file that decodes JWT tokens entirely in the browser. No external requests are made — no CDN links, no web fonts, no analytics. The page exists purely as a client-side utility. A visible privacy notice reassures users that their token data never leaves the page.

The primary interaction is: paste a JWT → see the decoded header, payload, and signature instantly, with colour-coded sections that visually tie the raw token string to the decoded output.

## Technology Stack

| Concern | Choice |
|---|---|
| Markup | HTML5 |
| Styling | Vanilla CSS (custom properties for theming) |
| Logic | Vanilla JavaScript (ES2020+, no libraries) |
| Encoding | Browser-native `atob()` for base64url decoding |
| Bundling | None — single file, everything inline |

No build step. No dependencies. The file is the artefact.

## Project Structure

```
index.html          ← the entire application (HTML + <style> + <script>)
```

All CSS is in a `<style>` block in `<head>`. All JavaScript is in a `<script>` block before `</body>`. Nothing is loaded from the network.

## Components

### 1. Token Input Area
- A `<textarea>` (or `<pre contenteditable>`) that accepts a pasted JWT.
- As the user types/pastes, the content is re-rendered with three inline `<span>` elements, each carrying a highlight class:
  - `.part-header` — colour A (e.g. coral / rose)
  - `.part-payload` — colour B (e.g. teal / cyan)
  - `.part-signature` — colour C (e.g. amber / gold)
- The dots (`.`) separating the three parts are rendered in a neutral muted colour.
- The input is driven by a hidden `<textarea>` for capturing keystrokes; a sibling `<div>` displays the highlighted version (mirror pattern).

### 2. Decoded Output Panels
Three labelled cards/sections, rendered side-by-side or stacked (single column on narrow viewports):

| Panel | Colour accent | Content |
|---|---|---|
| Header | Colour A | Pretty-printed JSON of the decoded header |
| Payload | Colour B | Pretty-printed JSON of the decoded payload |
| Signature | Colour C | Raw base64url string of the signature (not decoded further) |

Each panel has:
- A label (`HEADER`, `PAYLOAD`, `SIGNATURE`) in the matching accent colour.
- A `<pre>` block for the content (monospace).
- A **Copy** button (top-right of the card) that copies the panel's text content to the clipboard. Button briefly shows a "Copied!" confirmation state.

### 3. Action Bar
Sits between the token input and the decoded panels. Contains:
- **Clear** button — wipes the input and all decoded output, resets error state.

### 4. Error Display
- An inline `<div role="alert">` beneath the token input.
- Hidden by default; shown (with a brief fade-in) when the token is malformed.
- Error cases:
  - Fewer or more than two `.` separators.
  - Header or payload segment is not valid base64url.
  - Decoded header or payload is not valid JSON.
- Message is plain-language, e.g. `"Invalid token: payload is not valid JSON."`.
- Cleared automatically when the input changes to a valid token or is emptied.

### 5. Privacy Notice
- A single unobtrusive line near the top or bottom of the page:
  `"🔒 Your token is decoded entirely in this browser. No data is ever sent anywhere."`
- Always visible regardless of state.

### 6. Theme System
- CSS custom properties define the full colour palette under `:root` (light) and `[data-theme="dark"]` (dark).
- On load, JavaScript reads `window.matchMedia('(prefers-color-scheme: dark)')` and sets `data-theme` on `<html>` accordingly.
- A toggle button (sun/moon icon, text-only fallback) in the top-right corner lets the user override the system preference. State is held in memory only (not persisted to localStorage).
- The `MediaQueryList` `change` event updates the theme automatically if the user has not manually toggled.

## Data Model

All state is ephemeral — held in JavaScript variables, never written to storage or the URL.

```
appState {
  rawInput: string          // current value of the textarea
  theme: 'light' | 'dark'   // current active theme
  manualThemeOverride: bool  // true if user has clicked the toggle

  parsed: {
    header: string          // raw base64url segment
    payload: string         // raw base64url segment
    signature: string       // raw base64url segment
    headerJson: object|null
    payloadJson: object|null
    error: string|null      // human-readable error, or null
  } | null
}
```

## API / Interfaces

This is a purely local, UI-only tool. There are no HTTP endpoints, no external APIs, and no inter-page communication.

### Internal JavaScript interface (module-level functions)

| Function | Responsibility |
|---|---|
| `parseJwt(raw: string)` | Splits on `.`, base64url-decodes, JSON-parses; returns parsed object or throws with a descriptive message |
| `highlight(raw: string)` | Returns an HTML string with the three coloured `<span>` segments for the mirror div |
| `renderPanels(parsed)` | Writes pretty-printed JSON (via `JSON.stringify(obj, null, 2)`) into the three output panels |
| `showError(msg: string)` | Displays the error div with the given message |
| `clearError()` | Hides the error div |
| `copyToClipboard(text: string, btn: Element)` | Uses `navigator.clipboard.writeText`; shows "Copied!" on the button for 1.5 s |
| `applyTheme(theme)` | Sets `data-theme` on `<html>` |
| `onInput()` | Main handler: called on every input event; orchestrates parse → render or error |

## Non-Functional Requirements

| Requirement | Detail |
|---|---|
| **Privacy** | Zero network requests. No cookies, no localStorage, no sessionStorage. Token exists only in memory while the page is open. |
| **Self-contained** | The single `index.html` must work when opened directly from the filesystem (`file://`). No server required. |
| **Performance** | Decoding is synchronous and near-instant for any valid JWT. No debouncing required (tokens are short strings). |
| **Accessibility** | Sufficient colour contrast in both themes (WCAG AA target). Buttons have accessible labels. Error div uses `role="alert"`. Theme toggle has a visible text label. |
| **Browser support** | Modern evergreen browsers (Chrome, Firefox, Safari, Edge — current and one prior major version). No IE support. |
| **Responsiveness** | Single-column layout on viewports narrower than ~700 px; three-column panel layout on wider viewports. |
| **Font** | A system monospace stack: `ui-monospace, 'Cascadia Code', 'Fira Mono', 'Menlo', 'Consolas', monospace`. No web font fetch. |

## Colour Palette

### Light theme
| Role | Value |
|---|---|
| Background | `#f5f5f5` |
| Surface (cards) | `#ffffff` |
| Text | `#1a1a1a` |
| Muted text | `#6b7280` |
| Header accent | `#e05252` (coral red) |
| Payload accent | `#0e9f8e` (teal) |
| Signature accent | `#d97706` (amber) |
| Border | `#e5e7eb` |
| Error | `#dc2626` |

### Dark theme
| Role | Value |
|---|---|
| Background | `#0f0f0f` |
| Surface (cards) | `#1c1c1c` |
| Text | `#e5e5e5` |
| Muted text | `#9ca3af` |
| Header accent | `#f87171` (soft coral) |
| Payload accent | `#2dd4bf` (soft teal) |
| Signature accent | `#fbbf24` (soft amber) |
| Border | `#2a2a2a` |
| Error | `#f87171` |

## Open Questions

_None. All requirements have been agreed with the user. The Business Analyst may proceed directly to story decomposition._
