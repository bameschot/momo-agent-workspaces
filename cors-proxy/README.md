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

## Lock it down (recommended)

Anyone who finds your worker's URL can use it as an open proxy for anything,
not just RSS feeds. Set a shared secret so requests must include a matching
`key=` query parameter:

```
npm run secret:set-key
```

(paste any random string when prompted). Leave this step out if you're fine
with the worker being open — it's still restricted to `http`/`https` targets
and refuses private/internal addresses (see `worker.js`).

## Use it

Point a URL-template CORS proxy setting at:

```
https://personal-cors-proxy.<your-subdomain>.workers.dev/?url={url}
```

(append `&key=<your secret>` if you set one). The `{url}` placeholder gets
replaced with the URL-encoded target by the calling app — this matches the
template convention already used by `rss-reader/`'s proxy settings.

## Test it directly

```
curl "https://personal-cors-proxy.<your-subdomain>.workers.dev/?url=https://example.com"
```

Should return `example.com`'s HTML. Add `-D -` to inspect the response
headers and confirm `access-control-allow-origin: *` is present.

## Local development

```
npm run dev
```

Runs the worker locally (Wrangler prints a `localhost` URL) without
deploying, useful for testing changes to `worker.js` first.
