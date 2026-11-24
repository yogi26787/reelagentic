"""One-time install: engine (Remotion), Vision tool, Whisper model, Studio folder, SFX pack.

Usage: python3 setup.py [--studio DIR] [--model small|base|medium|large-v3-turbo] [--model-path FILE]
                        [--workspace DIR] [--vision apple|mediapipe] [--whisper PATH_TO_whisper-cli]
Works on macOS and Windows. Person cut-out / faces: Apple Vision on macOS (default), MediaPipe on
Windows (pip install mediapipe; its two small models are downloaded here).
--workspace: an existing video workspace to bridge in. Its *-grade.txt files (anywhere under
tools/ or the top level) are copied to <Studio>/grades/, and companion tools are recorded in the
config when found: video-use (timeline view, auto grade, Manim), OpenHiggsfield (AI b-roll).
Safe to re-run: updates the engine and keeps the user's Studio files.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import CONF, HOME, IS_MAC, IS_WIN, PLUGIN, need, run, tool  # noqa: E402

HINTS = {  # install hint per OS
    "ffmpeg": ("brew install ffmpeg", "winget install Gyan.FFmpeg"),
    "node": ("brew install node", "winget install OpenJS.NodeJS.LTS"),
    "whisper-cli": ("brew install whisper-cpp",
                    "download whisper-bin-x64.zip from github.com/ggml-org/whisper.cpp/releases, unzip, then pass --whisper <folder>\\whisper-cli.exe"),
}
MP_MODELS = {
    "mp_segmenter": "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
    "mp_face": "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
}


def hint(name):
    mac, win = HINTS[name]
    return f"Install it: {win if IS_WIN else mac}"


def fetch(url: str, dst: Path):
    if not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        print(f"downloading {url}", flush=True)
        tmp = dst.with_suffix(".part")
        urllib.request.urlretrieve(url, tmp)
        tmp.replace(dst)
    return dst

STUDIO_DIRS = {
    "brand": "brand.json (colours, fonts, handle, logo) and your logo files",
    "logos": "app / tool / client logos (PNG/SVG). fetch_logo.py saves here",
    "images": "photos and screenshots to show as cards",
    "broll": "b-roll clips",
    "sfx": "sound effects (.wav/.mp3). A starter pack is generated here",
    "music": "background music you have the rights to",
    "references": "reference reels you like (files or info). Never reuse their footage/music/text",
    "styles": "style profiles learned from reference reels (JSON)",
    "grades": "colour grades: one FFmpeg filter chain per .txt, or a .cube 3D LUT (cut.py --grade NAME)",
    "overlays": "transparent clips (WebM/MOV with alpha) for the OverlayClip effect, e.g. from hyperframes_clip.py",
    "hyperframes": "HyperFrames HTML animation projects (hyperframes_clip.py init/render)",
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


def bridges(ws, studio: Path, old: dict) -> dict:
    """Find companion tools; copy a workspace's grade files into the Studio (never overwrite)."""
    found = dict(old)
    vu = next((d for d in [Path.home() / ".claude/skills/video-use", (ws / "tools/video-use") if ws else None]
               if d and (d / "helpers/timeline_view.py").exists()), None)
    if vu:
        py = vu.resolve() / ".venv/bin/python"
        found["video_use"] = {"helpers": str(vu.resolve() / "helpers"), "python": str(py) if py.exists() else "python3"}
        if (vu / "skills/manim-video/SKILL.md").exists():
            found["manim_skill"] = str(vu.resolve() / "skills/manim-video/SKILL.md")
    # companion tools from the wider Claude-video ecosystem: used when present, never required
    if shutil.which("yt-dlp"):
        found["yt_dlp"] = shutil.which("yt-dlp")
    fs = Path.home() / ".claude/skills/ffmpeg-skill/scripts"
    if fs.exists():
        found["ffmpeg_skill"] = str(fs)
    try:
        node_major = int(subprocess.run([tool("node"), "--version"], capture_output=True, text=True).stdout.strip().lstrip("v").split(".")[0])
    except (OSError, ValueError):
        node_major = 0
    if node_major >= 22:
        found["hyperframes"] = "npx hyperframes (Node %d)" % node_major
    for mod, name in (("faster_whisper", "faster-whisper"), ("whisper", "openai-whisper")):
        try:
            __import__(mod)
            found["asr_python"] = name
            break
        except ImportError:
            continue
    skills_dir = Path.home() / ".claude/skills"
    if skills_dir.exists():
        vs = sorted(d.name for d in skills_dir.iterdir() if d.is_dir() and re.search(r"three|motion|hyperframes|ffmpeg|manim|remotion|video|broll|kinetic", d.name))
        if vs:
            found["video_skills"] = vs
    if ws:
        found["workspace"] = str(ws)
        oh = ws / "tools/open-higgsfield"
        if oh.exists():
            found["open_higgsfield"] = str(oh)
        for g in sorted(list(ws.glob("*-grade.txt")) + list(ws.glob("tools/*-grade.txt"))):
            dst = studio / "grades" / g.name.replace("-grade.txt", ".txt")
            if not dst.exists():
                shutil.copy2(g, dst)
                print(f"grade imported: {dst.name}")
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--studio", default=str(Path.home() / "Documents" / "ReelAgentic Studio"))
    ap.add_argument("--model", default="small")
    ap.add_argument("--model-path")
    ap.add_argument("--workspace", help="existing video workspace to bridge (grades, video-use, OpenHiggsfield)")
    ap.add_argument("--vision", choices=["apple", "mediapipe"], default="apple" if IS_MAC else "mediapipe")
    ap.add_argument("--whisper", help="path to whisper-cli(.exe) when it is not on PATH")
    a = ap.parse_args()

    old = json.loads(CONF.read_text(encoding="utf-8")) if CONF.exists() else {}
    tools = dict(old.get("tools", {}))
    if a.whisper:
        w = Path(a.whisper).expanduser().resolve()
        if not w.exists():
            sys.exit(f"whisper-cli not found: {w}")
        tools["whisper-cli"] = str(w)
    for name in ("ffmpeg", "node"):
        need(name, hint(name))
    if "whisper-cli" not in tools:
        need("whisper-cli", hint("whisper-cli"))
    if a.vision == "apple":
        if not IS_MAC:
            sys.exit("--vision apple needs macOS; use --vision mediapipe")
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
    subprocess.run([tool("npm"), "install", "--prefer-offline", "--no-audit", "--no-fund"], cwd=eng, check=True)

    # person cut-out + faces
    (HOME / "bin").mkdir(exist_ok=True)
    vision = {"vision": a.vision}
    if a.vision == "apple":
        print("vision: compiling Apple Vision helper …", flush=True)
        run(["swiftc", "-O", PLUGIN / "scripts" / "vision.swift", "-o", HOME / "bin" / "rf-vision"])
    else:
        try:
            import mediapipe  # noqa: F401
        except ImportError:
            sys.exit(f"MediaPipe is missing for this Python ({sys.executable}). Run: {sys.executable} -m pip install mediapipe numpy\n"
                     "(MediaPipe supports Python 3.9-3.12; install one of those if pip finds no wheel.)")
        for key, url in MP_MODELS.items():
            vision[key] = str(fetch(url, HOME / "models" / url.rsplit("/", 1)[1]))

    # Whisper model
    if a.model_path:
        model = Path(a.model_path).expanduser().resolve()
        if not model.exists():
            sys.exit(f"model not found: {model}")
    else:
        model = fetch(f"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{a.model}.bin",
                      HOME / "models" / f"ggml-{a.model}.bin")

    # Studio folder (never overwrite user files)
    studio = Path(a.studio).expanduser()
    for d, what in STUDIO_DIRS.items():
        (studio / d).mkdir(parents=True, exist_ok=True)
    readme = studio / "README.md"
    if not readme.exists():
        readme.write_text("# ReelAgentic Studio\n\nClaude checks this folder before every edit.\n\n"
                          + "\n".join(f"- `{d}/`: {w}" for d, w in STUDIO_DIRS.items()) + "\n", encoding="utf-8")
    if not (studio / "brand" / "brand.json").exists():
        (studio / "brand" / "brand.json").write_text(json.dumps(BRAND, indent=2) + "\n", encoding="utf-8")
    if not (studio / "my-style.md").exists():
        (studio / "my-style.md").write_text("# My style\n\nClaude appends what you liked or changed after each reel.\n", encoding="utf-8")
    run([sys.executable, PLUGIN / "scripts" / "sfx.py", studio / "sfx"])

    conf = {"studio": str(studio), "model": str(model), "engine": str(eng), "bin": str(HOME / "bin"), **vision,
            "python": sys.executable, "tools": tools}
    conf["bridges"] = bridges(Path(a.workspace).expanduser() if a.workspace else None, studio, old.get("bridges", {}))
    CONF.write_text(json.dumps(conf, indent=2) + "\n", encoding="utf-8")
    for k, v in conf["bridges"].items():
        print(f"bridge {k}: {v}")
    print(f"ready. studio={studio} model={model}")


if __name__ == "__main__":
    main()
