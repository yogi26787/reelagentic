# ReelAgentic: your AI reel editor

*by Yogi*

A Claude Code plugin that turns Claude into your reel editor.

Drop in a raw talking-head video and say what you want in one line. Claude cuts the pauses and
retakes, writes word-by-word captions, adds motion graphics, text behind you, zooms, transitions and
sound effects, shows you a storyboard to approve, then renders a 1080×1920 MP4 with a cover image
and a ready-to-paste post caption.

Works on **macOS and Windows**. Everything runs on your computer: whisper.cpp for speech, Apple
Vision (macOS) or MediaPipe (Windows) for the person cut-out, Remotion and FFmpeg for rendering. Your
videos are never uploaded.

## Install

You need [Claude Code](https://claude.com/claude-code), plus:

**macOS 12+**

```bash
brew install ffmpeg whisper-cpp node
```

```bash
xcode-select --install
```

```bash
pip3 install numpy
```

**Windows 10/11**

```powershell
winget install Gyan.FFmpeg
```

```powershell
winget install OpenJS.NodeJS.LTS
```

Install Python 3.12 from python.org (MediaPipe has no wheels for newer versions yet), then:

```powershell
python -m pip install numpy mediapipe
```

For whisper.cpp, download `whisper-bin-x64.zip` from the
[whisper.cpp releases](https://github.com/ggml-org/whisper.cpp/releases) and unzip it; setup asks
for the path to `whisper-cli.exe`.

Then add the plugin (same on both):

```bash
claude plugin marketplace add yogi26787/reelagentic
```

```bash
claude plugin install reelagentic@reelagentic
```

Start a new Claude Code session and run `/reelagentic:setup`. It installs the render engine into
`~/.reelagentic/`, sets up the person cut-out (compiles the Apple Vision helper on macOS, downloads
MediaPipe's two small models on Windows), downloads a Whisper model (it asks first) and creates your
Studio folder. Already have a video workspace with grade files or
[video-use](https://github.com/browser-use/video-use)? Pass it with `--workspace` and ReelAgentic
imports the grades and uses its timeline view and Manim animations.

## Use

```
/reelagentic:edit ~/Movies/take.mp4 fitness tips, energetic, text behind me, follow CTA at the end
/reelagentic:shorts ~/Videos/podcast.mp4 top 3    # long video -> scored, reframed vertical shorts
/reelagentic:match-style <reel file or URL>        # learn a reference reel's style
/reelagentic:new-effect a spinning vinyl record with my logo   # Claude builds a new effect and saves it
```

Every edit goes: transcribe → cut → storyboard → your changes in plain words → final render. For the
best results use Opus at high effort.

## What's inside

| Feature | How |
|---|---|
| Cuts pauses, retakes and fillers | `scripts/cut.py`: silence detection + repeated-phrase retake finder; editable `edl.json` |
| Voice clean-up (rumble cut, denoise, compression) | `cut.py`, on by default |
| Auto-enhance, colour grades and 3D LUTs | `cut.py --grade auto`, 8 built-in grades, or your own `.txt` / `.cube` in `<Studio>/grades/` |
| Speed ramps and slow motion (optionally interpolated) | a third value on an `edl.json` segment, e.g. `[12.4, 13.4, 0.5]` |
| Word-by-word captions, 50+ languages, Hindi / Hinglish in Roman or native script | `scripts/transcribe.py`: whisper.cpp, or OpenAI Whisper word timestamps via faster-whisper / openai-whisper (`--engine python`) |
| Long video → shorts: Claude scores segments, snaps to sentences, reframes to 9:16 | `/reelagentic:shorts`, `scripts/shorts.py`, `scripts/track.py` (face or cursor/motion follow), `cut.py --fit follow` |
| 14 caption styles | `engine/src/captionStyles.ts` (pop, karaoke, box, bold-caps, neon, typewriter, lyric, hindi…) |
| 14 looks + your brand palette | `engine/src/theme.ts`, overridden by `<Studio>/brand/brand.json` |
| Text behind you | `scripts/vision.py matte` (Apple Vision on macOS, MediaPipe on Windows) |
| Green screen, colour pop, cutout outline, echo trail | `BackgroundSwap`, `ColorPop`, `PersonOutline`, `PersonEcho` effects |
| Face lock-on, zoom focus, title placed off your face, best cover frame | `scripts/vision.py faces` |
| 56 motion effects, incl. 3D (three.js), telestrator, step deck, beat-locked kinetic type | `engine/src/effects/` — list them with `python3 scripts/catalog.py` |
| HTML motion graphics as overlays | `scripts/hyperframes_clip.py` (HyperFrames) + `OverlayClip` |
| Style presets | 6 built-in (`kinetic-hype`, `step-deck`, `news-flash`, `hologram-hud`, `telestrator-breakdown`, `clean-minimal`) + your own |
| Punch / smooth / shake zooms; whip, glitch, flash, film burn, light leak transitions | `zooms` and `transitions` in the storyboard |
| B-roll (full, picture-in-picture, split) | `broll` in the storyboard |
| Sound effects | 17 synthesised SFX in your Studio; add your own to `sfx/` |
| Music that ducks under speech | `music` in the storyboard |
| Beat markers and beat-synced edits | `scripts/beats.py` + `"beatSync": true` |
| Trending audio: find where a clip sits in the full song | `scripts/song_offset.py` |
| Label songs: upload copy without music + preview with it | `"music": {"labelSong": true}` |
| Instagram finishing: -14 LUFS loudness, 320 kbps audio, UI safe-zone checks, cover safe in the 4:5 grid | `scripts/render.py final` |
| Storyboard before render | `scripts/render.py storyboard` → contact sheet |
| Reference-reel style match and "my style" memory | `/reelagentic:match-style`, `<Studio>/styles/`, `<Studio>/my-style.md` |
| Custom effects Claude designs for you | `/reelagentic:new-effect` → `<Studio>/custom-effects/*.tsx`, auto-registered |
| App and website logos | `scripts/fetch_logo.py <domain>` |
| Reel cover + post caption | rendered with every final export |

Effects include: green screen, colour pop, cutout outline, echo trail, hook titles, text behind you, split headlines, LED sign, stamps, tape labels, lower
thirds, callout arrows, app / website / search cards, prompt typing, cursor clicks, polaroids, card
drops, logo grids, money counter, glass bar charts, progress rings, stock ticker, price drop,
checklist, myth vs fact, tier list, versus, DM notifications, a comment that posts, iPhone toggles,
follow CTA, likes, confetti, emoji bursts, flip countdown, keyboard key rain, room tunnel, globe
flight, map pins, location tag, face lock-on, reels orbiting your head and spotlight.

## Works with the Claude video ecosystem

ReelAgentic runs on its own, and plugs into these open-source projects when you have them:

| Project | How ReelAgentic uses it |
|---|---|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | downloads reference reels and your own long videos for `/reelagentic:shorts` |
| [openai/whisper](https://github.com/openai/whisper) / [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | speech-to-text; `--engine python` uses Whisper's word timestamps |
| [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) | finishing tools: stabilise, straighten, denoise, redact, multicam sync, platform check and HTML report |
| [ychoi-kr/claude-ffmpeg-skill](https://github.com/ychoi-kr/claude-ffmpeg-skill) | FFmpeg recipe knowledge Claude can read for one-off jobs |
| [kurbaitaev/ghost-editor](https://github.com/kurbaitaev/ghost-editor) | inspired the telestrator and step-deck effects and named style presets |
| [AgriciDaniel/claude-shorts](https://github.com/AgriciDaniel/claude-shorts) | inspired long-to-short: segment scoring, sentence snapping, cursor-following reframe |
| [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | reference for 3D custom effects (the engine ships `@remotion/three`) |
| [iart-ai/motion-skills](https://github.com/iart-ai/motion-skills), [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics), [mattypark/Motion-graphics-skill](https://github.com/mattypark/Motion-graphics-skill) | motion-design craft Claude reads when building custom effects; inspired KineticType and the easing kit |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | renders HTML animations to transparent clips used as overlays |
| [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills) | where to find more |

Not included: MotionClone ([LPengYang](https://github.com/LPengYang/MotionClone),
[Bujiazi](https://github.com/Bujiazi/MotionClone)) is diffusion research code that needs a large NVIDIA
GPU and carries no licence, so it can't ship in or run alongside a laptop plugin.

## Layout

```
.claude-plugin/   plugin + marketplace manifests
commands/         /reelagentic:edit, :shorts, :setup, :match-style, :new-effect
skills/reelagentic the editing workflow Claude follows
scripts/          transcribe, cut, vision (Swift/MediaPipe), track, shorts, beats, song_offset,
                  hyperframes_clip, render, catalog, sfx, setup; grades/ and styles/ presets
engine/           Remotion project: Reel + Cover compositions, captions, looks, effects
```

## Notes

- **macOS and Windows.** Only the person cut-out differs: Apple Vision on macOS, MediaPipe on
  Windows (you can also choose MediaPipe on macOS with `setup.py --vision mediapipe`).
- **Whisper model.** `small` is a good default; `large-v3-turbo` is best for Hindi/Hinglish. Larger
  models give better word timing, which means better-synced captions.
- **HDR phone footage** needs an FFmpeg built with zimg (`brew install ffmpeg-full`) for tone mapping.
- **Remotion licence.** The render engine uses [Remotion](https://www.remotion.dev/license), which is
  free for individuals and companies of up to 3 people; larger companies need a Remotion company licence.
- Fonts come from Google Fonts (OFL). Logos fetched with `fetch_logo.py` belong to their owners.
- Not affiliated with Anthropic. Claude is a trademark of Anthropic.

## License

MIT — see [LICENSE](LICENSE).
