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

**Option A — from your own machine (CLI):**

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
   `https://momo-agent-workspaces.<your-subdomain>.workers.dev`

**Option B — Cloudflare Workers Builds (git-connected, auto-deploy on push):**

Connect this repo to a Worker project in the Cloudflare dashboard, with the
project's **Root directory** set to `cors-proxy`. Cloudflare's CI then runs
`npx wrangler deploy` on every push — no local setup needed.

Important: `wrangler.toml`'s `name` field must match the Worker's name in
the Cloudflare dashboard exactly. If it doesn't, Cloudflare's CI overrides it
and warns ("Failed to match Worker name..."), and — because the `PROXY_KEY`
setup below is also driven by wrangler.toml — the key ends up being checked
against the *wrong* Worker name. If you reconnect this repo under a
differently-named project, update `name` in `wrangler.toml` to match (or
accept the pull request Cloudflare's own "Automatic pull requests" feature
opens to fix it for you).

No Cloudflare domain or paid plan required for either option — this runs on
the free `*.workers.dev` subdomain Cloudflare gives every account.

## It's keyed by default

Anyone who finds your worker's URL could otherwise use it as an open proxy
for anything, not just RSS feeds — so `wrangler.toml` declares a `[build]`
hook (`command = "node scripts/ensure-key.mjs"`) that runs before *every*
`wrangler deploy`, regardless of whether that's triggered locally
(`npm run deploy`) or by Cloudflare Workers Builds' own CI. On the first
deploy with no key set, it generates one and sets it as the `PROXY_KEY`
secret, printing it once right after — copy it somewhere safe, it can't be
shown again. (When deploying via Cloudflare Workers Builds, find this
printed key in that build's log, in the Cloudflare dashboard.) Redeploying
later leaves an existing key untouched, so it's safe to redeploy repeatedly
— by pushing or running `npm run deploy` — without breaking a URL you've
already configured elsewhere.

**Already deployed without a key?** (e.g. your first deploy predates this
`[build]` hook, or wrangler.toml's `name` didn't match yet). Fix it directly,
once:
```
cd cors-proxy && npx wrangler login && npx wrangler secret put PROXY_KEY
```
paste any random string when prompted — this secures the already-live
deployment immediately, without waiting for the next deploy.

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
https://momo-agent-workspaces.<your-subdomain>.workers.dev/?url={url}&key=<your key>
```

The `{url}` placeholder gets replaced with the URL-encoded target by the
calling app — this matches the template convention already used by
`rss-reader/`'s proxy settings. Drop `&key=<your key>` only if you removed
the key entirely as described above.

## Test it directly

```
curl "https://momo-agent-workspaces.<your-subdomain>.workers.dev/?url=https://example.com&key=<your key>"
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
