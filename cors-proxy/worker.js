/**
 * Minimal personal CORS proxy for Cloudflare Workers.
 *
 * Fetches a caller-supplied URL server-side — a server-to-server request is
 * never subject to the browser's CORS policy — and returns the response
 * with permissive CORS headers so client-side JS can read it.
 *
 * Built for URL-template-based "CORS proxy" settings such as the RSS Reader
 * app in this repo (see ../rss-reader), which substitutes a URL-encoded
 * target into a template like:
 *   https://<your-worker>.workers.dev/?url={url}
 * but it works with any client that fetches `<worker-url>?url=<target>`.
 *
 * Shared-secret gate: if a `PROXY_KEY` secret is set, every request must
 * include a matching `key=` query parameter, so a random who discovers your
 * worker's URL can't use it as an open proxy. Deploying (via `wrangler
 * deploy` — including Cloudflare Workers Builds' own CI) sets this
 * automatically on first deploy (see wrangler.toml's `[build]` hook and
 * scripts/ensure-key.mjs) — remove it with `wrangler secret delete
 * PROXY_KEY` to run the worker open instead.
 */

const ALLOWED_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const FETCH_TIMEOUT_MS = 20000;
const MAX_RESPONSE_BYTES = 15 * 1024 * 1024; // 15 MB — generous for RSS/Atom feeds

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

// Basic SSRF guard: refuse to fetch obviously-private/internal addresses,
// since this worker will happily fetch whatever URL a caller supplies.
function isPrivateHostname(hostname){
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m){
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  return false;
}

function respond(body, status, extraHeaders){
  return new Response(body, { status, headers: { ...CORS_HEADERS, ...extraHeaders } });
}

export default {
  async fetch(request, env){
    if (request.method === 'OPTIONS'){
      return respond(null, 204);
    }
    if (!ALLOWED_METHODS.includes(request.method)){
      return respond('Method not allowed', 405);
    }

    const incoming = new URL(request.url);

    if (env.PROXY_KEY && incoming.searchParams.get('key') !== env.PROXY_KEY){
      return respond('Unauthorized', 401);
    }

    const target = incoming.searchParams.get('url');
    if (!target){
      return respond('Missing "url" query parameter.', 400);
    }

    let targetUrl;
    try{
      targetUrl = new URL(target);
    }catch(e){
      return respond('Invalid "url" parameter.', 400);
    }

    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:'){
      return respond('Only http/https URLs are allowed.', 400);
    }
    if (isPrivateHostname(targetUrl.hostname)){
      return respond('Refusing to fetch a private/internal address.', 400);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let upstream;
    try{
      upstream = await fetch(targetUrl.toString(), {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; personal-cors-proxy/1.0)',
          'Accept': request.headers.get('Accept') || '*/*'
        },
        redirect: 'follow',
        signal: controller.signal
      });
    }catch(e){
      const message = e.name === 'AbortError' ? 'Upstream request timed out.' : `Upstream fetch failed: ${e.message}`;
      return respond(message, 502);
    }finally{
      clearTimeout(timer);
    }

    const lengthHeader = upstream.headers.get('content-length');
    if (lengthHeader && Number(lengthHeader) > MAX_RESPONSE_BYTES){
      return respond('Upstream response too large.', 502);
    }

    const headers = { 'Cache-Control': 'no-store' };
    const contentType = upstream.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    return respond(upstream.body, upstream.status, headers);
  }
};
