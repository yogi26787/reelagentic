"""One-time install: engine (Remotion), Vision tool, Whisper model, Studio folder, SFX pack.

Usage: python3 setup.py [--studio DIR] [--model small|base|medium|large-v3-turbo] [--model-path FILE]
Safe to re-run: updates the engine and keeps the user's Studio files.
"""
import argparse
import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import CONF, HOME, PLUGIN, need, run  # noqa: E402

STUDIO_DIRS = {
    "brand": "brand.json (colours, fonts, handle, logo) and your logo files",
    "logos": "app / tool / client logos (PNG/SVG). fetch_logo.py saves here",
    "images": "photos and screenshots to show as cards",
    "broll": "b-roll clips",
    "sfx": "sound effects (.wav/.mp3). A starter pack is generated here",
    "music": "background music you have the rights to",
    "references": "reference reels you like (files or info). Never reuse their footage/music/text",
    "styles": "style profiles learned from reference reels (JSON)",
    "custom-effects": "effects Claude designed for you (.tsx). Auto-registered at render time",
    "Exports": "finished reels, covers and captions",
}

BRAND = {
    "name": "",
    "handle": "@yourhandle",
    "look": "clean",
    "palette": {},
    "logo": "",
    "cta": "Follow for more",
    "captionStyle": "pop",
    "captionScript": "roman",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--studio", default=str(Path.home() / "Documents" / "Reel Maker Studio"))
    ap.add_argument("--model", default="small")
    ap.add_argument("--model-path")
    a = ap.parse_args()

    need("ffmpeg", "Install it: brew install ffmpeg")
    need("node", "Install Node.js 20+: brew install node")
    need("whisper-cli", "Install whisper.cpp: brew install whisper-cpp")
    need("swiftc", "Install Xcode command line tools: xcode-select --install")
    HOME.mkdir(parents=True, exist_ok=True)

    # engine: copy source, keep node_modules between runs
    eng = HOME / "engine"
    eng.mkdir(exist_ok=True)
    for item in (PLUGIN / "engine").iterdir():
        if item.name == "node_modules":
            continue
        dst = eng / item.name
        if item.is_dir():
            shutil.copytree(item, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dst)
    print("engine: npm install …", flush=True)
    subprocess.run(["npm", "install", "--prefer-offline", "--no-audit", "--no-fund"], cwd=eng, check=True)

    # Apple Vision helper
    (HOME / "bin").mkdir(exist_ok=True)
    print("vision: compiling …", flush=True)
    run(["swiftc", "-O", PLUGIN / "scripts" / "vision.swift", "-o", HOME / "bin" / "rf-vision"])

    # Whisper model
    if a.model_path:
        model = Path(a.model_path).expanduser().resolve()
        if not model.exists():
            sys.exit(f"model not found: {model}")
    else:
        model = HOME / "models" / f"ggml-{a.model}.bin"
        if not model.exists():
            model.parent.mkdir(exist_ok=True)
            url = f"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{a.model}.bin"
            print(f"model: downloading {url}", flush=True)
            tmp = model.with_suffix(".part")
            urllib.request.urlretrieve(url, tmp)
            tmp.rename(model)

    # Studio folder (never overwrite user files)
    studio = Path(a.studio).expanduser()
    for d, what in STUDIO_DIRS.items():
        (studio / d).mkdir(parents=True, exist_ok=True)
    readme = studio / "README.md"
    if not readme.exists():
        readme.write_text("# Reel Maker Studio\n\nClaude checks this folder before every edit.\n\n"
                          + "\n".join(f"- `{d}/`: {w}" for d, w in STUDIO_DIRS.items()) + "\n")
    if not (studio / "brand" / "brand.json").exists():
        (studio / "brand" / "brand.json").write_text(json.dumps(BRAND, indent=2) + "\n")
    if not (studio / "my-style.md").exists():
        (studio / "my-style.md").write_text("# My style\n\nClaude appends what you liked or changed after each reel.\n")
    run([sys.executable, PLUGIN / "scripts" / "sfx.py", studio / "sfx"])

    CONF.write_text(json.dumps({
        "studio": str(studio), "model": str(model),
        "engine": str(eng), "bin": str(HOME / "bin"),
    }, indent=2) + "\n")
    print(f"ready. studio={studio} model={model}")


if __name__ == "__main__":
    main()
