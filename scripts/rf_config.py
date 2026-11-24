"""Shared paths for Reel Maker scripts. Config lives in ~/.reel-maker/config.json (written by setup.py)."""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent
HOME = Path(os.environ.get("REEL_MAKER_HOME", Path.home() / ".reel-maker"))
CONF = HOME / "config.json"


def load() -> dict:
    if not CONF.exists():
        sys.exit("Reel Maker is not set up yet. Run /reel-maker:setup first.")
    c = json.loads(CONF.read_text(encoding="utf-8"))
    c.setdefault("engine", str(HOME / "engine"))
    c.setdefault("bin", str(HOME / "bin"))
    return c


IS_WIN = sys.platform.startswith("win")
IS_MAC = sys.platform == "darwin"


def tool(name: str) -> str:
    """Executable path: config "tools" override, else PATH lookup (finds npx.cmd / ffmpeg.exe on Windows)."""
    if CONF.exists():
        override = json.loads(CONF.read_text(encoding="utf-8")).get("tools", {}).get(name)
        if override:
            return override
    return shutil.which(name) or name


def run(cmd, **kw):
    """Run a command, fail loudly with its stderr. UTF-8 output on every OS."""
    cmd = [str(x) for x in cmd]
    cmd[0] = tool(cmd[0])
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)
    if r.returncode != 0:
        sys.exit(f"command failed ({r.returncode}): {' '.join(map(str, cmd))}\n{r.stderr[-3000:]}")
    return r.stdout


def need(name: str, hint: str):
    if not shutil.which(tool(name)):
        sys.exit(f"missing `{name}`. {hint}")


def probe(video) -> dict:
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", video])
    j = json.loads(out)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    num, den = (v["r_frame_rate"].split("/") if v else ("30", "1"))
    rot = 0
    for sd in (v or {}).get("side_data_list", []):
        rot = int(sd.get("rotation", 0) or 0)
    w, h = (int(v["width"]), int(v["height"])) if v else (0, 0)
    if abs(rot) in (90, 270):
        w, h = h, w
    return {
        "duration": float(j["format"]["duration"]),
        "width": w, "height": h,
        "fps": float(num) / float(den or 1),
        "hdr": (v or {}).get("color_transfer") in ("smpte2084", "arib-std-b67"),
        "has_audio": a is not None,
    }
