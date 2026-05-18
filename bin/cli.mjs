#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, cwd, exit } from "node:process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { join, dirname, resolve, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "..");

const EXCLUDE_TOP = new Set([
  "bin",
  "SKILL.md",
  "README.md",
  "node_modules",
  ".git",
  "renders",
  ".hyperframes",
  ".thumbnails",
]);

const DEFAULT_CTA = "「留言你的答案，領取下一步策略」";

const HELP = `create-quiz-video — scaffold and render a 9:16 quiz card video

Usage:
  npx github:bobwei/quiz-video [options]

Required (asked interactively if missing):
  --title <str>          Main title — e.g. "為什麼不對關係做選擇"
  --pill <str>           Pink pill sub-question — e.g. "你最喜歡哪款包裝"
  --options <csv>        3 or 4 comma-separated option subjects
                           e.g. "pink ribbon bow,kraft bag,gift box,glass jar"

Optional:
  --dir <path>           Target directory (default: ./quiz-video-<timestamp>)
  --lead-in <str>        Small text above title (default: empty = hidden)
  --cta <str>            Bottom CTA (default: ${DEFAULT_CTA})
  --bg <path|url|sample> Background video (default: sample)
  --gen-icons            Generate option icons via Gemini (needs GEMINI_API_KEY)
  --render               Run npm run render at the end
  --quality <q>          draft | standard (default: standard, for --render)
  -y, --yes              Non-interactive; fail if required flags missing
  -h, --help             Show this help

Examples:
  npx github:bobwei/quiz-video \\
    --title "為什麼不對關係做選擇" \\
    --pill "你最喜歡哪款包裝" \\
    --options "pink ribbon bow,kraft paper bag,glass jar,wooden box" \\
    --gen-icons --render
`;

