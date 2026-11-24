---
description: Install Reel Maker (render engine, Whisper model, person cut-out, Studio folder, SFX pack) on macOS or Windows
argument-hint: [studio folder] [whisper model: small|medium|large-v3-turbo] [video workspace to bridge]
---
Install Reel Maker on this computer. Arguments: $ARGUMENTS

1. Detect the OS. Check `ffmpeg`, `node` (20+), `whisper-cli` and Python 3 with numpy. If any is
   missing, show the one install command and ask before running it:
   - macOS: `brew install ffmpeg node whisper-cpp`, `xcode-select --install`, `pip3 install numpy`
   - Windows: `winget install Gyan.FFmpeg`, `winget install OpenJS.NodeJS.LTS`, Python 3.12 from
     python.org, `python -m pip install numpy mediapipe`; whisper.cpp: download `whisper-bin-x64.zip`
     from github.com/ggml-org/whisper.cpp/releases, unzip, and pass `--whisper <folder>\whisper-cli.exe`.
2. Studio folder: the argument, else ask (default `~/Documents/Reel Maker Studio`).
3. Whisper model: if a `ggml-*.bin` already exists on this computer, offer to reuse it with `--model-path`.
   Otherwise the default download is `small` (~466 MB, good for English + Hindi/Hinglish);
   `large-v3-turbo` (~1.6 GB) is best for mixed languages. Say the size and get a yes before downloading.
4. Person cut-out: Apple Vision on macOS (compiled automatically). On Windows it uses MediaPipe, and
   setup downloads its two small models (~0.5 MB total).
5. If the user has a video workspace (a folder with their footage tools, grades, video-use…), pass
   `--workspace "<folder>"` to import its `*-grade.txt` grades and link companion tools.
6. Run with the same Python that has numpy (and mediapipe on Windows):
   `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/setup.py --studio "<folder>" [--model NAME | --model-path FILE] [--workspace DIR] [--whisper PATH]`
7. Self-test: `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/cut.py --selftest`, the same for `render.py`, `beats.py`,
   `song_offset.py`, then `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/catalog.py`.
8. Tell the user where the Studio is, what goes in each folder (brand/brand.json: colours, handle, CTA,
   caption style; grades/; styles/), and how to start: `/reel-maker:edit <video> <brief>`.
Re-running setup after a plugin update refreshes the engine and keeps Studio files.
