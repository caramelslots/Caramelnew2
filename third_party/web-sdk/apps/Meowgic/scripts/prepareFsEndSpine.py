#!/usr/bin/env python3
"""Import designer_assets/export into cat_mafia FS end popup (fsPopup / total_win)."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = APP_ROOT.parents[3]
SRC_DIR = REPO_ROOT / "designer_assets" / "export"
OUT_DIR = APP_ROOT / "static" / "assets" / "spines" / "fsEnd"

SRC_JSON = "total_win_final_with_separate_IN.json"
SRC_ATLAS = "total_win_final_with_separate_IN.atlas"
SRC_PNGS = ("total_win_final_with_separate_IN.png", "total_win_final_with_separate_IN_2.png")
OUT_JSON = "total_win.json"
OUT_ATLAS = "total_win.atlas"
OUT_WEBPS = ("total_win.webp", "total_win_2.webp")


def convert_constraints(data: dict) -> None:
    constraints = data.pop("constraints", [])
    transform: list[dict] = []
    for item in constraints:
        if item.get("type") != "transform":
            continue
        next_item: dict = {
            "name": item["name"],
            "bones": item["bones"],
            "target": item.get("source") or item.get("target"),
        }
        for key in ("rotation", "x", "y", "scaleX", "scaleY", "shearY"):
            if key in item:
                next_item[key] = item[key]
        next_item["mixRotate"] = item.get("mixRotate", 0)
        next_item["mixX"] = item.get("mixX", 0)
        next_item["mixY"] = item.get("mixY", next_item["mixX"])
        next_item["mixScaleX"] = item.get("mixScaleX", 0)
        next_item["mixShearY"] = item.get("mixShearY", 0)
        transform.append(next_item)
    if transform:
        data["transform"] = transform


def strip_editor_bone_fields(data: dict) -> None:
    for bone in data.get("bones", []):
        bone.pop("icon", None)


def strip_atlas_pma(atlas_text: str) -> str:
    lines = [line for line in atlas_text.splitlines() if line.strip() != "pma:true"]
    return "\n".join(lines) + ("\n" if atlas_text.endswith("\n") else "")


def main() -> int:
    src_json = SRC_DIR / SRC_JSON
    src_atlas = SRC_DIR / SRC_ATLAS
    for path in (src_json, src_atlas, *(SRC_DIR / png for png in SRC_PNGS)):
        if not path.is_file():
            print(f"missing source: {path}", file=sys.stderr)
            return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    data = json.loads(src_json.read_text(encoding="utf-8"))
    data.setdefault("skeleton", {})["spine"] = "4.2.74"
    convert_constraints(data)
    strip_editor_bone_fields(data)
    (OUT_DIR / OUT_JSON).write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")

    atlas_text = src_atlas.read_text(encoding="utf-8")
    for src_png, out_webp in zip(SRC_PNGS, OUT_WEBPS):
        atlas_text = atlas_text.replace(src_png, out_webp)
    (OUT_DIR / OUT_ATLAS).write_text(strip_atlas_pma(atlas_text), encoding="utf-8")

    for src_png, out_webp in zip(SRC_PNGS, OUT_WEBPS):
        subprocess.run(
            [
                "cwebp",
                "-q",
                "90",
                "-exact",
                "-alpha_q",
                "100",
                str(SRC_DIR / src_png),
                "-o",
                str(OUT_DIR / out_webp),
            ],
            check=True,
        )

    for stale in OUT_DIR.glob("*.png"):
        stale.unlink()

    print(f"wrote {OUT_DIR}")
    print("  animations:", sorted(data.get("animations", {})))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
