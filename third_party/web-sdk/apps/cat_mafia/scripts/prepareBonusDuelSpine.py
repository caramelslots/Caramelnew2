#!/usr/bin/env python3
"""Import designer `export_cat&dog` into runtime BD symbol spine (mirrors B from export_cat)."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = APP_ROOT.parents[3]
SRC_DIR = REPO_ROOT / "designer_assets" / "bonus" / "export_cat&dog"
OUT_DIR = APP_ROOT / "static" / "assets" / "spines" / "symbols" / "BD"

ANIMATION_RENAMES = {
    "idle_dc": "idle",
    "land_dc": "land",
    "activate_dc": "activate",
}


def main() -> int:
    src_json = SRC_DIR / "mascot_cat.json"
    src_atlas = SRC_DIR / "mascot_cat.atlas"
    src_png = SRC_DIR / "mascot_cat.png"

    for path in (src_json, src_atlas, src_png):
        if not path.is_file():
            print(f"missing source: {path}", file=sys.stderr)
            return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    data = json.loads(src_json.read_text(encoding="utf-8"))
    animations = data.get("animations", {})
    renamed: dict[str, object] = {}
    for old_name, clip in animations.items():
        new_name = ANIMATION_RENAMES.get(old_name, old_name)
        renamed[new_name] = clip
    missing = set(ANIMATION_RENAMES.values()) - set(renamed)
    if missing:
        print(f"missing expected animations after rename: {sorted(missing)}", file=sys.stderr)
        return 1
    data["animations"] = renamed

    out_json = OUT_DIR / "BD.json"
    out_json.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")

    atlas_text = src_atlas.read_text(encoding="utf-8")
    atlas_text = atlas_text.replace("mascot_cat.png", "BD.webp", 1)
    (OUT_DIR / "BD.atlas").write_text(atlas_text, encoding="utf-8")

    out_webp = OUT_DIR / "BD.webp"
    subprocess.run(
        ["cwebp", "-q", "90", str(src_png), "-o", str(out_webp)],
        check=True,
    )

    print(f"wrote {out_json}")
    print(f"wrote {OUT_DIR / 'BD.atlas'}")
    print(f"wrote {out_webp}")
    print("animations:", sorted(renamed))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
