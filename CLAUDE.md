# Project Instructions

## Clarifying Requirements Before Building

If the functionality or requirements of something to be built are unclear, ask clarifying questions **before** writing any code. Keep asking until the user explicitly requests to build the app. Do not start building until that explicit signal is given.

## Output Format

Whenever something needs to be created or built, deliver it as a **self-contained single-page HTML app**:

- A single `.html` file that works by opening it directly in a browser
- No external dependencies (no CDN links, no separate CSS/JS files)
- If a library or framework is required, inline it directly into the HTML file (in a `<script>` or `<style>` tag)
- All assets (fonts, icons, images) must be inlined (base64 data URIs, inline SVG, etc.)
