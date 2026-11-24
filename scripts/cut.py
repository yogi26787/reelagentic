"""Cut pauses, retakes and fillers; output a 1080x1920 30 fps cut.mp4 and remapped words.

Usage:
  python3 cut.py VIDEO EDIT_DIR [--pause 0.45] [--pad 0.12] [--noise -35] [--fit crop|pad] [--keep-fillers]
                [--grade auto|none|NAME|FILE] [--no-enhance]
  python3 cut.py VIDEO EDIT_DIR --edl       # re-render from an edl.json you edited by hand
  python3 cut.py --selftest
Needs EDIT_DIR/words.json from transcribe.py. Writes edl.json, cut.mp4, words_cut.json.

edl.json segments are [start, end] or [start, end, speed] (0.25-4; 0.5 = slow motion, 2 = fast).
Set "smoothSlowmo": true in edl.json for motion-interpolated slow motion (slower to render).
Grades: FFmpeg filter chains in <Studio>/grades/NAME.txt or scripts/grades/NAME.txt; "auto" levels
exposure and saturation from the footage (like an auto-enhance button).
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import PLUGIN, load, probe, run  # noqa: E402

FILLERS = {"um", "umm", "uh", "uhh", "uhm", "hmm", "hm", "erm", "er", "ah", "aa", "aah", "mm"}
W, H, FPS = 1080, 1920, 30
# voice clean-up: rumble cut, gentle denoise, light compression (loudness is normalised after the final mix)
ENHANCE = "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2"


def speed(seg) -> float:
    return float(seg[2]) if len(seg) > 2 else 1.0


def atempo(sp: float) -> str:
    """atempo takes 0.5-100 per instance; chain for slower speeds."""
    parts = []
    while sp < 0.5:
        parts.append("atempo=0.5")
        sp /= 0.5
    return ",".join(parts + [f"atempo={sp:.4f}"])


def auto_grade(video) -> str:
    """Measure average luma/saturation on 1 fps samples and level them (deterministic arithmetic)."""
    import math
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-vf", "fps=1,scale=320:-2,signalstats,metadata=print:file=-",
                        "-an", "-f", "null", "-"], capture_output=True, text=True)
    y = [float(v) for v in re.findall(r"signalstats.YAVG=([\d.]+)", r.stdout)]
    sat = [float(v) for v in re.findall(r"signalstats.SATAVG=([\d.]+)", r.stdout)]
    if not y:
        return ""
    ya, sa = sum(y) / len(y), sum(sat) / max(1, len(sat))
    gamma = min(1.35, max(0.75, math.log(max(ya, 1) / 255) / math.log(118 / 255)))
    satk = min(1.25, max(0.9, 42 / max(sa, 1)))
    return f"eq=contrast=1.04:gamma={gamma:.3f}:saturation={satk:.3f}"


def resolve_grade(name, video) -> str:
    if not name or name == "none":
        return ""
    if name == "auto":
        return auto_grade(video)
    f = Path(name).expanduser()
    if not f.exists():
        dirs = [Path(load()["studio"]) / "grades", PLUGIN / "scripts" / "grades"]
        f = next((d / f"{name}{ext}" for d in dirs for ext in (".txt", ".cube") if (d / f"{name}{ext}").exists()), f)
    if not f.exists():
        sys.exit(f"unknown grade {name!r}: add <Studio>/grades/{name}.txt (FFmpeg filters) or {name}.cube (3D LUT)")
    if f.suffix.lower() == ".cube":  # 3D LUT from Resolve/Premiere/phone apps; escape for the filter graph
        return "lut3d=file='" + f.resolve().as_posix().replace(":", "\\:").replace("'", "\\'") + "'"
    return " ".join(x.strip() for x in f.read_text(encoding="utf-8").splitlines() if x.strip() and not x.startswith("#"))


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
    for seg in segs:
        offs.append(o)
        o += (seg[1] - seg[0]) / speed(seg)
    out = []
    for w in words:
        mid = (w["s"] + w["e"]) / 2
        if any(a <= mid < b for a, b in drops) or not segs:
            continue
        i = min(range(len(segs)), key=lambda k: 0 if segs[k][0] <= mid < segs[k][1] else min(abs(mid - segs[k][0]), abs(mid - segs[k][1])))
        s, e, sp = segs[i][0], segs[i][1], speed(segs[i])
        ws, we = min(max(w["s"], s), e - 0.05), max(min(w["e"], e), s + 0.05)
        out.append({"w": w["w"], "s": round((ws - s) / sp + offs[i], 3), "e": round((max(we, ws + 0.05) - s) / sp + offs[i], 3)})
    out.sort(key=lambda x: x["s"])
    return out, o


def follow_expr(points, s, e) -> str:
    """Piecewise-linear crop centre (0..1) over segment time t (starts at 0), as an FFmpeg expression.
    shortcut: <=60 keyframes per segment (nested ifs); for longer segments sample track.py more coarsely."""
    pts = [(t - s, x) for t, x in points if s - 1 <= t <= e + 1]
    if not pts:
        return "0.5"
    pts = pts[:: max(1, len(pts) // 60)]
    expr = f"{pts[-1][1]:.4f}"
    for (t0, x0), (t1, x1) in reversed(list(zip(pts, pts[1:]))):
        expr = f"if(lt(t,{t1:.3f}),{x0:.4f}+({x1 - x0:.4f})*(t-{t0:.3f})/{max(t1 - t0, 1e-3):.3f},{expr})"
    return f"if(lt(t,{pts[0][0]:.3f}),{pts[0][1]:.4f},{expr})"


def vfilter(info, fit, grade="", xexpr=None):
    tm = "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p," if info["hdr"] else ""
    if fit == "follow" and info["width"] > info["height"]:
        # 9:16 window following track.json; quotes keep the expression's commas out of the filter graph
        cx = xexpr or "0.5"
        return (f"{tm}crop=w=ih*9/16:h=ih:x='max(0,min(iw-ih*9/16,({cx})*iw-ih*9/32))':y=0,"
                f"scale={W}:{H},fps={FPS},setsar=1" + (f",{grade}" if grade else ""))
    if fit == "pad" and info["width"] > info["height"]:
        return (f"{tm}split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=40[bg];"
                f"[b]scale={W}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps={FPS},setsar=1" + (f",{grade}" if grade else ""))
    return f"{tm}scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1" + (f",{grade}" if grade else "")


def render(video, segs, out, info, fit, grade="", enhance=True, smooth=False, track=None):
    with tempfile.TemporaryDirectory() as td:
        parts = []
        for i, seg in enumerate(segs):
            s, e, sp = seg[0], seg[1], speed(seg)
            d = (e - s) / sp  # output duration
            p = Path(td) / f"s{i:04d}.mp4"
            vf = vfilter(info, fit, grade, follow_expr(track, s, e) if track else None)
            if sp != 1:
                vf += f",setpts=PTS/{sp}" + (f",minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc" if smooth and sp < 1 else f",fps={FPS}")
            cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{s:.3f}", "-t", f"{e - s:.3f}", "-i", video,
                   "-filter_complex", f"[0:v]{vf}[v]", "-map", "[v]"]
            if info["has_audio"]:
                af = ",".join(x for x in [ENHANCE if enhance else "", atempo(sp) if sp != 1 else "",
                                          f"afade=t=in:st=0:d=0.03,afade=t=out:st={max(d - 0.03, 0):.3f}:d=0.03"] if x)
                cmd += ["-map", "0:a:0", "-af", af, "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2"]
            cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", p]
            run(cmd)
            parts.append(p)
        lst = Path(td) / "list.txt"
        lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
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
    k3, d3 = remap([{"w": "slow", "s": 1.0, "e": 1.5}], [(0, 2, 0.5)], [])
    assert d3 == 4.0 and (k3[0]["s"], k3[0]["e"]) == (2.0, 3.0), (k3, d3)
    assert atempo(0.25) == "atempo=0.5,atempo=0.5000" and atempo(2) == "atempo=2.0000"
    fx = follow_expr([[0, 0.2], [2, 0.6], [4, 0.6]], 0, 4)
    ev = lambda t: eval(fx.replace("if(", "_if(").replace("lt(", "_lt("), {"_if": lambda c, a, b: a if c else b, "_lt": lambda a, b: a < b, "t": t})  # noqa: E731
    assert abs(ev(1.0) - 0.4) < 1e-6 and ev(3.0) == 0.6 and ev(-1) == 0.2, fx
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
    ap.add_argument("--fit", choices=["crop", "pad", "follow"], default="crop",
                    help="landscape footage: crop centre, pad with blur, or follow the subject (needs track.py first)")
    ap.add_argument("--keep-fillers", action="store_true")
    ap.add_argument("--grade", default=None, help="auto | none | grade name | filter file (default: none)")
    ap.add_argument("--no-enhance", action="store_true", help="skip voice clean-up")
    ap.add_argument("--edl", action="store_true", help="use EDIT_DIR/edl.json as is")
    a = ap.parse_args()
    video, ed = Path(a.video).expanduser(), Path(a.edit_dir).expanduser()
    info = probe(video)
    words = json.loads((ed / "words.json").read_text(encoding="utf-8"))["words"]
    edl_path = ed / "edl.json"
    sil = silences(video, a.noise, min(a.pause, 0.3)) if info["has_audio"] else []
    words = refine(words, sil)
    if a.edl:
        edl = json.loads(edl_path.read_text(encoding="utf-8"))
        segs = [tuple(s) for s in edl["segments"]]
        if a.grade is not None:
            edl["grade"] = a.grade
    else:
        segs, removed = plan(words, info["duration"], sil, a.pause, a.pad, a.keep_fillers)
        edl = {"source": str(video), "fit": a.fit, "grade": a.grade or "none", "enhance": not a.no_enhance,
               "smoothSlowmo": False, "segments": segs, "removed": removed}
    grade = resolve_grade(edl.get("grade", "none"), video)
    edl["gradeFilter"] = grade
    edl_path.write_text(json.dumps(edl, indent=1, ensure_ascii=False), encoding="utf-8")
    fit = edl.get("fit", a.fit)
    track = None
    if fit == "follow":
        tf = ed / "track.json"
        if not tf.exists():
            sys.exit("--fit follow needs EDIT_DIR/track.json: run track.py VIDEO EDIT_DIR --mode face|motion first")
        track = json.loads(tf.read_text(encoding="utf-8"))["points"]
    render(video, segs, ed / "cut.mp4", info, fit, grade,
           edl.get("enhance", True) and not a.no_enhance, edl.get("smoothSlowmo", False), track)
    drops = [(r["start"], r["end"]) for r in edl.get("removed", []) if r["reason"] != "pause"]
    kept, dur = remap(words, segs, drops)
    (ed / "words_cut.json").write_text(json.dumps({"words": kept}, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"source {info['duration']:.1f}s -> cut {dur:.1f}s in {len(segs)} segments; "
          f"removed: {', '.join(f'{r['reason']} {r['start']:.1f}-{r['end']:.1f}' for r in edl.get('removed', [])[:40])}")


if __name__ == "__main__":
    main()
