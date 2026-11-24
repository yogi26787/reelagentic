"""HyperFrames bridge: write motion graphics as HTML, render them to a clip, use it in a reel.

Usage:
  python3 hyperframes_clip.py init NAME                       # new project in <Studio>/hyperframes/NAME
  python3 hyperframes_clip.py render PROJECT_DIR NAME [--format webm|mp4]
      webm (default) -> <Studio>/overlays/NAME.webm, transparent: use with the OverlayClip effect
      mp4            -> <Studio>/broll/NAME.mp4: use as broll
HyperFrames (heygen-com/hyperframes, Apache-2.0) needs Node.js 22+; it runs through npx. Pin a version
with config.json "tools": {"hyperframes": "hyperframes@0.9.26"}.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import CONF, load, run  # noqa: E402


def pkg() -> str:
    return json.loads(CONF.read_text(encoding="utf-8")).get("tools", {}).get("hyperframes", "hyperframes") if CONF.exists() else "hyperframes"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["init", "render"])
    ap.add_argument("args", nargs="+")
    ap.add_argument("--format", choices=["webm", "mp4"], default="webm")
    a = ap.parse_args()
    studio = Path(load()["studio"])
    if a.cmd == "init":
        d = studio / "hyperframes"
        d.mkdir(exist_ok=True)
        run(["npx", "--yes", pkg(), "init", a.args[0]], cwd=d)
        print(f"project: {d / a.args[0]} (edit index.html, preview with: npx {pkg()} preview)")
        return
    project, name = Path(a.args[0]).expanduser().resolve(), a.args[1]
    out = studio / ("overlays" if a.format == "webm" else "broll") / f"{name}.{a.format}"
    out.parent.mkdir(exist_ok=True)
    run(["npx", "--yes", pkg(), "render", project, "--format", a.format, "-o", out, "--quiet"], cwd=project)
    rel = out.relative_to(studio).as_posix()
    print(f"rendered {out}\nuse: " + (f'{{"effect": "OverlayClip", "props": {{"src": "studio:{rel}"}}}}' if a.format == "webm"
                                      else f'{{"broll": [{{"src": "studio:{rel}", "mode": "full"}}]}}'))


if __name__ == "__main__":
    main()
