---
description: Edit a raw video into a finished reel (captions, cuts, graphics, text behind you, SFX, cover, caption)
argument-hint: <video path> [one-line brief]
---
Use the reelagentic skill to edit this video into a reel.

Request: $ARGUMENTS

The first path in the request is the video (ask for it if missing). Everything after it is the brief.
Edit dir: `<video folder>/<video stem>-reel/`. Follow the skill's workflow in order: intake, transcribe + cut,
vision, storyboard.json, storyboard sheet for approval, final render, caption.txt, learn.
