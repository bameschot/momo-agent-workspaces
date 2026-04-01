# STORY-004: easy Theme System with System Preference Detection and Manual Override

**Index**: 4
**Complexity**: easy
**Design ref**: workspace/design/jwt-parser.processed.md | workspace/design/jwt-parser.new.md
**Depends on**: STORY-003

## Context

The application supports light and dark themes defined entirely via CSS custom properties. On page load the active theme is derived from the OS/browser preference (`prefers-color-scheme`). A toggle button in the header lets the user override this preference for the session. If the user has *not* manually overridden, the theme follows live OS changes (e.g. switching from light to dark mode in system settings while the page is open). No theme choice is ever persisted to storage.

## Acceptance Criteria

- [ ] An `applyTheme(theme)` function exists. When `theme` is `'dark'` it sets `data-theme="dark"` on `<html>` and updates the toggle button label to indicate switching to light (e.g. `"☀️ Light"`). When `theme` is `'light'` it removes the `data-theme` attribute and updates the label to `"🌙 Dark"`.
- [ ] On page load, `window.matchMedia('(prefers-color-scheme: dark)').matches` is read and the appropriate theme is applied before any user interaction.
- [ ] `appState.theme` is initialised to `'light'` or `'dark'` to match the applied theme.
- [ ] `appState.manualThemeOverride` starts as `false`.
- [ ] Clicking the theme toggle button toggles `appState.theme` between `'light'` and `'dark'`, calls `applyTheme()`, and sets `appState.manualThemeOverride = true`.
- [ ] A `change` listener on the `MediaQueryList` for `prefers-color-scheme` updates the theme (and `appState.theme`) only when `appState.manualThemeOverride` is `false`. If the user has manually toggled, OS-level theme changes have no effect for the remainder of the session.
- [ ] The theme toggle button has a visible text label (not icon-only) and an `aria-label` attribute for screen readers.
- [ ] All interactive elements (theme toggle, copy buttons, clear button) have visible `:focus` styles in both themes.

## Implementation Hints

- Attach the `MediaQueryList` change listener using `darkModeQuery.addEventListener('change', handler)` (the older `addListener` is deprecated).
- Keep the toggle logic simple: `appState.theme = appState.theme === 'light' ? 'dark' : 'light'`.
- Theme state is memory-only — no `localStorage.setItem` calls.
- The `applyTheme` function is the single place that touches `document.documentElement` and the toggle button label, keeping the rest of the code theme-agnostic.

## Test Requirements

Open `index.html` in a browser.

- If the OS is in dark mode, verify the page loads in dark mode with the toggle showing "☀️ Light". If in light mode, verify it loads in light mode with "🌙 Dark".
- Click the theme toggle — verify the page immediately switches to the opposite theme and the button label updates.
- Click the toggle again — verify it switches back.
- (If testable) Simulate a system theme change via browser DevTools (emulate `prefers-color-scheme`) while the page is open and the user has *not* clicked the toggle — verify the theme follows the change. After clicking the toggle once, simulate another system change — verify the page theme does *not* change.

---
<!-- Coding Agent appends timestamped failure notes below this line -->
