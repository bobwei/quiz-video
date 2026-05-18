# create-quiz-video

A reusable skill for AI coding agents (Claude Code, Cursor, Gemini CLI, etc.) to scaffold and render vertical "quiz card" videos — title + sub-question pill + lettered options with sticker icons over a background video.

Built on [HyperFrames](https://hyperframes.heygen.com/) (HTML → MP4).

## Sample output

1080×1920, 10s, IG Reels / TikTok / YouTube Shorts format.

Lead-in line, a main question, a pink pill sub-question, 2×2 grid of A/B/C/D options each with a Gemini-generated sticker icon, and a bottom CTA — all over a coffee-shop background loop.

## Install

```bash
npx skills add bobwei/quiz-video
```

Restart your agent session. The skill registers under `create-quiz-video`.

## Use

Ask your agent: *"用 create-quiz-video 幫我做一支選擇題影片，題目是 X，4 個選項是 A B C D"* (or similar). The agent reads `SKILL.md`, asks for any inputs it still needs, scaffolds the template into a new directory, generates icons via Gemini if you don't have your own, and renders to MP4.

## Manual use (no agent)

```bash
cp -r skills/create-quiz-video/templates my-video
cd my-video
npm install
# edit index.html data-composition-variables to set your content
GEMINI_API_KEY=... npm run gen-icons   # if you want AI icons
npm run render                          # → renders/*.mp4
```

## Requirements

- Node.js 22+
- FFmpeg
- `GEMINI_API_KEY` env var (only for AI icon generation; skip if you provide PNGs)

## What's in the skill

```
skills/create-quiz-video/
├── SKILL.md          ← agent-facing instructions
└── templates/        ← drop-in HyperFrames project
    ├── index.html    ← composition + GSAP timeline + data-composition-variables
    ├── scripts/      ← gen-icons (Gemini) + post-process (sharp) + stamp (cache-bust)
    ├── fonts/        ← jf-openhuninn (粉圓)
    └── assets/       ← sample bg + 4 sample sticker icons
```

See `skills/create-quiz-video/SKILL.md` for the full layout reference, variable list, and workflow.

## License

Apache 2.0 for code. `fonts/jf-openhuninn.woff2` is [justfont/open-huninn-font](https://github.com/justfont/open-huninn-font), licensed Apache 2.0.
