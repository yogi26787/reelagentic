"""Print everything the storyboard can use: effects (with props), caption styles, looks, SFX, custom effects.

Usage: python3 catalog.py [--grep word]
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import PLUGIN, load  # noqa: E402

src = PLUGIN / "engine" / "src"
q = sys.argv[sys.argv.index("--grep") + 1].lower() if "--grep" in sys.argv else ""
print("EFFECTS  (moment.effect; props in moment.props)")
for f in sorted((src / "effects").glob("*.tsx")):
    for doc, name in re.findall(r"/\*\* (.*?) \*/\nexport const (\w+): FX", f.read_text(), re.S):
        line = f"  {name:<15} [{f.stem}] {' '.join(doc.split())}"
        if q in line.lower():
            print(line)
cfg = load()
custom = sorted(p.stem for p in (Path(cfg["studio"]) / "custom-effects").glob("*.tsx"))
print("CUSTOM   ", ", ".join(custom) or "(none yet)")
print("CAPTIONS ", ", ".join(re.findall(r"^\s{2}\"?([\w-]+)\"?: \{", (src / "captionStyles.ts").read_text(), re.M)))
print("LOOKS    ", ", ".join(re.findall(r"^\s{2}\"?([\w-]+)\"?: \{", (src / "theme.ts").read_text(), re.M)))
print("SFX      ", ", ".join(sorted(f"studio:sfx/{p.name}" for p in (Path(cfg["studio"]) / "sfx").iterdir() if p.suffix in (".wav", ".mp3"))))
print("ZOOMS     punch | smooth | shake   (zooms[]: start, end, scale, focus?)")
print("TRANSITIONS whip | zoom-blur | glitch | shake | flash | burn | leak   (transitions[]: time, type, dur?)")
print("BROLL     full | pip | split   (broll[]: start, end, src, mode, startFrom?)")
