"""Beat markers for a music track, in reel time (like the beat markers in phone editors).

Usage: python3 beats.py MUSIC EDIT_DIR [--start SEC] [--duration SEC] [--bpm N]
       python3 beats.py --selftest
  --start: where the reel's music starts inside the file (music.startFrom; see song_offset.py)
  --bpm:   force the tempo if the estimate is double/half
Writes EDIT_DIR/beats.json: {"bpm", "beats": [sec...], "bars": [sec...]}. bars assume 4/4 from the
strongest beat phase. With "beatSync": true in storyboard.json, render.py snaps moments, zooms and
transitions within 0.12 s of a beat onto it.
shortcut: assumes a steady tempo (true for most reel music); tempo-changing tracks need --bpm per section.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from song_offset import HOP, RATE, envelope, onset  # noqa: E402

FPS = RATE / HOP  # envelope frames per second (100)


def grid(env: np.ndarray, bpm: float | None = None):
    """Tempo by autocorrelation (60-180 BPM, mild preference near 120), phase by best-aligned grid."""
    e = env - env.mean()
    if bpm:
        lag = FPS * 60 / bpm
    else:
        ac = np.correlate(e, e, mode="full")[len(e) - 1:]
        lags = np.arange(int(FPS * 60 / 180), int(FPS * 60 / 60) + 1)
        score = ac[lags] * np.exp(-0.5 * (np.log2((FPS * 60 / lags) / 120)) ** 2)
        k = int(np.argmax(score))
        lag = float(lags[k])
        if 0 < k < len(lags) - 1:  # parabolic refinement to sub-frame precision
            a, b, c = score[k - 1], score[k], score[k + 1]
            lag += 0.5 * (a - c) / ((a - 2 * b + c) or 1)
        bpm = FPS * 60 / lag
    n = int((len(env) - 1) // lag) + 1
    phases = np.arange(0, lag, 0.25)
    pos = lambda p: np.clip(np.round(p + np.arange(n) * lag).astype(int), 0, len(env) - 1)  # noqa: E731
    best = max(phases, key=lambda p: env[pos(p)].sum())
    beats = (best + np.arange(n) * lag) / FPS
    # bars: of the 4 beat phases, the one carrying most onset energy is the downbeat
    bar0 = max(range(4), key=lambda j: env[pos(best)[j::4]].sum())
    return round(float(bpm), 1), beats, beats[bar0::4]


def selftest():
    sr, rng = RATE, np.random.default_rng(3)
    x = rng.standard_normal(sr * 20) * 0.01
    for i, b in enumerate(np.arange(0.31, 20, 0.5)):  # 120 BPM, accent every 4th beat
        s = int(b * sr)
        x[s:s + 400] += (3 if i % 4 == 0 else 1) * np.hanning(400)
    bpm, beats, bars = grid(onset(x))
    assert abs(bpm - 120) < 1.5, bpm
    assert abs(beats[0] - 0.31) < 0.03 and abs(bars[0] - 0.31) < 0.03, (beats[:3], bars[:2])
    print("beats selftest ok")


def main():
    if "--selftest" in sys.argv:
        return selftest()
    ap = argparse.ArgumentParser()
    ap.add_argument("music")
    ap.add_argument("edit_dir")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--duration", type=float, default=600.0)
    ap.add_argument("--bpm", type=float)
    a = ap.parse_args()
    bpm, beats, bars = grid(envelope(Path(a.music).expanduser()), a.bpm)
    keep = lambda ts: [round(float(t) - a.start, 3) for t in ts if a.start <= t <= a.start + a.duration]  # noqa: E731
    out = Path(a.edit_dir).expanduser() / "beats.json"
    out.write_text(json.dumps({"bpm": bpm, "beats": keep(beats), "bars": keep(bars)}), encoding="utf-8")
    print(f"{len(keep(beats))} beats, {bpm} BPM -> {out}")


if __name__ == "__main__":
    main()
