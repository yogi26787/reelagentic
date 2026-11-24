"""Person cut-out (for text behind you) and face boxes (zoom focus, face lock-on, cover frame).

Usage:
  python3 vision.py matte EDIT_DIR [--feather 1.5]   # cut.mp4 -> matte.mp4 + fg.webm (person with alpha)
  python3 vision.py faces EDIT_DIR [--step 0.25]     # cut.mp4 -> faces.json
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import load, probe, run  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["matte", "faces"])
    ap.add_argument("edit_dir")
    ap.add_argument("--feather", type=float, default=1.5)
    ap.add_argument("--step", type=float, default=0.25)
    a = ap.parse_args()
    ed = Path(a.edit_dir).expanduser()
    tool = Path(load()["bin"]) / "rf-vision"
    cut = ed / "cut.mp4"
    if not cut.exists():
        sys.exit(f"missing {cut}; run cut.py first")

    if a.mode == "faces":
        j = json.loads(run([tool, "faces", cut, a.step]))
        frames = [{"t": f["t"], **max(f["faces"], key=lambda b: b["w"] * b["h"])} for f in j["frames"] if f["faces"]]
        (ed / "faces.json").write_text(json.dumps({"faces": frames}))
        print(f"faces: {len(frames)}/{len(j['frames'])} sampled frames have a face -> {ed / 'faces.json'}")
        return

    info = probe(cut)
    mw, mh = 540, 960  # half-res mask is plenty; upscaled + feathered below
    vis = subprocess.Popen([str(tool), "matte", str(cut), str(mw), str(mh)], stdout=subprocess.PIPE)
    enc = subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{mw}x{mh}",
                          "-r", f"{info['fps']:.3f}", "-i", "-", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
                          str(ed / "matte.mp4")], stdin=vis.stdout, capture_output=True, text=True)
    vis.stdout.close()
    if vis.wait() != 0 or enc.returncode != 0:
        sys.exit(f"matte failed: {enc.stderr[-2000:]}")
    run(["ffmpeg", "-y", "-v", "error", "-i", cut, "-i", ed / "matte.mp4", "-filter_complex",
         f"[1:v]scale={info['width']}:{info['height']},format=gray,gblur=sigma={a.feather}[m];"
         f"[0:v]format=yuva420p[v];[v][m]alphamerge,format=yuva420p[o]",
         "-map", "[o]", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28",
         "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-an", ed / "fg.webm"])
    print(f"cut-out ready: {ed / 'fg.webm'} (check a frame of matte.mp4: person should be white)")


if __name__ == "__main__":
    main()
