#!/usr/bin/env python3
"""Import designer_assets/json (lighter) into cat_mafia H3 symbol spine.

Source layout:
  lighter.json + lighter1.atlas + lighter1.png
  lighter-idle_0.png / lighter-stop_0.png / lighter-win_0.png (composed stills)

Runtime keeps the H3 key (atlas page renamed to H3.webp).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = APP_ROOT.parents[3]
SRC_DIR = REPO_ROOT / "designer_assets" / "json"
OUT_DIR = APP_ROOT / "static" / "assets" / "spines" / "symbols" / "H3"


def main() -> int:
	src_json = SRC_DIR / "lighter.json"
	src_atlas = SRC_DIR / "lighter1.atlas"
	src_png = SRC_DIR / "lighter1.png"

	for path in (src_json, src_atlas, src_png):
		if not path.is_file():
			print(f"missing source: {path}", file=sys.stderr)
			return 1

	OUT_DIR.mkdir(parents=True, exist_ok=True)

	data = json.loads(src_json.read_text(encoding="utf-8"))
	anims = data.get("animations", {})
	expected = {"idle", "stop", "win"}
	missing = expected - set(anims)
	if missing:
		print(f"missing animations: {sorted(missing)}", file=sys.stderr)
		return 1

	out_json = OUT_DIR / "H3.json"
	out_json.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")

	atlas_text = src_atlas.read_text(encoding="utf-8")
	atlas_text = atlas_text.replace("lighter1.png", "H3.webp", 1)
	(OUT_DIR / "H3.atlas").write_text(atlas_text, encoding="utf-8")

	out_webp = OUT_DIR / "H3.webp"
	subprocess.run(
		["cwebp", "-q", "90", "-exact", "-alpha_q", "100", str(src_png), "-o", str(out_webp)],
		check=True,
	)

	print(f"wrote {out_json}")
	print(f"wrote {OUT_DIR / 'H3.atlas'}")
	print(f"wrote {out_webp}")
	print("animations:", sorted(anims))
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
