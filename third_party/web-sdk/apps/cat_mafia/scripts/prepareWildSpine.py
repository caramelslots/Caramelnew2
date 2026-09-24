#!/usr/bin/env python3
"""Import designer_assets/wild_render into cat_mafia Super Wild + Wild symbol spines.

Spine 4.3 JSON is rewritten to the 4.2 shape the runtime already loads:
constraints[] → transform[], version string, drop editor-only bone fields.
Atlas PNG is packed to WebP (single page — replaces the old two-page export).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = APP_ROOT.parents[3]
SRC_DIR = REPO_ROOT / "designer_assets" / "wild_render"
OUT_DIR = APP_ROOT / "static" / "assets" / "spines" / "superWild"
OLD_JSON = OUT_DIR / "WILD_F_1.json"


def convert_constraints(data: dict, old_transform: list[dict]) -> None:
    constraints = data.pop("constraints", [])
    old_by_name = {item["name"]: item for item in old_transform}
    transform: list[dict] = []
    for item in constraints:
        if item.get("type") != "transform":
            continue
        old = old_by_name.get(item["name"], {})
        next_item: dict = {
            "name": item["name"],
            "bones": item["bones"],
            "target": item.get("source") or item.get("target"),
        }
        if "order" in old:
            next_item["order"] = old["order"]
        for key in ("rotation", "x", "y", "scaleX", "scaleY", "shearY"):
            if key in item:
                next_item[key] = item[key]
            elif key in old:
                next_item[key] = old[key]
        next_item["mixRotate"] = item.get("mixRotate", old.get("mixRotate", 0))
        next_item["mixX"] = item.get("mixX", old.get("mixX", 0))
        next_item["mixY"] = item.get("mixY", old.get("mixY", next_item["mixX"]))
        next_item["mixScaleX"] = item.get("mixScaleX", old.get("mixScaleX", 0))
        next_item["mixShearY"] = item.get("mixShearY", old.get("mixShearY", 0))
        transform.append(next_item)
    data["transform"] = transform


def strip_editor_bone_fields(data: dict) -> None:
    for bone in data.get("bones", []):
        bone.pop("icon", None)


def main() -> int:
    src_json = SRC_DIR / "WILD_F_1.json"
    src_atlas = SRC_DIR / "WILD_F_1.atlas"
    src_png = SRC_DIR / "WILD_F_1.png"

    for path in (src_json, src_atlas, src_png):
        if not path.is_file():
            print(f"missing source: {path}", file=sys.stderr)
            return 1

    old_transform: list[dict] = []
    if OLD_JSON.is_file():
        old = json.loads(OLD_JSON.read_text(encoding="utf-8"))
        old_transform = list(old.get("transform", []))

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    data = json.loads(src_json.read_text(encoding="utf-8"))
    skeleton = data.setdefault("skeleton", {})
    skeleton["spine"] = "4.2.74"
    convert_constraints(data, old_transform)
    strip_editor_bone_fields(data)

    out_json = OUT_DIR / "WILD_F_1.json"
    out_json.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")

    atlas_text = src_atlas.read_text(encoding="utf-8")
    atlas_text = atlas_text.replace("WILD_F_1.png", "WILD_F_1.webp", 1)
    (OUT_DIR / "WILD_F_1.atlas").write_text(atlas_text, encoding="utf-8")

    out_webp = OUT_DIR / "WILD_F_1.webp"
    subprocess.run(
        ["cwebp", "-q", "90", "-exact", "-alpha_q", "100", str(src_png), "-o", str(out_webp)],
        check=True,
    )

    leftover = OUT_DIR / "WILD_F_1_2.webp"
    if leftover.is_file():
        leftover.unlink()

    print(f"wrote {out_json}")
    print(f"wrote {OUT_DIR / 'WILD_F_1.atlas'}")
    print(f"wrote {out_webp}")
    print("animations:", sorted(data.get("animations", {})))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
