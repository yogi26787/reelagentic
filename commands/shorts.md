---
description: Turn a long video (podcast, talk, tutorial, stream) into several vertical shorts, ranked by viral potential
argument-hint: <long video path or URL> [how many shorts] [platform/style notes]
---
Make shorts from this long video with the reelagentic skill: $ARGUMENTS

1. If it is a URL, ask first, then download with `yt-dlp -f "bv*[height<=1080]+ba/b" -o "<folder>/%(title)s.%(ext)s" URL`
   (only the user's own content or content they have rights to).
2. Edit dir: `<video folder>/<video stem>-shorts/`. Transcribe the whole video
   (`transcribe.py VIDEO EDIT`, `--engine python` when installed for tighter timing), then
   `shorts.py transcript EDIT` and read `EDIT/transcript.md`.
3. Score 8-12 candidate segments of 20-60 s. Rate each 1-10 on: hook strength (first 3 s), standalone
   coherence (makes sense with no context), emotion/surprise, value density, payoff (ends on a point).
   Weighted score = 0.3 hook + 0.2 coherence + 0.15 emotion + 0.2 value + 0.15 payoff. Show a table:
   #, time, length, score, the hook line, why. Ask which to make (default: the top 3).
4. `shorts.py snap EDIT --segments "a-b,..."` to check boundaries, then `shorts.py extract VIDEO EDIT --segments "..."`.
5. For each `EDIT/shorts/short_NN.mp4` with its `short_NN-reel/` (already transcribed, skip transcribe.py):
   - landscape source: `track.py CLIP REEL --mode face` (people) or `--mode motion` (screen recordings), then
     `cut.py CLIP REEL --fit follow --grade auto`; vertical source: plain `cut.py`.
   - then the normal skill workflow from step 3 (vision, storyboard, approval, final). Keep shorts
     consistent: same look, caption style and CTA across the batch.
6. Report the exported files and one caption.txt per short.
