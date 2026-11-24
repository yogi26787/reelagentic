---
name: reelagentic
description: Edit a raw talking-head video into a finished 1080x1920 reel - cut pauses and retakes, word-by-word captions (50+ languages incl. Hindi/Hinglish), text behind the speaker, motion graphics, zooms, transitions, SFX and music, storyboard approval, then render with a cover image and post caption. Use when the user gives a video and asks for a reel/short/edit, or asks to change a reel made with ReelAgentic.
---

# ReelAgentic: your AI reel editor

Scripts live in `${CLAUDE_PLUGIN_ROOT}/scripts/` (call them `$RF`). Run them with the Python in
`~/.reelagentic/config.json` → `"python"` (written `python3` below; usually `python` on Windows).
Config also holds the Studio folder, Whisper model, vision backend (Apple Vision on macOS,
MediaPipe on Windows) and `bridges` to companion tools. If it is missing, run `/reelagentic:setup`.
Works the same on macOS and Windows.

## Hard rules
1. **Storyboard before render.** Never run `render.py final` until the user approved the storyboard
   (or said "just render it").
2. Source videos are never modified. Every output goes in `<video folder>/<video stem>-reel/` (the edit dir).
3. `storyboard.json` is the single source of truth. Changes = edit it, re-run storyboard/preview.
4. Timing is in **output seconds** (after cutting). Read times from `words_cut.json`, never guess.
5. Use only effect names from `catalog.py`. New look needed → write a custom effect (see below).
6. Read `<Studio>/brand/brand.json` and `<Studio>/my-style.md` before planning; follow them.
7. Captions must say what was said. Fix Whisper mistakes in `words_cut.json` text (keep times).
   For Hinglish in Roman script, rewrite Devanagari words to Roman (`hai`, `kya`, `dosto`), and the
   other way when the user wants native script. Same number of words where possible.
8. Long renders (>60 s reel) run in the background.
9. Keep text out of Instagram's UI: `y` between 0.08 and 0.79, nothing right of x 0.86 in the lower
   half. render.py prints `safe zone:` warnings; fix every one. Storyboard stills show the zones in red.
10. If the user names a style (`<Studio>/styles/<name>.json`), its rules and `never` list beat the
    defaults below. Workspace house-style notes (e.g. a CLAUDE.md in the video folder) beat both.

## Workflow

### 1. Intake (one message)
Ask only what the brief leaves open, in one short message: style/look, caption style, text behind
you yes/no, CTA, music (file, or a trending-audio clip + the full song)? Offer "or I decide". Check
`<Studio>/` for logos, b-roll, music, `grades/`, `styles/*.json` the brief mentions.

### 2. Listen and cut
```
python3 $RF/transcribe.py VIDEO EDIT --lang auto        # Hindi/Hinglish: --lang hi --prompt "Haan toh dosto, aaj hum baat karenge"
python3 $RF/cut.py VIDEO EDIT --grade auto              # --fit pad for landscape footage, --pause 0.3 for faster pace
```
cut.py also cleans the voice (rumble cut, denoise, light compression; `--no-enhance` to skip) and
grades the footage in FFmpeg: `--grade auto` (auto-enhance: levels exposure/saturation), a name from
`<Studio>/grades/` or the built-ins (`subtle, punchy, teal-orange, warm-dusk, lake-day, sports-punch,
mono-film, bright-clean`), a filter file, or `none`. Change it later with `cut.py VIDEO EDIT --edl --grade NAME`.
**Speed ramps / slow motion:** split a segment in `edl.json` and give the part a third value,
e.g. `[12.4, 13.4, 0.5]` (half speed; 2 = double), set `"smoothSlowmo": true` for interpolated
slow-mo, then `cut.py VIDEO EDIT --edl`. Captions and timings follow automatically.
Read `edl.json` → `removed`: report what was cut (pauses, retakes, fillers) in one line. If a retake
cut looks wrong (the user restated on purpose), edit `edl.json` segments and run `cut.py VIDEO EDIT --edl`.
Read `words_cut.json` and fix the caption text now (rule 7).

### 3. See the person
```
python3 $RF/vision.py faces EDIT      # face boxes: zoom focus, FaceLock, cover framing
python3 $RF/vision.py matte EDIT      # only if text-behind-you is used: makes fg.webm
```
Look at one frame of `matte.mp4` (`ffmpeg -ss 2 -i EDIT/matte.mp4 -frames:v 1 EDIT/m.png`): the person
should be white. If it is empty, text-behind won't work on this clip; tell the user and use front layer.

### 4. Plan the storyboard
Run `python3 $RF/catalog.py` for effects, captions, looks, SFX. Then write `EDIT/storyboard.json`:

```json
{
  "fps": 30, "width": 1080, "height": 1920, "duration": 41.2,
  "video": "cut.mp4", "foreground": "fg.webm",
  "look": "creator-yellow",
  "captions": {"style": "pop", "position": 0.74, "highlight": ["free", "10x"], "hide": [[0, 1.6]]},
  "music": {"src": "studio:music/upbeat.mp3", "volume": 0.12, "duck": true},
  "zooms": [{"start": 3.2, "end": 4.8, "scale": 1.3, "type": "punch"}],
  "transitions": [{"time": 12.4, "type": "whip"}],
  "broll": [{"start": 20, "end": 23, "src": "studio:broll/laptop.mp4", "mode": "pip"}],
  "progressBar": true,
  "moments": [
    {"id": 1, "start": 0, "end": 1.6, "effect": "HookTitle", "props": {"text": "3 tools that save *10 hours*"}, "sfx": "studio:sfx/whoosh.wav"},
    {"id": 2, "start": 1.6, "end": 3.4, "effect": "TextBehind", "layer": "behind", "props": {"text": "AI TOOLS"}},
    {"id": 3, "start": 5.0, "end": 7.2, "effect": "AppCard", "props": {"name": "Notion", "logo": "studio:logos/notion.so.png", "tagline": "Writes my scripts"}, "sfx": "studio:sfx/pop.wav"}
  ],
  "cover": {"title": "3 tools that save *10 hours*", "subtitle": "#1 is free"}
}
```
`duration` = `ffprobe` duration of `cut.mp4`. `"captions": null` turns captions off. `*word*` = accent colour.
Assets: `studio:<path>` = file in the Studio folder. App logos: `python3 $RF/fetch_logo.py notion.so`.

