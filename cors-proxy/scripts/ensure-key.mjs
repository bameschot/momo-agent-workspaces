#!/usr/bin/env node
/**
 * Runs automatically as wrangler's `[build] command` (see ../wrangler.toml) —
 * before every `wrangler dev` and `wrangler deploy`, regardless of whether
 * that was invoked via an npm script, the raw CLI, or Cloudflare Workers
 * Builds' own CI (which runs `npx wrangler deploy` directly, bypassing npm
 * lifecycle hooks entirely). Makes sure the worker has a PROXY_KEY secret set
 * by default, generating one on first deploy so the worker isn't left open
 * unless you deliberately remove the key afterwards.
 *
 * Idempotent: if PROXY_KEY is already set, this does nothing, so redeploys
 * never silently rotate (and break) a key you've already shared with a
 * client app.
 *
 * Skips entirely for `wrangler dev` (wrangler sets WRANGLER_COMMAND so this
 * script can tell) — no point paying for a `wrangler secret list` round trip
 * on every local dev start.
 *
 * To opt out of a key entirely: `npx wrangler secret delete PROXY_KEY`.
 * To set your own chosen value instead of a generated one at any time:
 * `npm run secret:set-key`.
 */

import { execSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

if (process.env.WRANGLER_COMMAND && process.env.WRANGLER_COMMAND !== 'deploy'){
  process.exit(0);
}

function listSecretNames(){
  try{
    const out = execSync('npx wrangler secret list', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed.map(s => s.name) : null;
  }catch(e){
    return null; // couldn't tell (not logged in, transient error, etc.) — fall through and try setting anyway
  }
}

const existing = listSecretNames();
if (existing && existing.includes('PROXY_KEY')){
  console.log('[cors-proxy] PROXY_KEY is already set — leaving it unchanged.');
  process.exit(0);
}

const key = crypto.randomBytes(24).toString('base64url');
console.log('[cors-proxy] No PROXY_KEY set yet — generating one and setting it now...');

const result = spawnSync('npx', ['wrangler', 'secret', 'put', 'PROXY_KEY'], {
  input: key,
  stdio: ['pipe', 'inherit', 'inherit']
});

if (result.status !== 0){
  console.error('[cors-proxy] Failed to set PROXY_KEY. Deploy still succeeded; the worker is unkeyed for now.');
  console.error('[cors-proxy] Set one manually with `npm run secret:set-key`.');
  process.exit(0); // don't fail the overall `deploy` run over this
}

console.log('\n[cors-proxy] PROXY_KEY set. Add this to your proxy URL as a query parameter — save it now, it will not be shown again:\n');
console.log(`  &key=${key}\n`);
