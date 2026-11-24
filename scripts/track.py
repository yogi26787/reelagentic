"""Follow the subject across a landscape video so cut.py --fit follow can reframe it to 9:16.

Usage: python3 track.py VIDEO EDIT_DIR [--mode face|motion] [--step 0.5] [--deadzone 0.06]
  face   : biggest face (Apple Vision on macOS, MediaPipe elsewhere): talking heads, podcasts
  motion : centre of what changed between frames: screen recordings (follows the cursor / typing)
Writes EDIT_DIR/track.json: {"mode", "points": [[source_sec, centre_x 0..1], ...]}. Like a camera
operator, it only moves when the subject leaves a dead zone, then glides (smoothed), so the crop
doesn't jitter. Self-test: python3 track.py --selftest
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def steady(raw, deadzone=0.06, window=3):
    """Hold position inside the dead zone, then smooth with a centred moving average."""
    held, cur = [], None
    for t, x in raw:
        if x is not None and (cur is None or abs(x - cur) > deadzone):
            cur = x
        held.append((t, 0.5 if cur is None else cur))
    out = []
    for i, (t, _) in enumerate(held):
        win = [x for _, x in held[max(0, i - window // 2): i + window // 2 + 1]]
        out.append([round(t, 3), round(sum(win) / len(win), 4)])
    return out


def motion_centres(video, step):
    import numpy as np
    from vision import frames
    prev, out = None, []
    for i, rgb in enumerate(frames(Path(video), 192, 108, f"1/{step}")):
        g = rgb.mean(axis=2)
        x = None
        if prev is not None:
            d = np.abs(g - prev)
            mask = d > max(12.0, d.mean() + 3 * d.std())
            if mask.sum() > 4:  # something moved: cursor, typing, a new window
                x = float(np.nonzero(mask)[1].mean() / g.shape[1])
        out.append((i * step, x))
        prev = g
    return out


def face_centres(video, step):
    from rf_config import load, run
    cfg = load()
    if cfg.get("vision", "apple") == "mediapipe":
        from vision import mp_faces
        j = mp_faces(cfg, Path(video), step)
    else:
        j = json.loads(run([Path(cfg["bin"]) / "rf-vision", "faces", video, step]))
    return [(f["t"], (lambda b: b["x"] + b["w"] / 2)(max(f["faces"], key=lambda b: b["w"] * b["h"])) if f["faces"] else None)
            for f in j["frames"]]


def selftest():
    pts = steady([(0, 0.5), (1, 0.52), (2, 0.8), (3, 0.81), (4, None)], deadzone=0.06, window=1)
    assert [x for _, x in pts] == [0.5, 0.5, 0.8, 0.8, 0.8], pts
    print("track.py selftest ok")


def main():
    if "--selftest" in sys.argv:
        return selftest()
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("edit_dir")
    ap.add_argument("--mode", choices=["face", "motion"], default="face")
    ap.add_argument("--step", type=float, default=0.5)
    ap.add_argument("--deadzone", type=float, default=0.06)
    a = ap.parse_args()
    raw = face_centres(a.video, a.step) if a.mode == "face" else motion_centres(a.video, a.step)
    found = sum(x is not None for _, x in raw)
    ed = Path(a.edit_dir).expanduser()
    ed.mkdir(parents=True, exist_ok=True)
    (ed / "track.json").write_text(json.dumps({"mode": a.mode, "points": steady(raw, a.deadzone)}), encoding="utf-8")
    print(f"track ({a.mode}): subject found in {found}/{len(raw)} samples -> {ed / 'track.json'}"
          + ("" if found else "  (nothing found: --fit follow will keep the centre)"))


if __name__ == "__main__":
    main()
