# STORY-002: easy JWT Parsing with Correct Base64url Decoding

**Index**: 2
**Complexity**: easy
**Design ref**: workspace/design/jwt-parser.processed.md | workspace/design/jwt-parser.new.md
**Depends on**: STORY-001

## Context

The core logic of the application is the `parseJwt()` function. JWTs use *base64url* encoding (RFC 4648 §5), which differs from standard base64: it substitutes `-` for `+` and `_` for `/`, and omits `=` padding. The browser-native `atob()` only handles standard base64, so calling it directly on a JWT segment without normalisation causes decoding failures on most real-world tokens (any token with characters that map to `-` or `_`, or whose segment length is not a multiple of four).

This story implements a correct `parseJwt()` function and the `highlight()` function used to colour-code the raw token string.

## Acceptance Criteria

- [ ] A `parseJwt(raw)` function exists in the `<script>` block.
- [ ] Before calling `atob()`, each base64url segment is normalised: `-` replaced with `+`, `_` replaced with `/`, and `=` padding appended until the string length is a multiple of 4.
- [ ] `parseJwt('')` (empty or whitespace-only input) returns `null` without throwing.
- [ ] `parseJwt()` throws a descriptive `Error` if the trimmed input does not contain exactly two `.` separators.
- [ ] `parseJwt()` throws a descriptive `Error` if the header segment cannot be base64url-decoded or JSON-parsed.
- [ ] `parseJwt()` throws a descriptive `Error` if the payload segment cannot be base64url-decoded or JSON-parsed.
- [ ] On success, `parseJwt()` returns an object `{ header, payload, signature, headerJson, payloadJson, error: null }` where `header`, `payload`, `signature` are the raw base64url segments and `headerJson`/`payloadJson` are the parsed JavaScript objects.
- [ ] A `highlight(raw)` function exists. It splits on `.`; if there are exactly three parts it returns an HTML string with three `<span class="part-header|part-payload|part-signature">` elements and two `<span class="separator">.</span>` elements. If the input does not have exactly three parts it returns the HTML-escaped raw string unstyled. All segment text is HTML-escaped before insertion.
- [ ] A real-world JWT such as `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c` is parsed without error, yielding a `headerJson` with `{ alg: "HS256", typ: "JWT" }` and a `payloadJson` with `sub`, `name`, and `iat` fields.

## Implementation Hints

- Base64url normalisation helper (inline or a small private function):
  ```js
  function base64urlDecode(str) {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      return atob(padded);
  }
  ```
- Wrap each `base64urlDecode` + `JSON.parse` call in its own try/catch to produce a specific error message (header vs payload).
- The `highlight()` function should use `escapeHtml()` (a helper that sets `div.textContent` and reads `div.innerHTML`) to prevent XSS from malicious token content.
- `parseJwt` and `highlight` are pure functions — no DOM access — making them straightforward to reason about.

## Test Requirements

Open `index.html` in a browser and paste the following JWT into the textarea:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

- The three parts of the token in the input area are rendered in coral, teal, and amber respectively (highlighting visible).
- No error is shown.
- Paste a string with only one dot (e.g. `abc.def`) — an inline error message appears immediately explaining the token is invalid.
- Clear the textarea — the error disappears.

---
<!-- Coding Agent appends timestamped failure notes below this line -->
