# STORY-003: easy Decoded Output Panels, Copy Buttons, and Clear Action

**Index**: 3
**Complexity**: easy
**Design ref**: workspace/design/jwt-parser.processed.md | workspace/design/jwt-parser.new.md
**Depends on**: STORY-002

## Context

With the parsing logic in place, the application must display decoded results and allow users to act on them. This story wires up the three output panels (Header, Payload, Signature), the per-panel Copy buttons with a brief confirmation state, and the Clear button that resets everything. It also completes the `onInput()` orchestration loop that drives parsing on every keystroke/paste.

## Acceptance Criteria

- [ ] A `renderPanels(parsed)` function exists. When `parsed` is `null` or `undefined`, it clears all three panel `<pre>` elements. When `parsed` is a valid result object, it writes `JSON.stringify(parsed.headerJson, null, 2)` to the header panel, `JSON.stringify(parsed.payloadJson, null, 2)` to the payload panel, and `parsed.signature` (the raw base64url string) to the signature panel.
- [ ] A `copyToClipboard(text, btn)` function exists. It calls `navigator.clipboard.writeText(text)`. On success the button's text changes to `"Copied!"` and it receives a visual confirmation state (e.g. a `.copied` CSS class) for exactly 1.5 seconds, then reverts to its original label. On failure it surfaces an error via `showError()`.
- [ ] Each `.copy-btn` element is wired to copy the `textContent` of the `<pre>` identified by its `data-target` attribute.
- [ ] Clicking **Clear** empties the textarea, clears the mirror div, resets all three panel `<pre>` elements to empty, hides any visible error, and focuses the textarea.
- [ ] An `onInput()` function exists and is attached to the textarea's `input` event. On each invocation it: updates the mirror div with `highlight()`; attempts `parseJwt()`; on success calls `renderPanels()` and `clearError()`; on failure calls `renderPanels(null)` and (if the input is non-empty) calls `showError()` with the thrown error message.
- [ ] `showError(msg)` makes `#errorDisplay` visible with the given message (fade-in). `clearError()` hides it.
- [ ] When a valid JWT is pasted, all three panels show correctly formatted content and no error is visible.
- [ ] When invalid content is typed and then deleted, the error clears automatically and the panels are empty.

## Implementation Hints

- `copyToClipboard` uses the Promise-based `navigator.clipboard.writeText()` API. Store the button's original `textContent` before changing it so you can restore it after 1.5 s with `setTimeout`.
- `onInput` is the single orchestration point — it should call no DOM methods directly other than setting `tokenMirror.innerHTML` and delegating to `renderPanels`, `showError`, and `clearError`.
- `appState.parsed` should be kept in sync so other functions (e.g. copy handlers) can rely on it if needed, though referencing `textContent` of the `<pre>` directly is fine for copy.
- The `onClear` handler must call `tokenInput.focus()` at the end so the user can immediately start typing again.

## Test Requirements

Open `index.html` in a browser.

- Paste a valid JWT — verify all three panels populate with correctly pretty-printed JSON (header and payload) and the raw base64url string (signature).
- Click the **Copy** button on the Payload panel — verify the button briefly shows "Copied!" and then reverts. Paste into a text editor to confirm the clipboard holds the formatted JSON.
- Click **Clear** — verify the textarea, mirror div, and all three panels are empty, no error is shown, and the textarea receives focus.
- Type `garbage` in the textarea — verify an error message appears. Delete the text — verify the error disappears and panels are empty.

---
<!-- Coding Agent appends timestamped failure notes below this line -->
