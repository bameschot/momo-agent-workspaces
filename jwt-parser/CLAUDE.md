# JWT Parser — Coding Agent Instructions

## Project Overview

This is a **single-file, self-contained HTML application** — a JWT decoder that runs entirely in the browser with no external dependencies, build step, or network requests.

- **Single Artefact**: `index.html` (contains all HTML, CSS, and JavaScript inline)
- **No Dependencies**: No npm, pip, cargo, or other package managers
- **No Build Step**: The file is used directly and can be opened with `file://` or served with any simple HTTP server
- **No Tests**: This is a UI-only application; manual testing in a browser is the validation method

## How to Work on This Project

### Viewing/Testing the Application

Open `index.html` directly in a modern browser:

```bash
# Option 1: Open directly in your default browser
open index.html

# Option 2: Serve locally with Python (any Python version)
python3 -m http.server 8000
# then visit http://localhost:8000/index.html

# Option 3: Use a simple HTTP server if available
npx http-server
# then visit http://localhost:8080/index.html
```

### Editing the Application

Edit `index.html` directly:
- **HTML markup**: Between `<html>` and `</html>` tags
- **CSS**: Inside the `<style>` block (within `<head>`)
- **JavaScript**: Inside the `<script>` block (before `</body>`)

No build step or transpilation is needed. Save the file and refresh the browser to see changes.

### Code Standards

- **HTML**: Semantic HTML5 with accessibility attributes (`role`, `aria-*`, `alt`)
- **CSS**: Modern CSS (custom properties, flexbox, grid, media queries) with no preprocessor
- **JavaScript**: ES2020+ with vanilla JS (no frameworks or libraries)
- **No external requests**: All resources (fonts, scripts, styles) must be inline or system-provided

### Key Constraints

1. **Self-contained**: Everything must be in `index.html`. Do not create additional files or external resources.
2. **No dependencies**: No npm packages, CDN links, or external libraries.
3. **Browser-native APIs only**: Use standard DOM, `atob()`, `navigator.clipboard`, `window.matchMedia()`, etc.
4. **Inline everything**: CSS goes in `<style>`, JavaScript in `<script>`, fonts use system stacks.

## Browser Compatibility

Target modern evergreen browsers:
- Chrome/Edge (current and one prior major version)
- Firefox (current and one prior major version)
- Safari (current and one prior major version)

No IE support required.

## Theme System

The design specifies:
- Two themes: `light` and `dark`
- Stored in CSS custom properties under `:root` (light) and `[data-theme="dark"]` (dark)
- Detected via `window.matchMedia('(prefers-color-scheme: dark)')`
- User can toggle with a button (state held in memory only, not persisted)

## Accessibility

Target WCAG AA compliance:
- Sufficient colour contrast in both light and dark themes
- Buttons have accessible labels and `:focus` states
- Error messages use `role="alert"`
- Theme toggle has visible text label

## Agent Exclusion List

Since this project has no dependencies, vendored code, or build outputs, there are no folders agents should avoid. The repository is entirely composed of source files.

If a Python or Node HTTP server is used for local testing, those tools' artefacts are not checked in:
- `.pytest_cache/`, `__pycache__/`, `*.pyc` (Python)
- `node_modules/`, `.cache/` (Node.js)

These will not appear in the workspace and do not require exclusion.

## File Structure

```
index.html              ← The entire application (all HTML, CSS, JS inline)
CLAUDE.md              ← This file
.gitignore            ← Git ignore rules
design/
  jwt-parser.new.md   ← Design document
```

---

**Done!** The application is ready for development. Edit `index.html` directly, save, and refresh your browser to test changes.
