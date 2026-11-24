"""Synthesise a starter SFX pack (original, royalty-free) into a folder. Skips files that exist.

Usage: python3 sfx.py OUT_DIR
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def t(d):
    return np.linspace(0, d, int(SR * d), endpoint=False)


def env(n, a=0.005, r=0.2):
    x = np.ones(n)
    ai, ri = max(1, int(a * SR)), max(1, min(n, int(r * SR)))
    x[:ai] = np.linspace(0, 1, ai)
    x[-ri:] *= np.linspace(1, 0, ri) ** 2
    return x


def noise(d):
    return rng.standard_normal(int(SR * d))


def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same")


def sweep(f0, f1, d):
    f = np.geomspace(f0, f1, int(SR * d))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def whoosh(d=0.45):
    n = noise(d)
    lo = lowpass(n, 40) * np.sin(np.linspace(0, np.pi, len(n))) ** 2
    return lo * 3


SOUNDS = {
    "whoosh": lambda: whoosh(),
    "swoosh-fast": lambda: whoosh(0.22),
    "pop": lambda: sweep(900, 250, 0.09) * env(int(SR * 0.09), 0.002, 0.07),
    "click": lambda: (noise(0.02) * env(int(SR * 0.02), 0.0005, 0.018)) * 0.6,
    "mouse-click": lambda: np.concatenate([noise(0.012) * 0.5, np.zeros(int(SR * 0.05)), noise(0.01) * 0.35]),
    "ding": lambda: (np.sin(2 * np.pi * 1320 * t(0.8)) + 0.4 * np.sin(2 * np.pi * 2640 * t(0.8))) * np.exp(-t(0.8) * 5) * 0.5,
    "notification": lambda: np.concatenate([np.sin(2 * np.pi * 988 * t(0.12)) * env(int(SR * .12), .003, .08),
                                            np.sin(2 * np.pi * 1319 * t(0.25)) * env(int(SR * .25), .003, .2)]) * 0.5,
    "cash": lambda: np.concatenate([noise(0.04) * env(int(SR * .04), .001, .03) * .5,
                                    (np.sin(2 * np.pi * 2093 * t(.6)) + np.sin(2 * np.pi * 2637 * t(.6))) * np.exp(-t(.6) * 6) * .35]),
    "impact": lambda: (sweep(120, 35, 0.6) * 0.9 + lowpass(noise(0.6), 8) * 0.4) * np.exp(-t(0.6) * 6),
    "riser": lambda: sweep(200, 1800, 1.5) * np.linspace(0, 0.6, int(SR * 1.5)) + lowpass(noise(1.5), 20) * np.linspace(0, 1, int(SR * 1.5)),
    "glitch": lambda: np.sign(np.sin(2 * np.pi * 180 * t(0.25))) * (rng.random(int(SR * .25)) > .5) * 0.35,
    "typing": lambda: np.concatenate([np.concatenate([noise(0.008) * 0.4, np.zeros(int(SR * rng.uniform(.05, .11)))]) for _ in range(10)]),
    "camera-shutter": lambda: np.concatenate([noise(0.03) * env(int(SR * .03), .001, .02), np.zeros(int(SR * .06)), noise(0.05) * env(int(SR * .05), .001, .04) * .7]),
    "tick": lambda: np.sin(2 * np.pi * 3000 * t(0.03)) * np.exp(-t(0.03) * 150) * 0.6,
    "stamp": lambda: (lowpass(noise(0.25), 6) * 1.2 + sweep(90, 40, 0.25)) * np.exp(-t(0.25) * 18),
    "sparkle": lambda: sum(np.roll(np.sin(2 * np.pi * f * t(.7)) * np.exp(-t(.7) * 9), int(SR * i * .06)) for i, f in enumerate([2093, 2637, 3136, 4186])) * .25,
    "bass-drop": lambda: sweep(90, 30, 1.2) * np.exp(-t(1.2) * 2.5),
}


def write(path, x):
    x = x / max(1e-9, np.max(np.abs(x))) * 0.89
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    out = Path(sys.argv[1]).expanduser()
    out.mkdir(parents=True, exist_ok=True)
    made = 0
    for name, fn in SOUNDS.items():
        p = out / f"{name}.wav"
        if not p.exists():
            write(p, fn())
            made += 1
    print(f"sfx: {made} new, {len(SOUNDS)} total in {out}")
