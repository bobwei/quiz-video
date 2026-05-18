#!/usr/bin/env node
// Generate sticker-style flat illustration icons via Gemini 3 Pro Image,
// then strip the white background and trim transparent margins.
//
// Usage: node scripts/gen-icons.mjs
//
// Reads ICONS array below. Each item produces assets/<name>.png. Re-running
// regenerates from scratch — change the prompt or add entries as needed.

import { writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";

const PROJECT = resolve(new URL("..", import.meta.url).pathname);
const ASSETS = join(PROJECT, "assets");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY missing — export it or store in keychain");
  process.exit(1);
}

const MODEL = "gemini-3-pro-image-preview";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const STYLE = "Cute flat illustration of {SUBJECT}. Soft pastel colors, hand-drawn style, simple clean shapes, NO outline, NO border, NO sticker effect, NO shadow, NO text. Pure white background (#FFFFFF), isolated subject, lots of empty whitespace padding around the subject, centered composition.";

const ICONS = [
  {
    name: "icon-a-bow.png",
    subject: "a soft pink satin ribbon bow, like a hair ribbon, with two looped ribbons and two tails hanging down, pastel pink color, single object centered",
  },
  {
    name: "icon-b-cutlery.png",
    subject: "a silver fork and silver spoon crossed in an X shape, tied at the center with a small cream-colored ribbon bow, single object centered",
  },
  {
    name: "icon-c-giftbox.png",
    subject: "a small wrapped gift box with warm cream-colored paper and a red ribbon bow on top, single object centered, three-quarter view",
  },
  {
    name: "icon-d-bag.png",
    subject: "a small kraft brown paper gift bag with rolled top edges, tied with a thin twine bow at the front, warm earth tones (kraft brown, cream), single object centered",
  },
];

async function gen(prompt) {
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const part = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error(`no inlineData: ${JSON.stringify(json).slice(0, 400)}`);
  return Buffer.from(part.inlineData.data, "base64");
}

async function run(cmd, args) {
  await new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: "inherit", cwd: PROJECT });
    p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))));
  });
}

const generated = [];
for (const { name, subject } of ICONS) {
  const prompt = STYLE.replace("{SUBJECT}", subject);
  process.stdout.write(`generating ${name} ... `);
  try {
    const buf = await gen(prompt);
    const out = join(ASSETS, name);
    await writeFile(out, buf);
    console.log(`${buf.length} bytes`);
    generated.push(out);
  } catch (e) {
    console.error(`FAILED: ${e.message}`);
  }
}

if (generated.length) {
  console.log("\npost-processing (strip white + trim):");
  await run("node", [join(PROJECT, "scripts/post-process-icons.mjs"), ...generated]);
}
