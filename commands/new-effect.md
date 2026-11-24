---
description: Design a new motion graphic and save it to the Reel Maker library for future reels
argument-hint: <what the effect should look like>
---
Design a new Reel Maker effect: $ARGUMENTS

Follow the "Custom effects" section of the reel-maker skill. Read `${CLAUDE_PLUGIN_ROOT}/engine/src/kit.tsx`
and one similar built-in effect from `${CLAUDE_PLUGIN_ROOT}/engine/src/effects/` first.
Save it to `<Studio>/custom-effects/<PascalName>.tsx` with a one-line `/** ... p: props */` doc comment.
Test it: make a scratch edit dir with a 3 s clip (`ffmpeg -f lavfi -i color=c=gray:s=1080x1920:r=30:d=3 -f lavfi -i anullsrc -shortest cut.mp4`),
an empty `words_cut.json` (`{"words": []}`), a storyboard.json with one moment using the effect, then
`render.py storyboard` and look at the still. Fix until it looks right, then tell the user its name and props.
