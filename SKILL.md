---
name: create-quiz-video
description: Scaffold and render a vertical 9:16 (1080×1920) "quiz card" video — a lead-in line, a main question title, a divider, a pink pill sub-question, 3 or 4 lettered options (A/B/C[/D]) with sticker-style icons in a grid, and a bottom CTA, all layered over a background video. Use when the user wants to create a quiz video, 選擇題影片, IG Reels quiz, TikTok quiz, social-media multiple-choice card, "你最喜歡哪款 X" style poll video, or anything matching that visual structure.
---

# create-quiz-video

Scaffolds a runnable [HyperFrames](https://hyperframes.heygen.com/) project from a vetted template into a directory of the user's choice, then customizes content and renders MP4.

This skill's own directory IS the template — every file alongside this `SKILL.md` (except `SKILL.md` itself and `README.md`) is part of the scaffold. After `npx skills add bobwei/quiz-video` the skill lives at `.agents/skills/quiz-video/` (or wherever the agent installs skills); copy that directory into a new project location and you have a runnable HyperFrames project.

## Fast path — just use the CLI

If the user's request maps cleanly to the template (lead-in + title + pill + 3-4 options + CTA, no custom layout changes), prefer the bundled CLI over scaffolding manually:

```bash
npx github:bobwei/quiz-video \
  --dir <target> \
  --title "..." --pill "..." --options "a,b,c,d" \
  --lead-in "..." --cta "..." \
  --bg <path|url|sample> \
  --gen-icons --render
```

It handles steps 2-6 below in one command (scaffold, content variables, 3-vs-4-option layout surgery, background swap, Gemini icon gen, render). Reach for the manual steps only when the user wants something the CLI doesn't expose — custom layout, extra options, swapping fonts, etc.

## When to invoke

Trigger phrases (Chinese + English): "做 quiz 影片", "建立選擇題影片", "做一支 IG quiz", "套那個 quiz 模板", "create a quiz card video", "make a multiple-choice reel", "你最喜歡哪款 X 影片".

Don't invoke for: general HyperFrames composition (use the `hyperframes` skill), single-scene title cards, narration-driven videos, or anything that isn't the title + pill + lettered options layout.

## Prerequisites

Check before scaffolding. Bail with a clear error if missing:

- Node.js 22+ (`node --version`)
- FFmpeg (`ffmpeg -version`) — `brew install ffmpeg` on macOS
- `GEMINI_API_KEY` env var, **only if** the user wants AI-generated icons (skip if they're providing PNGs)

## Step 1 — Collect inputs from the user

Ask in one batch (use AskUserQuestion if available, otherwise a numbered list). Required:

1. **Project directory** — where to scaffold (default: current working dir + `/quiz-video-NN`)
2. **Lead-in line** (small text above title, e.g. `究竟他`, optional — empty hides it)
3. **Title** (the question, e.g. `為什麼不對關係做選擇`) — keep to ~10 characters or it wraps awkwardly at 86px
4. **Pill sub-question** (e.g. `你最喜歡哪款包裝`)
5. **Option count** — 3 or 4
6. **Option subjects** — short English/Chinese phrase per option (e.g. "pink ribbon bow", "kraft paper bag with twine"). These become both the Gemini icon prompts and the visual hint to the viewer. **Don't display these as text on screen** — only the letter A/B/C/D shows.
7. **Bottom CTA** (e.g. `「留言你的答案，領取下一步策略」`)
8. **Background video** — file path, URL to download, or "use sample" (the bundled `assets/bg-coffee.mp4`)

## Step 2 — Scaffold the project

```bash
SKILL_DIR=$(dirname "$(realpath <path-to-SKILL.md>)")   # the dir containing THIS SKILL.md
TARGET=<user-chosen-dir>

rsync -a --exclude SKILL.md --exclude README.md --exclude .git "$SKILL_DIR/" "$TARGET/"
cd "$TARGET"
npm install
```

`rsync --exclude` strips the two skill-meta files so the scaffolded project doesn't carry them. Everything else — `index.html`, `assets/`, `fonts/`, `scripts/`, `package.json`, `hyperframes.json`, `meta.json`, `AGENTS.md`, `CLAUDE.md` — copies over as the working project. `npm install` then fetches `sharp` (used by icon post-processing). HyperFrames itself runs via `npx`, no install needed.

## Step 3 — Set the background video

- If user gave a local path: `cp <user-path> assets/bg-coffee.mp4`
- If user gave a URL: `curl -L <url> -o /tmp/raw.mp4` then re-encode to 1080×1920 with proper keyframes:
  ```bash
  ffmpeg -y -stream_loop 1 -i /tmp/raw.mp4 -t 10 \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
    -an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
    -g 30 -keyint_min 30 -movflags +faststart \
    assets/bg-coffee.mp4
  ```
  (The `-stream_loop 1 -t 10` loops short clips to fill the 10-second composition. Adjust `-g 30 -keyint_min 30` — without it hyperframes warns about sparse keyframes causing seek failures.)
- If "use sample": leave the bundled `assets/bg-coffee.mp4` alone.

## Step 4 — Generate icons (if user didn't provide PNGs)

Edit `scripts/gen-icons.mjs` — replace the `ICONS` array with the user's 3 or 4 option subjects:

```js
const ICONS = [
  { name: "icon-a-<slug>.png", subject: "<user's subject 1, expanded to a visually descriptive English phrase>" },
  { name: "icon-b-<slug>.png", subject: "<user's subject 2>" },
  // ...
];
```

Use descriptive English subjects even if the user wrote Chinese — Gemini understands both but English yields more consistent results. Always include: color hint, shape hint, "single object centered". The `STYLE` template handles the rest (flat, soft pastel, no outline, white bg).

Then run:

```bash
npm run gen-icons
```

This calls Gemini, saves to `assets/`, and auto-runs `post-process-icons.mjs` which strips the white background and trims transparent margins so all icons render at consistent visual size.

If user only wants 3 options, generate 3 icons and update `index.html` (see Step 5).

## Step 5 — Update the composition

The template has 4 options by default and uses `data-composition-variables` for content.

**Simple path (content only, 4 options)** — set the variable defaults in `index.html` `data-composition-variables`:

```html
<html data-composition-variables='[
  {"id":"leadIn","type":"string","label":"引導句","default":"<user lead-in>"},
  {"id":"title","type":"string","label":"主標題","default":"<user title>"},
  {"id":"pill","type":"string","label":"子題","default":"<user pill>"},
  {"id":"quote","type":"string","label":"底部引言","default":"<user CTA>"},
  {"id":"iconA","type":"string","default":"assets/icon-a-<slug>.png"},
  ...
]'>
```

**3 options instead of 4** — in `index.html`:
- Change `.options { grid-template-columns: repeat(4, 1fr) }` → `repeat(3, 1fr)`
- Delete the 4th `<div class="opt">` block (letter-d + icon-d)
- Remove `#letter-d` and `#icon-d` from the two `gsap.from([...])` stagger arrays
- Remove the `iconD` line from `data-composition-variables` and from the JS fallback object
- Remove the `document.getElementById("icon-d").src = v.iconD;` line

## Step 6 — Verify and render

```bash
npm run check                       # lint + inspect (validate is excluded — see note below)
npm run render                      # standard quality MP4 → renders/<timestamp>.mp4
npm run render -- --quality draft   # faster iteration
```

`npm run render` automatically runs the `prerender` hook → `stamp-assets.mjs`, which appends `?v={sha1-hash}` to every asset URL in `index.html` so browser caches never serve stale media when assets change.

Hand the user the final MP4 path. If they want to iterate, they edit variables and re-render; assets they replace get auto-rebusted on the next stamp.

## Layout reference

```
1080 × 1920 vertical canvas, dark radial-tint over bg video

  ┌────────────────────────────────┐
  │                                │
  │           究竟他                │  lead-in    70px jf-openhuninn
  │     為什麼不對關係做選擇          │  title      86px (1 line — keep ≤10 chars)
  │  ────────────────────────────  │  divider
  │      ▓▓ 你最喜歡哪款包裝 ▓▓      │  pill       58px on pink rgba(232,122,156,0.85)
  │                                │
  │    A           B               │  letter 84px
  │   [icon-A]    [icon-B]         │  icon 280×280 (sharp-trimmed for uniform size)
  │    C           D               │
  │   [icon-C]    [icon-D]         │
  │                                │
  │   「留言你的答案,領取下一步策略」  │  CTA 48px italic
  │                                │
  └────────────────────────────────┘
```

10s GSAP timeline: lead-in fades in → title slides up → divider scales horizontally → pill pops in (`back.out(2)`) → letters stagger up → icons pop in (`back.out(1.8)`) → CTA fades in. Sequence finishes around 4.5s and holds for the remaining 5.5s.

Design: `jf-openhuninn` (粉圓, justfont's open-source rounded Chinese font), pink pill, dark vignette. Don't substitute these without a reason — they're chosen for the playful Chinese-language quiz aesthetic.

## Variable reference

| Variable  | Type   | Default                             | Notes                                          |
| --------- | ------ | ----------------------------------- | ---------------------------------------------- |
| `leadIn`  | string | `究竟他`                              | Small text above title; empty string hides it  |
| `title`   | string | `為什麼不對關係做選擇`                  | Main question, ≤10 chars to fit one line       |
| `pill`    | string | `你最喜歡哪款包裝`                     | Pink pill sub-question                          |
| `quote`   | string | `「留言你的答案，領取下一步策略」`         | Bottom CTA                                      |
| `iconA-D` | string | `assets/icon-{a-d}-{name}.png`     | Path relative to project root                  |

Override per render: `npm run render -- --variables '{"title":"...", "pill":"..."}'`

## Things to know

- **Don't run `validate`.** HyperFrames `validate` (part of `npm run check` upstream) has a bug where it 404s on URLs with query strings, and our cache-busting appends `?v=hash`. The template's `npm run check` deliberately runs only `lint + inspect`. Render and Studio preview are unaffected.
- **Icons need transparent backgrounds.** Gemini sometimes returns icons with anti-aliased edges that the threshold-based `post-process-icons.mjs` leaves as faint outlines. If you see those in the render, re-generate with a prompt emphasizing "pure white background #FFFFFF, no gradient" or bump `WHITE_THRESHOLD` in the post-process script.
- **Background keyframes matter.** If a user-provided bg video shows freezing or wrong frame at certain timestamps, re-encode with `-g 30 -keyint_min 30` (every 30 frames = 1 keyframe at 30fps). HyperFrames warns about this in render output.
- **Don't add a CLI entry like `create-quiz-video`.** Skill is the entry point. Don't pollute npm.

## Files in this skill

The repo root *is* the template. Everything except `SKILL.md` and `README.md` gets copied into the scaffolded project.

```
quiz-video/  (this skill's directory)
├── SKILL.md                       agent-facing instructions (this file) — NOT copied to scaffold
├── README.md                      human-facing readme — NOT copied to scaffold
├── index.html                     composition + GSAP timeline + variable defaults
├── hyperframes.json
├── meta.json
├── package.json                   npm scripts: dev / check / render / gen-icons / stamp
├── package-lock.json
├── AGENTS.md                      hyperframes-init's own agent notes (don't edit)
├── CLAUDE.md                      same
├── scripts/
│   ├── gen-icons.mjs              Gemini sticker icon generation
│   ├── post-process-icons.mjs     sharp: strip white bg + auto-trim
│   └── stamp-assets.mjs           content-hash asset URLs for cache-busting
├── fonts/
│   └── jf-openhuninn.woff2        justfont 粉圓 (Apache 2.0)
└── assets/                        sample content — replace as needed
    ├── bg-coffee.mp4
    └── icon-{a,b,c,d}-*.png
```
