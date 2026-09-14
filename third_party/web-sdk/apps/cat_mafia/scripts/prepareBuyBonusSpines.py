#!/usr/bin/env python3
"""Import designer buy-bonus card spines into runtime 4.2 Pixi assets.

Sources:
  designer_assets/cat_bonus_final  → normal (idle_bonus)
  designer_assets/wild_render      → super  (idle_bonus)
  designer_assets/export_cat&dog   → duel   (idle_duel)

Kept separate from board symbol / Super Wild curtain copies.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = APP_ROOT.parents[3]
OUT_ROOT = APP_ROOT / "static" / "assets" / "spines" / "buyBonus"

JOBS = (
    {
        "name": "normal",
        "src": REPO_ROOT / "designer_assets" / "cat_bonus_final",
        "json_name": "mascot_cat.json",
        "atlas_name": "mascot_cat.atlas",
        "pngs": ("mascot_cat.png", "mascot_cat_2.png"),
    },
    {
        "name": "super",
        "src": REPO_ROOT / "designer_assets" / "wild_render",
        "json_name": "WILD_F_1.json",
        "atlas_name": "WILD_F_1.atlas",
        "pngs": ("WILD_F_1.png",),
    },
    {
        "name": "duel",
        "src": REPO_ROOT / "designer_assets" / "export_cat&dog",
        "json_name": "mascot_cat.json",
        "atlas_name": "mascot_cat.atlas",
        "pngs": ("mascot_cat.png",),
    },
)


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


def convert_pngs(src_dir: Path, out_dir: Path, pngs: tuple[str, ...]) -> None:
    for png_name in pngs:
        src_png = src_dir / png_name
        if not src_png.is_file():
            raise FileNotFoundError(src_png)
        out_webp = out_dir / (Path(png_name).stem + ".webp")
        subprocess.run(
            ["cwebp", "-q", "90", "-exact", "-alpha_q", "100", str(src_png), "-o", str(out_webp)],
            check=True,
        )


def prepare_job(job: dict) -> None:
    src_dir: Path = job["src"]
    out_dir = OUT_ROOT / job["name"]
    src_json = src_dir / job["json_name"]
    src_atlas = src_dir / job["atlas_name"]

    for path in (src_json, src_atlas):
        if not path.is_file():
            raise FileNotFoundError(path)

    out_dir.mkdir(parents=True, exist_ok=True)

    data = json.loads(src_json.read_text(encoding="utf-8"))
    skeleton = data.setdefault("skeleton", {})
    skeleton["spine"] = "4.2.74"
    convert_constraints(data)
    strip_editor_bone_fields(data)

    out_json = out_dir / job["json_name"]
    out_json.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")

    atlas_text = src_atlas.read_text(encoding="utf-8")
    for png_name in job["pngs"]:
        atlas_text = atlas_text.replace(png_name, Path(png_name).stem + ".webp")
    (out_dir / job["atlas_name"]).write_text(atlas_text, encoding="utf-8")

    convert_pngs(src_dir, out_dir, job["pngs"])

    print(f"wrote {out_dir}")
    print("  animations:", sorted(data.get("animations", {})))


def main() -> int:
    try:
        for job in JOBS:
            prepare_job(job)
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        print(exc, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
