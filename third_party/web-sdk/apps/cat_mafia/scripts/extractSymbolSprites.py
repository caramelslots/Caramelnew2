#!/usr/bin/env python3
"""
Extract the per-symbol static sprites out of the packed Spine atlas
(`spines/symbolsNew/symbols.webp` + `symbols.atlas`) and write them as
standalone WebP files into `sprites/symbolsNew/`.

These static sprites are the resting-state previews used by `assets.ts`
(`WImg`, `BImg`, ...) and the paytable overlay (`gameInfoSymbols.ts`).

Regions with a trimmed `offsets:` entry (e.g. `Special_1`) are re-expanded
onto their original untrimmed canvas so every sprite stays 196x196.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
ATLAS_DIR = APP_ROOT / "static/assets/spines/symbolsNew"
SPRITE_DIR = APP_ROOT / "static/assets/sprites/symbolsNew"
ATLAS_FILE = ATLAS_DIR / "symbols.atlas"

# Atlas region name -> output sprite filename (without extension). Only the
# regions listed here become standalone sprites; the rest live purely inside
# the Spine skeletons.
REGION_TO_SPRITE = {
    "Special_1": "Special_1",
    "Special_2": "Special_2",
}


def parse_atlas(atlas_path: Path) -> tuple[str, dict[str, dict]]:
    """Parse the compact Spine 4.x atlas format.

    Returns the page image filename and a map of region name -> fields
    (`bounds`, optional `offsets`, optional `rotate`).
    """
    lines = atlas_path.read_text(encoding="utf-8").splitlines()
    page_image = ""
    regions: dict[str, dict] = {}

    i = 0
    # First non-empty line before the `size:`/`filter:` header is the page image.
    while i < len(lines):
        line = lines[i]
        if line.strip():
            page_image = line.strip()
            i += 1
            break
        i += 1

    current: str | None = None
    while i < len(lines):
        raw = lines[i]
        i += 1
        if not raw.strip():
            current = None
            continue
        # Page-level headers we don't care about here.
        if ":" in raw and not raw.startswith((" ", "\t")) and raw.split(":", 1)[0] in {
            "size",
            "filter",
            "format",
            "repeat",
            "pma",
            "scale",
        }:
            continue
        if ":" not in raw:
            current = raw.strip()
            regions[current] = {}
            continue
        if current is None:
            continue
        key, value = raw.strip().split(":", 1)
        parts = [p.strip() for p in value.split(",")]
        if key in {"bounds", "offsets", "xy", "size", "offset"}:
            regions[current][key] = [int(float(p)) for p in parts]
        elif key == "rotate":
            regions[current][key] = value.strip()
    return page_image, regions


def region_box(fields: dict) -> tuple[int, int, int, int]:
    if "bounds" in fields:
        x, y, w, h = fields["bounds"]
    else:
        x, y = fields["xy"]
        w, h = fields["size"]
    return x, y, w, h


def extract() -> None:
    page_image, regions = parse_atlas(ATLAS_FILE)
    atlas_img = Image.open(ATLAS_DIR / page_image).convert("RGBA")
    SPRITE_DIR.mkdir(parents=True, exist_ok=True)

    for region_name, sprite_name in REGION_TO_SPRITE.items():
        if region_name not in regions:
            raise KeyError(f"Region {region_name!r} missing from {ATLAS_FILE.name}")
        fields = regions[region_name]
        rotate = fields.get("rotate")
        if rotate not in (None, "false"):
            raise NotImplementedError(
                f"Region {region_name!r} is rotated ({rotate}); packer must disable rotation"
            )

        x, y, w, h = region_box(fields)
        crop = atlas_img.crop((x, y, x + w, y + h))

        if "offsets" in fields:
            # offsets: offsetX, offsetY, originalWidth, originalHeight
            # (offsetX/offsetY measured from the original image's bottom-left).
            off_x, off_y, orig_w, orig_h = fields["offsets"]
            canvas = Image.new("RGBA", (orig_w, orig_h), (0, 0, 0, 0))
            paste_top = orig_h - off_y - h
            canvas.paste(crop, (off_x, paste_top))
            sprite = canvas
        else:
            sprite = crop

        out_path = SPRITE_DIR / f"{sprite_name}.webp"
        sprite.save(out_path, "WEBP", lossless=True, method=6)
        print(f"  wrote {out_path.relative_to(APP_ROOT)} ({sprite.width}x{sprite.height})")

    print("done.")


if __name__ == "__main__":
    extract()
