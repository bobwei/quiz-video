#!/usr/bin/env node
// Cache-busts asset URLs by appending ?v={content-hash} query string.
// 1. Hash each file under assets/ and fonts/
// 2. Rewrite every reference in index.html
//
// Idempotent. Note: hyperframes validate currently 404s on query-stringed
// URLs (bug in its internal static server), so `npm run check` skips
// validate. Studio preview and render handle ?v= correctly.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative, resolve, extname } from "node:path";

const PROJECT = resolve(new URL("..", import.meta.url).pathname);
const HTML = join(PROJECT, "index.html");
const SCAN_DIRS = ["assets", "fonts"];
const EXTS = new Set([
  ".mp4", ".webm", ".mov", ".m4v",
  ".mp3", ".wav", ".ogg",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".woff2", ".woff", ".ttf", ".otf",
  ".json",
]);

async function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(full));
    else out.push(full);
  }
  return out;
}

const versions = {};
for (const sub of SCAN_DIRS) {
  for (const f of await walk(join(PROJECT, sub))) {
    const rel = relative(PROJECT, f);
    if (!EXTS.has(extname(rel).toLowerCase())) continue;
    const buf = await readFile(f);
    versions[rel] = createHash("sha1").update(buf).digest("hex").slice(0, 10);
  }
}

const html = await readFile(HTML, "utf8");
let rewrites = 0;
const stamped = html.replace(
  /(["'(])((?:assets|fonts)\/[^"')\s?#]+)(?:\?v=[a-z0-9]+)?(["')])/g,
  (m, open, path, close) => {
    const v = versions[path];
    if (!v) return m;
    const next = `${open}${path}?v=${v}${close}`;
    if (next !== m) rewrites++;
    return next;
  },
);

if (stamped !== html) await writeFile(HTML, stamped);

console.log(
  `${rewrites ? "✓" : "="} ${Object.keys(versions).length} assets · ${rewrites} reference(s) updated`,
);
for (const [path, v] of Object.entries(versions)) {
  console.log(`  ${path} → ?v=${v}`);
}
