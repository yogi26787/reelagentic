"""Cut pauses, retakes and fillers; output a 1080x1920 30 fps cut.mp4 and remapped words.

Usage:
  python3 cut.py VIDEO EDIT_DIR [--pause 0.45] [--pad 0.12] [--noise -35] [--fit crop|pad] [--keep-fillers]
  python3 cut.py VIDEO EDIT_DIR --edl       # re-render from an edl.json you edited by hand
  python3 cut.py --selftest
Needs EDIT_DIR/words.json from transcribe.py. Writes edl.json, cut.mp4, words_cut.json.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import probe, run  # noqa: E402

FILLERS = {"um", "umm", "uh", "uhh", "uhm", "hmm", "hm", "erm", "er", "ah", "aa", "aah", "mm"}
W, H, FPS = 1080, 1920, 30


def norm(w: str) -> str:
    return re.sub(r"[^\w]", "", w.lower(), flags=re.UNICODE)


def silences(video, noise_db: float, min_len: float) -> list:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(video), "-vn", "-af",
                        f"silencedetect=noise={noise_db}dB:d={min_len}", "-f", "null", "-"],
                       capture_output=True, text=True)
    out, starts = [], []
    for line in r.stderr.splitlines():
        if m := re.search(r"silence_start: ([\d.]+)", line):
            starts.append(float(m.group(1)))
        elif (m := re.search(r"silence_end: ([\d.]+)", line)) and starts:
            out.append((starts.pop(), float(m.group(1))))
    return out


def refine(words: list, sil: list) -> list:
    """whisper.cpp often stretches a word across the silence before/after it; trim words to the audio."""
    out = []
    for w in words:
        s, e = w["s"], w["e"]
        for a, b in sil:
            if a < e and b > s and (min(b, e) - max(a, s)) > 0.15:
                if e - b >= 0.08:
                    s = max(s, b)  # speech starts after the silence
                else:
                    e = min(e, a)  # speech ended before it
        out.append({**w, "s": round(s, 3), "e": round(max(e, s + 0.05), 3)})
    return out


def retakes(words: list, n: int = 3, window: int = 15) -> list:
    """A phrase restarted within `window` words means the earlier attempt is a mistake: drop it."""
    keys = [norm(w["w"]) for w in words]
    drop, i = [], 0
    while i < len(words) - n:
        gram = keys[i:i + n]
        hit = next((j for j in range(i + 1, min(i + window, len(words) - n + 1)) if keys[j:j + n] == gram and all(gram)), None)
        if hit is not None:
            drop.append((words[i]["s"], words[hit]["s"], "retake", " ".join(w["w"] for w in words[i:hit])))
            i = hit
        else:
            i += 1
    return drop


def subtract(keep: list, remove: list) -> list:
    out = []
    for s, e in keep:
        cur = [(s, e)]
        for rs, re_ in remove:
            nxt = []
            for a, b in cur:
                if re_ <= a or rs >= b:
                    nxt.append((a, b))
                else:
                    if rs > a:
                        nxt.append((a, rs))
                    if re_ < b:
                        nxt.append((re_, b))
            cur = nxt
        out += cur
    return out


def plan(words, dur, sil, pause, pad, keep_fillers):
    removed = []
    for s, e in sil:  # leading/trailing silence fully, inner pauses shrunk by pad
        if e - s < pause:
            continue
        a = 0.0 if s <= 0.05 else s + pad
        b = dur if e >= dur - 0.05 else e - pad
        if b > a:
            removed.append((a, b, "pause", ""))
    removed += retakes(words)
    if not keep_fillers:
        removed += [(w["s"], w["e"], "filler", w["w"]) for w in words if norm(w["w"]) in FILLERS]
    segs = subtract([(0.0, dur)], [(a, b) for a, b, *_ in removed])
    segs = [(round(a, 3), round(b, 3)) for a, b in segs if b - a >= 0.15]
    return segs, [{"start": round(a, 3), "end": round(b, 3), "reason": r, "text": t} for a, b, r, t in sorted(removed)]


def remap(words, segs, drops=()):
    """Words → output timeline. Words in a retake/filler are dropped; a word whisper misplaced
    into a cut pause is snapped into the nearest kept segment instead of being lost."""
    offs, o = [], 0.0
    for s, e in segs:
        offs.append(o)
        o += e - s
    out = []
    for w in words:
        mid = (w["s"] + w["e"]) / 2
        if any(a <= mid < b for a, b in drops) or not segs:
            continue
        i = min(range(len(segs)), key=lambda k: 0 if segs[k][0] <= mid < segs[k][1] else min(abs(mid - segs[k][0]), abs(mid - segs[k][1])))
        s, e = segs[i]
        ws, we = min(max(w["s"], s), e - 0.05), max(min(w["e"], e), s + 0.05)
        out.append({"w": w["w"], "s": round(ws - s + offs[i], 3), "e": round(max(we, ws + 0.05) - s + offs[i], 3)})
    out.sort(key=lambda x: x["s"])
    return out, o


def vfilter(info, fit):
    tm = "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p," if info["hdr"] else ""
    if fit == "pad" and info["width"] > info["height"]:
        return (f"{tm}split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=40[bg];"
                f"[b]scale={W}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps={FPS},setsar=1")
    return f"{tm}scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1"


def render(video, segs, out, info, fit):
    with tempfile.TemporaryDirectory() as td:
        parts = []
        for i, (s, e) in enumerate(segs):
            d = e - s
            p = Path(td) / f"s{i:04d}.mp4"
            cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{s:.3f}", "-t", f"{d:.3f}", "-i", video,
                   "-filter_complex", f"[0:v]{vfilter(info, fit)}[v]", "-map", "[v]"]
            if info["has_audio"]:
                cmd += ["-map", "0:a:0", "-af", f"afade=t=in:st=0:d=0.03,afade=t=out:st={max(d - 0.03, 0):.3f}:d=0.03",
                        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
            cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", p]
            run(cmd)
            parts.append(p)
        lst = Path(td) / "list.txt"
        lst.write_text("".join(f"file '{p}'\n" for p in parts))
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", out])


def selftest():
    assert subtract([(0, 10)], [(2, 3), (5, 6)]) == [(0, 2), (3, 5), (6, 10)]
    ws = [{"w": x, "s": i, "e": i + 0.5} for i, x in enumerate("so today I want so today I want to talk".split())]
    r = retakes(ws)
    assert r and r[0][0] == 0 and r[0][1] == 4, r
    segs, rm = plan(ws, 11.0, [(0, 0.02)], 0.45, 0.1, False)
    kept, dur = remap(ws, segs, [(x["start"], x["end"]) for x in rm if x["reason"] != "pause"])
    assert [w["w"] for w in kept] == "so today I want to talk".split(), kept
    assert abs(dur - 7.0) < 1e-6 and kept[0]["s"] == 0
    lost = {"w": "a", "s": 4.2, "e": 4.5}  # whisper put it inside a cut pause (4-5): keep it, snapped
    k2, _ = remap([lost], [(0, 4.1), (5, 6)], [])
    assert k2[0]["w"] == "a" and 4.0 <= k2[0]["s"] < k2[0]["e"] <= 4.1, k2
    r = refine([{"w": "so", "s": 0.8, "e": 2.6}, {"w": "end", "s": 3.0, "e": 4.5}], [(0.9, 2.4), (3.4, 4.48)])
    assert (r[0]["s"], r[0]["e"]) == (2.4, 2.6) and (r[1]["s"], r[1]["e"]) == (3.0, 3.4), r
    print("cut.py selftest ok")


def main():
    if "--selftest" in sys.argv:
        return selftest()
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("edit_dir")
    ap.add_argument("--pause", type=float, default=0.45)
    ap.add_argument("--pad", type=float, default=0.12)
    ap.add_argument("--noise", type=float, default=-35)
    ap.add_argument("--fit", choices=["crop", "pad"], default="crop")
    ap.add_argument("--keep-fillers", action="store_true")
    ap.add_argument("--edl", action="store_true", help="use EDIT_DIR/edl.json as is")
    a = ap.parse_args()
    video, ed = Path(a.video).expanduser(), Path(a.edit_dir).expanduser()
    info = probe(video)
    words = json.loads((ed / "words.json").read_text())["words"]
    edl_path = ed / "edl.json"
    sil = silences(video, a.noise, min(a.pause, 0.3)) if info["has_audio"] else []
    words = refine(words, sil)
    if a.edl:
        edl = json.loads(edl_path.read_text())
        segs = [tuple(s) for s in edl["segments"]]
    else:
        segs, removed = plan(words, info["duration"], sil, a.pause, a.pad, a.keep_fillers)
        edl = {"source": str(video), "fit": a.fit, "segments": segs, "removed": removed}
        edl_path.write_text(json.dumps(edl, indent=1, ensure_ascii=False))
    render(video, segs, ed / "cut.mp4", info, edl.get("fit", a.fit))
    drops = [(r["start"], r["end"]) for r in edl.get("removed", []) if r["reason"] != "pause"]
    kept, dur = remap(words, segs, drops)
    (ed / "words_cut.json").write_text(json.dumps({"words": kept}, ensure_ascii=False, indent=0))
    print(f"source {info['duration']:.1f}s -> cut {dur:.1f}s in {len(segs)} segments; "
          f"removed: {', '.join(f'{r['reason']} {r['start']:.1f}-{r['end']:.1f}' for r in edl.get('removed', [])[:40])}")


if __name__ == "__main__":
    main()
