"""Word-level transcript, cached per source file.

Usage: python3 transcribe.py VIDEO EDIT_DIR [--lang auto|en|hi|...] [--prompt TEXT] [--name words]
                             [--engine cpp|python] [--py-model small]
Engines: "cpp" = whisper.cpp (default, fast, no Python deps). "python" = OpenAI Whisper's own word
timestamps through faster-whisper (pip install faster-whisper) or openai-whisper (pip install
openai-whisper), whichever is installed: slower, but tighter word timing for captions.
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


def python_engine(wav: Path, lang: str, prompt: str, model_name: str):
    """faster-whisper first (CTranslate2, CPU friendly), else openai-whisper; both give word timestamps."""
    lang_arg = None if lang == "auto" else lang
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_name, device="auto", compute_type="int8")
        segs, info = model.transcribe(str(wav), language=lang_arg, initial_prompt=prompt or None, word_timestamps=True, vad_filter=True)
        words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(max(w.end, w.start + 0.05), 3)}
                 for seg in segs for w in (seg.words or []) if w.word.strip()]
        return words, info.language, "faster-whisper"
    except ImportError:
        pass
    try:
        import whisper
    except ImportError:
        sys.exit("--engine python needs: python -m pip install faster-whisper   (or openai-whisper)")
    r = whisper.load_model(model_name).transcribe(str(wav), language=lang_arg, initial_prompt=prompt or None, word_timestamps=True)
    words = [{"w": w["word"].strip(), "s": round(w["start"], 3), "e": round(max(w["end"], w["start"] + 0.05), 3)}
             for seg in r["segments"] for w in seg.get("words", []) if w["word"].strip()]
    return words, r.get("language", lang), "openai-whisper"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("edit_dir")
    ap.add_argument("--lang", default="auto")
    ap.add_argument("--prompt", default="")
    ap.add_argument("--name", default="words")
    ap.add_argument("--engine", choices=["cpp", "python"])
    ap.add_argument("--py-model", default=None, help="model for --engine python (tiny/base/small/medium/large-v3)")
    a = ap.parse_args()
    cfg = load()
    engine = a.engine or cfg.get("asr", "cpp")
    py_model = a.py_model or cfg.get("py_model", "small")
    src, out_dir = Path(a.video).expanduser(), Path(a.edit_dir).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{a.name}.json"
    key = stamp(src) + a.lang + a.prompt + (cfg["model"] if engine == "cpp" else f"py:{py_model}")
    if out.exists() and json.loads(out.read_text(encoding="utf-8")).get("key") == key:
        print(f"cached: {out}")
        return
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "a.wav"
        run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav])
        if engine == "python":
            words, lang, used = python_engine(wav, a.lang, a.prompt, py_model)
            out.write_text(json.dumps({"key": key, "language": lang, "engine": used, "words": words}, ensure_ascii=False, indent=0), encoding="utf-8")
            print(f"{len(words)} words ({used}), language={lang} -> {out}")
            print(" ".join(w["w"] for w in words)[:1500])
            return
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
