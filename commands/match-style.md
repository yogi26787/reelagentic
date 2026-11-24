---
description: Learn the editing style of a reference reel and save it as a reusable style profile
argument-hint: <reel file or URL> [style name]
---
Build a Reel Maker style profile from this reference: $ARGUMENTS

1. If it is a URL, download it with `yt-dlp -o "<Studio>/references/%(id)s.%(ext)s" URL` (ask first).
   Studio path is in `~/.reel-maker/config.json`.
2. Sample it: `ffmpeg -i REF -vf "fps=2,scale=270:-1,tile=6x5" <tmp>/sheet_%02d.png` and look at the sheets.
   Transcribe it with `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/transcribe.py REF <tmp>` to measure pace
   (words/sec, pause lengths) and where on-screen text appears relative to speech.
3. Describe what you see: caption font/case/size/position/colours/animation, graphic types and how often,
   zoom rhythm, transitions, colour grade, SFX density, music energy.
4. Map it onto Reel Maker pieces: nearest look + palette hex values, caption style (+ uppercase/position/size),
   effects that match its graphics, cut settings (`--pause`). If a signature graphic has no match, offer to
   build it as a custom effect (new-effect command).
5. Save `<Studio>/styles/<name>.json` (schema in the skill) and show the user a one-paragraph summary.
Never reuse the reference's footage, music, logo or text in the user's reels.
