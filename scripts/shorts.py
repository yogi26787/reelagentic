"""Long video -> several shorts. Claude reads the transcript, scores candidate segments, you approve,
then each approved segment becomes its own clip that goes through the normal ReelAgentic edit.

Usage:
  python3 shorts.py transcript EDIT_DIR                 # words.json -> transcript.md, one timed sentence per line
  python3 shorts.py snap EDIT_DIR --segments "62.5-118,300-341"   # snap to sentence starts/ends + silence
  python3 shorts.py extract VIDEO EDIT_DIR --segments "62.5-118,300-341"
      -> EDIT_DIR/shorts/short_01.mp4 + short_01-reel/words.json (already transcribed, times shifted)
  python3 shorts.py --selftest
Run transcribe.py VIDEO EDIT_DIR first. Then for each short: track.py (if landscape), cut.py --fit follow, ...
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import run  # noqa: E402

END = re.compile(r"[.!?।]$")


def sentences(words, gap=0.6):
    """Group words into sentences: end punctuation or a pause longer than `gap` closes one."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        if END.search(w["w"]) or (nxt and nxt["s"] - w["e"] > gap) or not nxt:
            out.append({"s": cur[0]["s"], "e": cur[-1]["e"], "text": " ".join(x["w"] for x in cur)})
            cur = []
    return out


def snap(words, a, b, lead=1.5, tail=3.0, pad=0.15):
    """Start on the sentence containing/after a (looking back up to `lead` s), end on the sentence end
    at/after b (up to `tail` s later). Never cuts mid-word or mid-sentence."""
    ss = sentences(words)
    start = next((x["s"] for x in ss if x["e"] > a and x["s"] >= a - lead), a)
    end = next((x["e"] for x in ss if x["e"] >= b and x["e"] <= b + tail), b)
    return round(max(0.0, start - pad), 3), round(end + pad, 3)


def parse_segments(spec):
    return [tuple(float(v) for v in part.split("-")) for part in spec.split(",") if part.strip()]


def fmt(t):
    return f"{int(t // 60):02d}:{t % 60:04.1f}"


def selftest():
    ws = [{"w": w, "s": i * 0.5, "e": i * 0.5 + 0.4} for i, w in enumerate("Hello there. This is the start of the idea. And it ends here. More".split())]
    a, b = snap(ws, 1.4, 4.2)
    assert (a, b) == (0.85, 4.55), (a, b)  # snapped back to "This", forward to the end of "idea."
    assert [x["text"] for x in sentences(ws)][:2] == ["Hello there.", "This is the start of the idea."]
    print("shorts.py selftest ok")


def main():
    if "--selftest" in sys.argv:
        return selftest()
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["transcript", "snap", "extract"])
    ap.add_argument("args", nargs="+", help="EDIT_DIR, or VIDEO EDIT_DIR for extract")
    ap.add_argument("--segments", default="")
    a = ap.parse_args()
    video = Path(a.args[0]).expanduser() if a.cmd == "extract" else None
    ed = Path(a.args[-1]).expanduser()
    words = json.loads((ed / "words.json").read_text(encoding="utf-8"))["words"]

    if a.cmd == "transcript":
        lines = [f"[{fmt(x['s'])}-{fmt(x['e'])}] ({x['s']:.1f}-{x['e']:.1f}) {x['text']}" for x in sentences(words)]
        (ed / "transcript.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"{len(lines)} sentences -> {ed / 'transcript.md'}")
        return

    segs = [snap(words, s, e) for s, e in parse_segments(a.segments)]
    for i, (s, e) in enumerate(segs, 1):
        print(f"short_{i:02d}: {s:.2f}-{e:.2f} ({e - s:.1f}s)")
    if a.cmd == "snap":
        return
    out = ed / "shorts"
    out.mkdir(exist_ok=True)
    for i, (s, e) in enumerate(segs, 1):
        clip = out / f"short_{i:02d}.mp4"
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{s:.3f}", "-t", f"{e - s:.3f}", "-i", video, "-c:v", "libx264", "-preset", "veryfast",
             "-crf", "16", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", clip])
        sub = [{"w": w["w"], "s": round(w["s"] - s, 3), "e": round(w["e"] - s, 3)} for w in words if s <= (w["s"] + w["e"]) / 2 < e]
        reel = out / f"short_{i:02d}-reel"
        reel.mkdir(exist_ok=True)
        (reel / "words.json").write_text(json.dumps({"language": "", "words": sub}, ensure_ascii=False), encoding="utf-8")
    print(f"{len(segs)} clips in {out} (each with its edit dir and words.json; skip transcribe.py for them)")


if __name__ == "__main__":
    main()
