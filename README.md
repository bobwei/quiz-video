# create-quiz-video

Scaffolds and renders vertical 9:16 "quiz card" videos — title + sub-question pill + 3 or 4 lettered options with sticker icons over a background video.

Built on [HyperFrames](https://hyperframes.heygen.com/) (HTML → MP4).

## Quick start — `npx`

One command. Asks for any missing inputs interactively:

```bash
npx github:bobwei/quiz-video
```

Or pass everything as flags (AI-friendly, fully non-interactive):

```bash
npx github:bobwei/quiz-video \
  --title "為什麼不對關係做選擇" \
  --pill "你最喜歡哪款包裝" \
  --options "pink ribbon bow,kraft paper bag,glass jar,wooden box" \
  --lead-in "究竟他" \
  --gen-icons \
  --render
```

End-to-end output: a scaffolded project directory + an MP4 in `./renders/`.

### Flags

| Flag                          | Description                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| `--dir <path>`                | Target directory (default: `./quiz-video-<timestamp>`)                     |
| `--title <str>`               | Main title — required                                                      |
| `--pill <str>`                | Pink pill sub-question — required                                          |
| `--options <csv>`             | 3 or 4 comma-separated option subjects — required                          |
| `--lead-in <str>`             | Small text above title (default: empty = hidden)                           |
| `--cta <str>`                 | Bottom CTA (default: `「留言你的答案，領取下一步策略」`)                       |
| `--bg <path \| url \| sample>` | Background video (default: `sample`)                                      |
| `--gen-icons`                 | Generate option icons via Gemini (needs `GEMINI_API_KEY`)                  |
| `--render`                    | Run `npm run render` at the end                                            |
| `--quality <q>`               | `draft` or `standard` (default: `standard`, only with `--render`)          |
| `-y, --yes`                   | Non-interactive; fail if required flags missing                            |
| `-h, --help`                  | Show help                                                                  |

## Install as an agent skill (optional)

```bash
npx skills add bobwei/quiz-video
```

Restart your agent session. The skill registers under `create-quiz-video` and the agent reads `SKILL.md` to understand the layout, variables, and gotchas — useful if you want the AI to make custom edits beyond what the CLI exposes.

## Use directly (no CLI, no agent)

This repo is also a runnable HyperFrames project:

```bash
git clone https://github.com/bobwei/quiz-video.git
cd quiz-video
npm install

# Edit index.html data-composition-variables, then:
npm run render            # standard quality → renders/<timestamp>.mp4
npm run render -- --quality draft   # faster iteration
npm run dev               # http://localhost:3002 hot-reload preview

# Optional — regenerate sticker icons via Gemini:
export GEMINI_API_KEY=...
# edit scripts/gen-icons.mjs ICONS array, then:
npm run gen-icons
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
