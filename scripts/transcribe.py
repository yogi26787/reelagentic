"""Word-level transcript with whisper.cpp, cached per source file.

Usage: python3 transcribe.py VIDEO EDIT_DIR [--lang auto|en|hi|...] [--prompt TEXT] [--name words]
Writes EDIT_DIR/<name>.json: {"language": str, "words": [{"w": str, "s": sec, "e": sec}]}
Hinglish tip: --lang hi --prompt "Haan toh dosto, aaj hum baat karenge" biases toward Roman Hinglish.
"""
import argparse
import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import load, run  # noqa: E402

NOISE = re.compile(r"^\[.*\]$|^\(.*\)$|^[♪*]+$")


def stamp(p: Path) -> str:
    st = p.stat()
    return hashlib.sha1(f"{p.resolve()}|{st.st_size}|{st.st_mtime_ns}".encode()).hexdigest()


def parse(whisper_json: dict) -> list:
    words = []
    for seg in whisper_json.get("transcription", []):
        text = seg["text"]
        s, e = seg["offsets"]["from"] / 1000, seg["offsets"]["to"] / 1000
        t = text.strip()
        if not t or NOISE.match(t):
            continue
        # whisper.cpp may split one word across segments; a piece without a leading space joins the previous word
        if words and not text.startswith(" "):
            words[-1]["w"] += t
            words[-1]["e"] = max(words[-1]["e"], e)
            continue
        words.append({"w": t, "s": round(s, 3), "e": round(max(e, s + 0.05), 3)})
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("edit_dir")
    ap.add_argument("--lang", default="auto")
    ap.add_argument("--prompt", default="")
    ap.add_argument("--name", default="words")
    a = ap.parse_args()
    cfg = load()
    src, out_dir = Path(a.video).expanduser(), Path(a.edit_dir).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{a.name}.json"
    key = stamp(src) + a.lang + a.prompt + cfg["model"]
    if out.exists() and json.loads(out.read_text(encoding="utf-8")).get("key") == key:
        print(f"cached: {out}")
        return
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "a.wav"
        run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav])
        cmd = ["whisper-cli", "-m", cfg["model"], "-f", wav, "-l", a.lang, "-ml", "1", "-sow", "-oj",
               "-of", Path(td) / "w", "-np"]
        if a.prompt:
            cmd += ["--prompt", a.prompt]
        run(cmd)
        j = json.loads((Path(td) / "w.json").read_text(encoding="utf-8", errors="replace"))
    words = parse(j)
    lang = j.get("result", {}).get("language", a.lang)
    out.write_text(json.dumps({"key": key, "language": lang, "words": words}, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"{len(words)} words, language={lang} -> {out}")
    print(" ".join(w["w"] for w in words)[:1500])


if __name__ == "__main__":
    main()
