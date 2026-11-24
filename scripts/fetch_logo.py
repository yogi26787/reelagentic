"""Fetch an app/website logo (favicon service, 256 px) into the Studio logos folder.

Usage: python3 fetch_logo.py chatgpt.com [notion.so ...]
Prints the studio: path to use in a storyboard. Check the image: some sites only have tiny icons.
"""
import sys
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from rf_config import load  # noqa: E402

logos = Path(load()["studio"]) / "logos"
logos.mkdir(parents=True, exist_ok=True)
for domain in sys.argv[1:]:
    d = urllib.parse.urlparse(domain if "//" in domain else f"https://{domain}").hostname or domain
    out = logos / f"{d.removeprefix('www.')}.png"
    url = f"https://www.google.com/s2/favicons?domain={urllib.parse.quote(d)}&sz=256"
    req = urllib.request.Request(url, headers={"User-Agent": "reel-maker/0.1"})
    with urllib.request.urlopen(req, timeout=20) as r:
        out.write_bytes(r.read())
    print(f"studio:logos/{out.name}")
