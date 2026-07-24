# Personal CORS Proxy (Cloudflare Worker)

A minimal, free, self-hosted CORS proxy. Fetches a URL you supply *server-side*
(no CORS applies between two servers) and returns it with permissive CORS
headers, so client-side JS in a browser can read a response the target site
never intended to allow.

Standalone tool — not part of, or deployed with, any of the web apps in this
repo. Any app in here (or elsewhere) that supports a custom CORS proxy URL,
like `rss-reader/` (Settings → Default CORS proxy template, or a per-feed
custom proxy), can point at it once deployed.

## Why this can't just live on GitHub Pages

GitHub Pages only serves static files from a CDN — there's no server-side
runtime to run code per request. A CORS proxy needs to receive a request,
fetch an arbitrary target URL *at that moment*, and return the result — that
needs actual compute per request, which Cloudflare Workers provides (with a
generous free tier) and static hosting doesn't.

## Deploy (a couple of minutes)

1. Install dependencies (this pulls in `wrangler`, Cloudflare's CLI):
   ```
   cd cors-proxy
   npm install
   ```
2. Log in to your Cloudflare account (opens a browser once):
   ```
   npx wrangler login
   ```
3. Deploy:
   ```
   npm run deploy
   ```
   Wrangler prints the deployed URL, something like:
   `https://personal-cors-proxy.<your-subdomain>.workers.dev`

No Cloudflare domain or paid plan required — this runs on the free
`*.workers.dev` subdomain Cloudflare gives every account.

## It's keyed by default

Anyone who finds your worker's URL could otherwise use it as an open proxy
for anything, not just RSS feeds — so `npm run deploy` automatically runs a
`postdeploy` step (`scripts/ensure-key.mjs`) that generates a random shared
secret and sets it as the `PROXY_KEY` secret the very first time you deploy.
It prints the generated key once, right after deploying — copy it somewhere
safe, it can't be shown again. Redeploying later leaves an existing key
untouched, so it's safe to run `npm run deploy` repeatedly without breaking
a URL you've already configured elsewhere.

To use your own chosen value instead of the generated one at any time:

```
npm run secret:set-key
```

(paste any string when prompted — this overwrites the current key). To
deliberately run the worker open/unkeyed instead, remove the key after
deploying:

```
npx wrangler secret delete PROXY_KEY
```

Either way, it's still restricted to `http`/`https` targets and refuses
private/internal addresses regardless of the key (see `worker.js`).

## Use it

Point a URL-template CORS proxy setting at:

```
https://personal-cors-proxy.<your-subdomain>.workers.dev/?url={url}&key=<your key>
```

The `{url}` placeholder gets replaced with the URL-encoded target by the
calling app — this matches the template convention already used by
`rss-reader/`'s proxy settings. Drop `&key=<your key>` only if you removed
the key entirely as described above.

## Test it directly

```
curl "https://personal-cors-proxy.<your-subdomain>.workers.dev/?url=https://example.com&key=<your key>"
```

Should return `example.com`'s HTML (omit `&key=...` only if you removed the
key). Add `-D -` to inspect the response headers and confirm
`access-control-allow-origin: *` is present.

## Local development

```
npm run dev
```

Runs the worker locally (Wrangler prints a `localhost` URL) without
deploying, useful for testing changes to `worker.js` first.