**Music and beats.**
- Trending audio: if the user has a short clip of the reel audio plus the full song, find where the
  clip starts: `python3 $RF/song_offset.py CLIP SONG` → use it as `music.startFrom`.
- Beat markers: `python3 $RF/beats.py SONG EDIT --start <startFrom>` writes `beats.json` (bpm, beats,
  bars). Place moments, zooms and transitions on beats/bars, and set `"beatSync": true` so render.py
  snaps anything within 0.12 s onto the beat.
- Licensed / label songs: set `"music": {..., "labelSong": true}`. The final export then has an
  `-upload.mp4` without the music (the user picks the song in Instagram's audio picker so it stays
  licensed and the reel gets the audio page) and a `-preview.mp4` with it.

**Cutout effects** (need `vision.py matte`): `BackgroundSwap` (green screen, layer behind),
`ColorPop` (world black-and-white, you in colour, layer behind), `PersonEcho` (delayed trail, layer
behind), `PersonOutline` (sticker outline + pop-out, front), plus `TextBehind`.

Editing taste (defaults, override with the brief / my-style.md):
- Hook in the first 1.5 s: HookTitle or SplitHeadline or TextBehind, plus a punch zoom.
- A moment every 2-4 s on the words that matter; anchor each moment to the word it illustrates.
- Graphics live in the top 45% of the frame; captions at 0.72-0.78; never cover the face
  (check `faces.json`). Hide captions (`captions.hide`) under big centre titles.
- 1 SFX per moment max, whoosh on transitions, pop on cards, cash on money, typing on prompts.
- Punch zooms on emphasis words, alternate 1.0 / 1.25 / 1.15; smooth zoom on story beats.
- End with FollowCTA or the user's CTA from brand.json.
- Instagram craft: say the payoff in the first line; 7-30 s for most reels; change something on
  screen every 2-3 s; make the last frame flow into the first so the reel loops; captions on by
  default (most people watch muted); cover title readable inside the 4:5 grid crop (the Cover does this).

### 5. Storyboard → approval
```
python3 $RF/render.py storyboard EDIT        # prints the timeline + makes EDIT/storyboard.png
```
Show the user `storyboard.png` and the numbered moment list (time, effect, text). Ask for changes
in plain words. Apply them to storyboard.json, re-run. For motion checks: `render.py preview EDIT`.

### 6. Final
```
python3 $RF/render.py final EDIT --name <short-name>
```
Write `EDIT/caption.txt` first (it is exported with the reel): hook line, 1-3 lines of value, CTA,
5-8 hashtags, in the user's language/script (Hinglish if they spoke Hinglish). Output lands in
`<Studio>/Exports/<name>/` (mp4, cover.png, caption.txt). The final is finished for Instagram:
1080x1920 H.264, 320 kbps AAC, loudness normalised to -14 LUFS / -1.5 dBTP. Check a few frames of
`final.mp4` before announcing it.

### 7. Learn
Append 1-3 lines to `<Studio>/my-style.md` about what the user changed or liked (e.g. "prefers
bold-caps captions", "no confetti"). Next reel follows it.

## Custom effects (anything not in the library)
Write `<Studio>/custom-effects/<PascalName>.tsx`, then use `"effect": "<PascalName>"`. render.py
copies and registers it. Template:
```tsx
import React from "react";
import {At, FX, pop, useFX, useTheme, ease, src, glass} from "../kit";
/** One line: what it does. p: prop list */
export const VinylSpin: FX = ({p, dur}) => {
  const pal = useTheme();                 // pal.accent, pal.display, pal.body, pal.radius …
  const {f, fps, out} = useFX(dur);       // f = frame inside the moment, out = fade-out 1→0
  return <At y={p.y ?? 0.3} style={{opacity: out, transform: `translate(-50%,-50%) rotate(${f * 6}deg) scale(${pop(f, fps)})`}}>…</At>;
};
```
Use only `remotion` + React + `../kit` (no new npm packages). Deterministic: use `rand(seed)`, never
`Math.random()`. Verify with `render.py storyboard` and look at the still before using it in a reel.

## Companion tools (config `bridges`, set by `setup.py --workspace DIR`)
Use them when present; skip silently when absent.
- `video_use`: `"<python>" "<helpers>/timeline_view.py" EDIT/cut.mp4 START END` draws a filmstrip +
  waveform PNG: look at it before overriding a doubtful cut or retake.
- `manim_skill`: for maths, data or diagram explainers, read that SKILL.md, render the animation as a
  clip into `<Studio>/broll/` and use it as `broll` (full or split).
- `open_higgsfield`: AI image/video generation app (needs the user's own paid key). For AI b-roll,
  ask the user to generate it there and save it into `<Studio>/broll/`; never enter keys yourself.
- Workspace grades (`*-grade.txt`) are imported into `<Studio>/grades/`.

## Reference reel style match
See the match-style command. A style profile is `<Studio>/styles/<name>.json`:
`{"look", "palette", "captions": {style, position, uppercase}, "pace": {cut_pause, moments_per_10s},
"zooms": "...", "transitions": [...], "sfx": [...], "notes": "..."}`. Apply it when the user names it.
