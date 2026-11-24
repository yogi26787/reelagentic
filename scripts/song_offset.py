"""Find where a short audio clip (e.g. a trending-audio snippet saved from a reel) starts inside the
full song, so the reel can use the full-quality track from the same point (music.startFrom).

Usage: python3 song_offset.py CLIP FULL_SONG        # prints "offset=SEC confidence=0..1"
       python3 song_offset.py --selftest
Matches onset envelopes (100 per second) with normalised cross-correlation.
"""
import subprocess
import sys

import numpy as np

RATE, HOP = 8000, 80  # 10 ms frames


def envelope(path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return onset(np.frombuffer(raw, dtype="<i2").astype(np.float64))


def onset(x: np.ndarray) -> np.ndarray:
    n = len(x) // HOP
    env = np.sqrt((x[: n * HOP].reshape(n, HOP) ** 2).mean(axis=1))
    return np.maximum(0, np.diff(env))  # rhythm, not overall loudness


def best_offset(clip: np.ndarray, full: np.ndarray):
    n = len(clip)
    if n == 0 or len(full) <= n:
        raise ValueError("clip must be shorter than the song")
    c = (clip - clip.mean()) / (clip.std() or 1)
    # sliding window mean/std of the song via cumulative sums
    cs, cs2 = np.cumsum(np.r_[0, full]), np.cumsum(np.r_[0, full ** 2])
    m = (cs[n:] - cs[:-n]) / n
    sd = np.sqrt(np.maximum((cs2[n:] - cs2[:-n]) / n - m ** 2, 1e-12))
    corr = np.correlate(full, c, mode="valid") / n / sd
    i = int(np.argmax(corr))
    return i * HOP / RATE, float(corr[i])


def selftest():
    rng = np.random.default_rng(1)
    song = rng.standard_normal(RATE * 30) * np.repeat(rng.random(30 * 4) > 0.6, RATE // 4)
    clip = song[RATE * 12: RATE * 20]
    off, conf = best_offset(onset(clip), onset(song))
    assert abs(off - 12.0) < 0.02 and conf > 0.9, (off, conf)
    print("song_offset selftest ok")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        off, conf = best_offset(envelope(sys.argv[1]), envelope(sys.argv[2]))
        print(f"offset={off:.2f} confidence={conf:.2f}" + ("" if conf > 0.5 else "  (low: check by ear)"))
