# create-quiz-video

An AI-agent skill for scaffolding and rendering vertical "quiz card" videos — title + sub-question pill + lettered options with sticker icons over a background video.

Built on [HyperFrames](https://hyperframes.heygen.com/) (HTML → MP4).

## Install (as a skill)

```bash
npx skills add bobwei/quiz-video
```

Restart your agent session. The skill registers under `create-quiz-video`. Ask your agent something like:

> 用 create-quiz-video 幫我做一支選擇題影片，題目是 X，4 個選項是 A B C D

The agent reads `SKILL.md`, asks for whatever inputs it still needs, copies this repo's files into a new project directory (excluding `SKILL.md` and this README), generates Gemini sticker icons for each option, and renders the MP4.

## Use directly (no agent)

This repo is also a runnable HyperFrames project:

```bash
git clone https://github.com/bobwei/quiz-video.git
cd quiz-video
npm install

# Edit index.html data-composition-variables to set your title / pill / options
# Or pass at render time:
npm run render -- --variables '{"title":"...", "pill":"..."}'

# Optional — regenerate the sticker icons via Gemini:
export GEMINI_API_KEY=...
# edit scripts/gen-icons.mjs ICONS array, then:
npm run gen-icons

npm run render            # standard quality → renders/<timestamp>.mp4
npm run render -- --quality draft   # faster iteration
npm run dev               # http://localhost:3002 hot-reload preview
```

## Requirements

- Node.js 22+
- FFmpeg (`brew install ffmpeg` on macOS)
- `GEMINI_API_KEY` env var — only if you want AI-generated icons (skip if you provide your own PNGs)

## What's in the repo

```
quiz-video/
├── SKILL.md            ← agent-facing skill instructions
├── README.md           ← this file
├── index.html          ← composition + GSAP timeline + data-composition-variables
├── scripts/            ← gen-icons (Gemini) + post-process (sharp) + stamp (cache-bust)
├── fonts/              ← jf-openhuninn (粉圓)
├── assets/             ← sample bg + 4 sample sticker icons
├── package.json        ← npm scripts
├── hyperframes.json    ← hyperframes project config
└── meta.json
```

See `SKILL.md` for the full layout reference, variable list, 3-vs-4-options switch, and gotchas.

## License

Apache 2.0 for code. `fonts/jf-openhuninn.woff2` is [justfont/open-huninn-font](https://github.com/justfont/open-huninn-font), licensed Apache 2.0.
