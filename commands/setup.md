---
description: Install Reel Maker (render engine, Whisper model, Apple Vision tool, Studio folder, SFX pack)
argument-hint: [studio folder] [whisper model: small|medium|large-v3-turbo]
---
Install Reel Maker for this Mac. Arguments: $ARGUMENTS

1. Check `ffmpeg`, `node` (20+), `whisper-cli`, `swiftc`. If any is missing, tell the user the one
   install command (brew install ffmpeg / node / whisper-cpp; xcode-select --install) and ask before running it.
2. Pick the Studio folder: the argument, else ask (default `~/Documents/Reel Maker Studio`).
3. Whisper model: if a `ggml-*.bin` already exists on this Mac, offer to reuse it with `--model-path`.
   Otherwise the default download is `small` (~466 MB, good for English + Hindi/Hinglish);
   `large-v3-turbo` (~1.6 GB) is best for mixed languages. Say the size and get a yes before downloading.
4. Run: `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/setup.py --studio "<folder>" [--model NAME | --model-path FILE]`
5. Run `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/cut.py --selftest` and `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/catalog.py`.
6. Tell the user where the Studio is, what goes in each folder (brand/brand.json: colours, handle, CTA,
   caption style), and how to start: `/reel-maker:edit <video> <brief>`.
Re-running setup after a plugin update refreshes the engine and keeps Studio files.
