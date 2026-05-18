#!/usr/bin/env node
// Strip white background and trim transparent margins from PNG icons.
// White-bg removal via pixel-level threshold (sharp `composite + dest-in mask`
// silently no-ops in this version), then sharp `.trim()` removes transparent
// padding and re-pads uniformly so all icons render at consistent visual size.
//
// Usage: node scripts/post-process-icons.mjs assets/icon-a.png assets/icon-b.png ...

import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const WHITE_THRESHOLD = 235;
const PAD_RATIO = 0.05;

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: post-process-icons.mjs <png>...");
  process.exit(1);
}

for (const file of files) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let cleared = 0;
  for (let i = 0; i < data.length; i += ch) {
    if (data[i] >= WHITE_THRESHOLD && data[i + 1] >= WHITE_THRESHOLD && data[i + 2] >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
      cleared++;
    }
  }
  const stripped = await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toBuffer();

  const trimmed = await sharp(stripped).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const pad = Math.round(Math.max(meta.width, meta.height) * PAD_RATIO);
  const side = Math.max(meta.width, meta.height) + pad * 2;

  const out = await sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: trimmed, left: Math.round((side - meta.width) / 2), top: Math.round((side - meta.height) / 2) },
    ])
    .png()
    .toBuffer();

  await writeFile(file, out);
  console.log(`✓ ${file} → ${side}×${side} (subject ${meta.width}×${meta.height}, ${cleared} white px stripped)`);
}
