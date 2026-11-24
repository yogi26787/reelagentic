"""Person cut-out (for text behind you) and face boxes (zoom focus, face lock-on, cover frame).

Usage:
  python3 vision.py matte EDIT_DIR [--feather 1.5]   # cut.mp4 -> matte.mp4 + fg.webm (person with alpha)
  python3 vision.py faces EDIT_DIR [--step 0.25]     # cut.mp4 -> faces.json
Backends: "apple" (macOS Vision, compiled rf-vision) or "mediapipe" (Windows / Linux / macOS,
pip install mediapipe). setup.py picks one and stores it in config.json as "vision".
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import load, probe, run, tool  # noqa: E402

MW, MH = 540, 960  # half-res mask is plenty; upscaled + feathered when merged


def frames(video: Path, w: int, h: int, fps: str | None = None):
    """Decode RGB frames with ffmpeg (same decoder as every other step, so frame counts match)."""
    import numpy as np
    vf = f"scale={w}:{h}" + (f",fps={fps}" if fps else "")
    p = subprocess.Popen([tool("ffmpeg"), "-v", "error", "-i", str(video), "-vf", vf, "-fps_mode", "passthrough" if not fps else "cfr", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    n = w * h * 3
    while (buf := p.stdout.read(n)) and len(buf) == n:
        yield np.frombuffer(buf, dtype=np.uint8).reshape(h, w, 3)
    p.wait()


def _mp():
    try:
        import mediapipe as mp
        from mediapipe.tasks.python import BaseOptions
        from mediapipe.tasks.python import vision as mpv
    except ImportError:
        sys.exit("the mediapipe backend needs: python -m pip install mediapipe")
    return mp, BaseOptions, mpv


def mp_matte(cfg, video: Path, fps: float):
    import numpy as np
    mp, BaseOptions, mpv = _mp()
    opts = mpv.ImageSegmenterOptions(base_options=BaseOptions(model_asset_path=cfg["mp_segmenter"]),
                                     running_mode=mpv.RunningMode.VIDEO, output_confidence_masks=True)
    with mpv.ImageSegmenter.create_from_options(opts) as seg:
        for i, rgb in enumerate(frames(video, MW, MH)):
            r = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)), int(i * 1000 / fps))
            mask = r.confidence_masks[-1].numpy_view()  # selfie segmenter: last (only) mask = person
            yield (np.clip(mask, 0, 1) * 255).astype(np.uint8).reshape(MH, MW).tobytes()


def mp_faces(cfg, video: Path, step: float) -> dict:
    import numpy as np
    mp, BaseOptions, mpv = _mp()
    opts = mpv.FaceDetectorOptions(base_options=BaseOptions(model_asset_path=cfg["mp_face"]), running_mode=mpv.RunningMode.VIDEO)
    rows = []
    with mpv.FaceDetector.create_from_options(opts) as det:
        for i, rgb in enumerate(frames(video, MW, MH, f"1/{step}")):
            r = det.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)), int(i * step * 1000))
            faces = [{"x": d.bounding_box.origin_x / MW, "y": d.bounding_box.origin_y / MH, "w": d.bounding_box.width / MW,
                      "h": d.bounding_box.height / MH, "q": d.categories[0].score if d.categories else 0.0} for d in r.detections]
            rows.append({"t": round(i * step, 3), "faces": faces})
    return {"step": step, "frames": rows}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["matte", "faces"])
    ap.add_argument("edit_dir")
    ap.add_argument("--feather", type=float, default=1.5)
    ap.add_argument("--step", type=float, default=0.25)
    a = ap.parse_args()
    cfg = load()
    backend = cfg.get("vision", "apple")
    ed = Path(a.edit_dir).expanduser()
    cut = ed / "cut.mp4"
    if not cut.exists():
        sys.exit(f"missing {cut}; run cut.py first")
    apple = Path(cfg["bin"]) / "rf-vision"

    if a.mode == "faces":
        j = mp_faces(cfg, cut, a.step) if backend == "mediapipe" else json.loads(run([apple, "faces", cut, a.step]))
        found = [{"t": f["t"], **max(f["faces"], key=lambda b: b["w"] * b["h"])} for f in j["frames"] if f["faces"]]
        (ed / "faces.json").write_text(json.dumps({"faces": found}), encoding="utf-8")
        print(f"faces ({backend}): {len(found)}/{len(j['frames'])} sampled frames have a face -> {ed / 'faces.json'}")
        return

    info = probe(cut)
    enc = subprocess.Popen([tool("ffmpeg"), "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{MW}x{MH}",
                            "-r", f"{info['fps']:.3f}", "-i", "-", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
                            str(ed / "matte.mp4")], stdin=subprocess.PIPE)
    ok = True
    if backend == "mediapipe":
        for m in mp_matte(cfg, cut, info["fps"]):
            enc.stdin.write(m)
    else:
        vis = subprocess.Popen([str(apple), "matte", str(cut), str(MW), str(MH)], stdout=subprocess.PIPE)
        while chunk := vis.stdout.read(1 << 20):
            enc.stdin.write(chunk)
        ok = vis.wait() == 0
    enc.stdin.close()
    if enc.wait() != 0 or not ok:
        sys.exit("matte failed")
    run(["ffmpeg", "-y", "-v", "error", "-i", cut, "-i", ed / "matte.mp4", "-filter_complex",
         f"[1:v]scale={info['width']}:{info['height']},format=gray,gblur=sigma={a.feather}[m];"
         f"[0:v]format=yuva420p[v];[v][m]alphamerge,format=yuva420p[o]",
         "-map", "[o]", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28",
         "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-an", ed / "fg.webm"])
    print(f"cut-out ready ({backend}): {ed / 'fg.webm'} (check a frame of matte.mp4: person should be white)")


if __name__ == "__main__":
    main()
