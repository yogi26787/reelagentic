# Reel Maker by Yogi

A Claude Code plugin that turns Claude into your reel editor.

Drop in a raw talking-head video and say what you want in one line. Claude cuts the pauses and
retakes, writes word-by-word captions, adds motion graphics, text behind you, zooms, transitions and
sound effects, shows you a storyboard to approve, then renders a 1080×1920 MP4 with a cover image
and a ready-to-paste post caption.

Everything runs on your Mac: whisper.cpp for speech, Apple Vision for the person cut-out, Remotion
and FFmpeg for rendering. Your videos are never uploaded.

## Install

You need macOS 12+ and [Claude Code](https://claude.com/claude-code), plus:

```bash
brew install ffmpeg whisper-cpp node
```

```bash
xcode-select --install
```

```bash
pip3 install numpy
```

Then add the plugin:

```bash
claude plugin marketplace add yogi26787/reel-maker
```

```bash
claude plugin install reel-maker@reel-maker-by-yogi
```

Start a new Claude Code session and run `/reel-maker:setup`. It installs the render engine into
`~/.reel-maker/`, compiles the Vision helper, downloads a Whisper model (it asks first) and creates
your Studio folder.

## Use

```
/reel-maker:edit ~/Movies/take.mp4 fitness tips, energetic, text behind me, follow CTA at the end
/reel-maker:match-style <reel file or URL>        # learn a reference reel's style
/reel-maker:new-effect a spinning vinyl record with my logo   # Claude builds a new effect and saves it
```

Every edit goes: transcribe → cut → storyboard → your changes in plain words → final render. For the
best results use Opus at high effort.

## What's inside

| Feature | How |
|---|---|
| Cuts pauses, retakes and fillers | `scripts/cut.py`: silence detection + repeated-phrase retake finder; editable `edl.json` |
| Word-by-word captions, 50+ languages, Hindi / Hinglish in Roman or native script | `scripts/transcribe.py` (whisper.cpp); Claude fixes the caption text |
| 13 caption styles | `engine/src/captionStyles.ts` (pop, karaoke, box, bold-caps, neon, typewriter, hindi…) |
| 14 looks + your brand palette | `engine/src/theme.ts`, overridden by `<Studio>/brand/brand.json` |
| Text behind you | `scripts/vision.py matte` (Apple Vision person segmentation) |
| Face lock-on, zoom focus, title placed off your face, best cover frame | `scripts/vision.py faces` |
| 45 motion effects | `engine/src/effects/` — list them with `python3 scripts/catalog.py` |
| Punch / smooth / shake zooms; whip, glitch, flash, film burn, light leak transitions | `zooms` and `transitions` in the storyboard |
| B-roll (full, picture-in-picture, split) | `broll` in the storyboard |
| Sound effects | 17 synthesised SFX in your Studio; add your own to `sfx/` |
| Music that ducks under speech | `music` in the storyboard |
| Storyboard before render | `scripts/render.py storyboard` → contact sheet |
| Reference-reel style match and "my style" memory | `/reel-maker:match-style`, `<Studio>/styles/`, `<Studio>/my-style.md` |
| Custom effects Claude designs for you | `/reel-maker:new-effect` → `<Studio>/custom-effects/*.tsx`, auto-registered |
| App and website logos | `scripts/fetch_logo.py <domain>` |
| Reel cover + post caption | rendered with every final export |

Effects include: hook titles, text behind you, split headlines, LED sign, stamps, tape labels, lower
thirds, callout arrows, app / website / search cards, prompt typing, cursor clicks, polaroids, card
drops, logo grids, money counter, glass bar charts, progress rings, stock ticker, price drop,
checklist, myth vs fact, tier list, versus, DM notifications, a comment that posts, iPhone toggles,
follow CTA, likes, confetti, emoji bursts, flip countdown, keyboard key rain, room tunnel, globe
flight, map pins, location tag, face lock-on, reels orbiting your head and spotlight.

## Layout

```
.claude-plugin/   plugin + marketplace manifests
commands/         /reel-maker:edit, :setup, :match-style, :new-effect
skills/reel-maker the editing workflow Claude follows
scripts/          transcribe, cut, vision (Swift), render, catalog, sfx, setup
engine/           Remotion project: Reel + Cover compositions, captions, looks, effects
```

## Notes

- **Mac only.** The person cut-out and face detection use Apple's Vision framework.
- **Whisper model.** `small` is a good default; `large-v3-turbo` is best for Hindi/Hinglish. Larger
  models give better word timing, which means better-synced captions.
- **HDR phone footage** needs an FFmpeg built with zimg (`brew install ffmpeg-full`) for tone mapping.
- **Remotion licence.** The render engine uses [Remotion](https://www.remotion.dev/license), which is
  free for individuals and companies of up to 3 people; larger companies need a Remotion company licence.
- Fonts come from Google Fonts (OFL). Logos fetched with `fetch_logo.py` belong to their owners.
- Not affiliated with Anthropic. Claude is a trademark of Anthropic.

## License

MIT — see [LICENSE](LICENSE).