const { values: args } = parseArgs({
  options: {
    dir: { type: "string" },
    title: { type: "string" },
    pill: { type: "string" },
    options: { type: "string" },
    "lead-in": { type: "string" },
    cta: { type: "string" },
    bg: { type: "string" },
    "gen-icons": { type: "boolean" },
    render: { type: "boolean" },
    quality: { type: "string" },
    yes: { type: "boolean", short: "y" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: false,
});

if (args.help) {
  console.log(HELP);
  exit(0);
}

const interactive = stdin.isTTY && !args.yes;
const rl = interactive ? createInterface({ input: stdin, output: stdout }) : null;

async function ask(label, fallback) {
  if (rl) {
    const hint = fallback ? ` [${fallback}]` : "";
    const raw = (await rl.question(`${label}${hint}: `)).trim();
    return raw || fallback || "";
  }
  if (fallback !== undefined) return fallback;
  console.error(`Missing required input: ${label}`);
  console.error("Pass via flag or run in a TTY for interactive prompts. -h for help.");
  exit(2);
}

function requireValue(label, value) {
  if (!value) {
    console.error(`${label} is required.`);
    exit(2);
  }
  return value;
}

function slug(s, fallback) {
  const ascii = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii.slice(0, 20) || fallback;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

async function resolveInputs() {
  const title = requireValue("title", args.title || (await ask("Title")));
  const pill = requireValue("pill", args.pill || (await ask("Pill sub-question")));

  const optionsRaw = requireValue(
    "options",
    args.options || (await ask("Options (3 or 4, comma-separated)")),
  );
  const options = optionsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (options.length !== 3 && options.length !== 4) {
    console.error(`options must be 3 or 4 items, got ${options.length}`);
    exit(2);
  }

  const leadIn =
    args["lead-in"] !== undefined
      ? args["lead-in"]
      : interactive
        ? await ask("Lead-in (above title, empty to hide)", "")
        : "";

  const cta =
    args.cta !== undefined
      ? args.cta
      : interactive
        ? await ask("Bottom CTA", DEFAULT_CTA)
        : DEFAULT_CTA;

  const bg =
    args.bg !== undefined
      ? args.bg
      : interactive
        ? await ask("Background video (path / URL / sample)", "sample")
        : "sample";

  const dirDefault = `./quiz-video-${timestamp()}`;
  const dir = args.dir || (interactive ? await ask("Target directory", dirDefault) : dirDefault);

  return {
    dir: resolve(cwd(), dir),
    title,
    pill,
    options,
    leadIn,
    cta,
    bg,
    genIcons: !!args["gen-icons"],
    render: !!args.render,
    quality: args.quality || "standard",
  };
}

function scaffold(targetDir) {
  if (existsSync(targetDir)) {
    const entries = readdirSync(targetDir);
    if (entries.length > 0) {
      console.error(`Target ${targetDir} is not empty.`);
      exit(3);
    }
  } else {
    mkdirSync(targetDir, { recursive: true });
  }

  cpSync(TEMPLATE_DIR, targetDir, {
    recursive: true,
    filter: (src) => {
      const rel = relative(TEMPLATE_DIR, src);
      if (rel === "") return true;
      const top = rel.split("/")[0];
      return !EXCLUDE_TOP.has(top);
    },
  });
}

function patchPackageJson(targetDir) {
  const pkgPath = join(targetDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = basename(targetDir)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "") || "quiz-video";
  delete pkg.bin;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function escapeForAttr(jsonString) {
  return jsonString.replace(/'/g, "&apos;").replace(/&(?!apos;|amp;)/g, "&amp;");
}

function escapeForScript(jsonString) {
  return jsonString.replace(/</g, "\\u003c");
}

function patchIndexHtml(targetDir, inputs) {
  const path = join(targetDir, "index.html");
  let html = readFileSync(path, "utf8");
  const { options, title, pill, leadIn, cta, genIcons } = inputs;
  const letters = ["a", "b", "c", "d"];
  const SAMPLE_ICON_NAMES = [
    "icon-a-bow.png",
    "icon-b-cutlery.png",
    "icon-c-giftbox.png",
    "icon-d-bag.png",
  ];

  const iconPaths = options.map((subject, i) => {
    if (genIcons) {
      return `assets/icon-${letters[i]}-${slug(subject, letters[i])}.png`;
    }
    return `assets/${SAMPLE_ICON_NAMES[i]}`;
  });

  // Build the data-composition-variables JSON array
  const varArray = [
    { id: "leadIn", type: "string", label: "引導句", default: leadIn },
    { id: "title", type: "string", label: "主標題", default: title },
    { id: "pill", type: "string", label: "子題（粉色 pill）", default: pill },
    { id: "quote", type: "string", label: "底部引言", default: cta },
    ...iconPaths.map((p, i) => ({
      id: `icon${letters[i].toUpperCase()}`,
      type: "string",
      label: `選項 ${letters[i].toUpperCase()} icon 路徑`,
      default: p,
    })),
  ];
  const attrValue = escapeForAttr(JSON.stringify(varArray));
  html = html.replace(
    /data-composition-variables='[^']*'/,
    `data-composition-variables='${attrValue}'`,
  );

  // Build the JS fallback object
  const fallbackObj = {
    leadIn,
    title,
    pill,
    quote: cta,
    ...Object.fromEntries(iconPaths.map((p, i) => [`icon${letters[i].toUpperCase()}`, p])),
  };
  const fallbackJs = escapeForScript(JSON.stringify(fallbackObj, null, 2))
    .split("\n")
    .map((line, i) => (i === 0 ? line : "          " + line))
    .join("\n");
  html = html.replace(/: \{[\s\S]*?\};/, `: ${fallbackJs};`);

  // Patch each <img> src so direct preview shows the right file
  for (let i = 0; i < options.length; i++) {
    const letter = letters[i];
    const regex = new RegExp(`(<img id="icon-${letter}"[^>]*src=")[^"]*(")`);
    html = html.replace(regex, `$1${iconPaths[i]}$2`);
  }

  // 3-option layout surgery
  if (options.length === 3) {
    html = html.replace(
      /grid-template-columns: repeat\(2, 1fr\);/,
      "grid-template-columns: repeat(3, 1fr);",
    );
    html = html.replace(
      /\s*<div class="opt">\s*<div id="letter-d"[^<]*<\/div>\s*<img id="icon-d"[^>]*\/?>\s*<\/div>/,
      "",
    );
    html = html.replace(/,\s*"#letter-d"/g, "");
    html = html.replace(/,\s*"#icon-d"/g, "");
    html = html.replace(/\s*document\.getElementById\("icon-d"\)\.src = v\.iconD;/, "");
  }

  writeFileSync(path, html);
}

function patchGenIcons(targetDir, inputs) {
  const path = join(targetDir, "scripts/gen-icons.mjs");
  let js = readFileSync(path, "utf8");
  const letters = ["a", "b", "c", "d"];

  const entries = inputs.options
    .map((subject, i) => {
      const name = `icon-${letters[i]}-${slug(subject, letters[i])}.png`;
      return `  {
    name: ${JSON.stringify(name)},
    subject: ${JSON.stringify(subject + ", single object centered")},
  },`;
    })
    .join("\n");

  js = js.replace(/const ICONS = \[[\s\S]*?\];/, `const ICONS = [\n${entries}\n];`);
  writeFileSync(path, js);
}

function handleBackgroundVideo(targetDir, bg) {
  if (!bg || bg === "sample") return;
  const dest = join(targetDir, "assets/bg-coffee.mp4");

  if (bg.startsWith("http://") || bg.startsWith("https://")) {
    const tmp = `/tmp/quiz-video-bg-${Date.now()}.mp4`;
    console.log(`Downloading background from ${bg} ...`);
    const dl = spawnSync("curl", ["-L", "-o", tmp, bg], { stdio: "inherit" });
    if (dl.status !== 0) {
      console.error("curl failed");
      exit(4);
    }
    console.log("Re-encoding to 1080×1920 with proper keyframes ...");
    const ff = spawnSync(
      "ffmpeg",
      [
        "-y", "-stream_loop", "1", "-i", tmp, "-t", "10",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-g", "30", "-keyint_min", "30", "-movflags", "+faststart",
        dest,
      ],
      { stdio: "inherit" },
    );
    rmSync(tmp, { force: true });
    if (ff.status !== 0) {
      console.error("ffmpeg failed");
      exit(4);
    }
  } else {
    const src = resolve(cwd(), bg);
    if (!existsSync(src)) {
      console.error(`bg not found: ${src}`);
      exit(4);
    }
    copyFileSync(src, dest);
  }
}

function runNpm(targetDir, ...npmArgs) {
  const r = spawnSync("npm", npmArgs, { cwd: targetDir, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`npm ${npmArgs.join(" ")} failed`);
    exit(5);
  }
}

async function main() {
  const inputs = await resolveInputs();
  rl?.close();

  console.log(`\nScaffolding to ${inputs.dir} ...`);
  scaffold(inputs.dir);
  patchPackageJson(inputs.dir);
  patchIndexHtml(inputs.dir, inputs);
  if (inputs.genIcons) patchGenIcons(inputs.dir, inputs);

  console.log("Installing dependencies ...");
  runNpm(inputs.dir, "install");

  handleBackgroundVideo(inputs.dir, inputs.bg);

  if (inputs.genIcons) {
    if (!process.env.GEMINI_API_KEY) {
      console.error("--gen-icons requires GEMINI_API_KEY env var.");
      exit(6);
    }
    console.log("Generating icons via Gemini ...");
    runNpm(inputs.dir, "run", "gen-icons");
  }

  if (inputs.render) {
    console.log("Rendering MP4 ...");
    const npmArgs = ["run", "render"];
    if (inputs.quality === "draft") npmArgs.push("--", "--quality", "draft");
    runNpm(inputs.dir, ...npmArgs);
    console.log(`\nDone. MP4 in ${inputs.dir}/renders/`);
  } else {
    console.log(`\nDone. Next:\n  cd ${inputs.dir}\n  npm run render`);
  }
}

main().catch((e) => {
  console.error(e);
  exit(1);
});
