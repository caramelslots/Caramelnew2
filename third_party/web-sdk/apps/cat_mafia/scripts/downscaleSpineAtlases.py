#!/usr/bin/env python3
"""
Downscale Spine texture atlases without breaking animations.

Spine keeps motion in `.json` (bones / timelines). On-screen size comes from
atlas region pixels + the atlas `scale:` field:

    worldSize ≈ regionPixels / atlasScale

So if we shrink the texture by F and multiply `scale:` by F, world size stays
the same. Attachment names and skeleton JSON are left untouched.

Usage (from app root or any cwd):

  # Preview only
  python3 scripts/downscaleSpineAtlases.py --dry-run

  # Halve every symbols atlas
  python3 scripts/downscaleSpineAtlases.py --write --factor 0.5

  # Cap longest side at 1024 (skips atlases already smaller)
  python3 scripts/downscaleSpineAtlases.py --write --max-side 1024

  # Custom folder
  python3 scripts/downscaleSpineAtlases.py --write --max-side 1024 \\
      --root static/assets/spines/symbols
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

APP_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ROOT = APP_ROOT / "static" / "assets" / "spines" / "symbols"

# Page / region keys whose comma-separated ints are texture-space pixels.
PIXEL_KEYS = frozenset({"size", "bounds", "offsets", "xy", "split", "pad"})
# Multiplied (not coordinate-scaled) when present on a page header.
SCALE_KEY = "scale"

# Page line is just the image filename (e.g. `B.webp`, `H1.webp`).
PAGE_HEADER_RE = re.compile(r"^([^:\s/]+\.(?:webp|png|jpg|jpeg))\s*$", re.I)
KV_RE = re.compile(r"^([a-zA-Z]+):(.+)$")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument(
        "--root",
        type=Path,
        default=DEFAULT_ROOT,
        help=f"Folder to scan recursively for *.atlas (default: {DEFAULT_ROOT})",
    )
    g = p.add_mutually_exclusive_group()
    g.add_argument("--factor", type=float, help="Uniform scale factor, e.g. 0.5")
    g.add_argument(
        "--max-side",
        type=int,
        help="Scale so max(width,height) <= N (no-op if already smaller)",
    )
    p.add_argument(
        "--min-side",
        type=int,
        default=64,
        help="Refuse to shrink if resulting max side would be < N (default: 64)",
    )
    p.add_argument("--quality", type=int, default=90, help="WebP quality 0-100 (default: 90)")
    p.add_argument(
        "--backup",
        action="store_true",
        help="Copy each .atlas/.webp to *.bak before overwriting",
    )
    p.add_argument("--dry-run", action="store_true", help="Print plan only (default if --write omitted)")
    p.add_argument("--write", action="store_true", help="Actually rewrite files")
    return p.parse_args()


def factor_for_size(width: int, height: int, args: argparse.Namespace) -> float | None:
    if args.factor is not None:
        if args.factor <= 0 or args.factor >= 1:
            raise SystemExit("--factor must be in (0, 1)")
        return float(args.factor)

    if args.max_side is not None:
        longest = max(width, height)
        if longest <= args.max_side:
            return None
        return args.max_side / longest

    raise SystemExit("Pass --factor or --max-side")


def scale_int_list(raw: str, sx: float, sy: float, pairwise_xy: bool) -> str:
    """Scale comma-separated numbers. For xy-pairs use (sx,sy,sx,sy,...)."""
    parts = [p.strip() for p in raw.split(",")]
    out: list[str] = []
    for i, part in enumerate(parts):
        if not part:
            continue
        try:
            value = float(part)
        except ValueError:
            out.append(part)
            continue
        axis = sx if (not pairwise_xy or i % 2 == 0) else sy
        scaled = value * axis
        # Spine atlases use ints for pixel fields; keep ints when input looked integral.
        if "." not in part and "e" not in part.lower():
            out.append(str(int(round(scaled))))
        else:
            # Keep modest precision for rare float scales in other keys.
            out.append(f"{scaled:.6g}")
    return ",".join(out)


# Keys that belong to the page header (before the first region name).
PAGE_SETTING_KEYS = frozenset({"size", "format", "filter", "repeat", "pma", "scale"})


def transform_atlas_text(text: str, page_factors: dict[str, tuple[float, float, float]]) -> str:
    """
    page_factors[pageFile] = (sx, sy, scale_mul)
    sx/sy scale pixel coords; scale_mul multiplies page `scale:` (defaults to 1).
    """
    lines = text.splitlines()
    out: list[str] = []
    current_page: str | None = None
    sx = sy = scale_mul = 1.0
    saw_scale = False
    in_page_settings = False

    def ensure_scale_before_regions() -> None:
        """If packer omitted scale (implied 1), inject it at end of page settings."""
        nonlocal saw_scale, in_page_settings
        if not in_page_settings or saw_scale or scale_mul == 1.0:
            in_page_settings = False
            return
        out.append(f"scale:{scale_mul:.6g}")
        saw_scale = True
        in_page_settings = False

    for line in lines:
        page_match = PAGE_HEADER_RE.match(line)
        if page_match and page_match.group(1) in page_factors:
            ensure_scale_before_regions()
            current_page = page_match.group(1)
            sx, sy, scale_mul = page_factors[current_page]
            saw_scale = False
            in_page_settings = True
            out.append(line)
            continue

        if current_page is None:
            out.append(line)
            continue

        kv = KV_RE.match(line)
        if in_page_settings:
            if kv and kv.group(1).lower() in PAGE_SETTING_KEYS:
                key, raw = kv.group(1), kv.group(2)
                key_l = key.lower()
                if key_l == SCALE_KEY:
                    try:
                        old = float(raw.strip())
                    except ValueError:
                        out.append(line)
                        continue
                    out.append(f"{key}:{(old * scale_mul):.6g}")
                    saw_scale = True
                    continue
                if key_l in PIXEL_KEYS:
                    out.append(f"{key}:{scale_int_list(raw, sx, sy, pairwise_xy=True)}")
                    continue
                out.append(line)
                continue
            # First region name (or blank then region) ends page settings.
            ensure_scale_before_regions()

        if kv:
            key, raw = kv.group(1), kv.group(2)
            key_l = key.lower()
            if key_l in PIXEL_KEYS:
                out.append(f"{key}:{scale_int_list(raw, sx, sy, pairwise_xy=True)}")
                continue
            out.append(line)
            continue

        out.append(line)

    ensure_scale_before_regions()
    result = "\n".join(out)
    if text.endswith("\n"):
        result += "\n"
    return result


def find_atlas_jobs(root: Path) -> list[Path]:
    if not root.is_dir():
        raise SystemExit(f"root not found: {root}")
    return sorted(root.rglob("*.atlas"))


def page_image_path(atlas_path: Path, page_name: str) -> Path:
    candidate = atlas_path.parent / page_name
    if candidate.is_file():
        return candidate
    # Rare: page name may be basename-only while file uses different casing.
    matches = list(atlas_path.parent.glob(page_name))
    if len(matches) == 1:
        return matches[0]
    raise FileNotFoundError(f"atlas page image missing: {candidate}")


def list_pages(atlas_text: str) -> list[str]:
    pages: list[str] = []
    for line in atlas_text.splitlines():
        m = PAGE_HEADER_RE.match(line)
        if m:
            pages.append(m.group(1))
    return pages


def process_atlas(atlas_path: Path, args: argparse.Namespace) -> bool:
    text = atlas_path.read_text(encoding="utf-8")
    pages = list_pages(text)
    if not pages:
        print(f"skip (no pages): {atlas_path}")
        return False

    page_factors: dict[str, tuple[float, float, float]] = {}
    plans: list[tuple[str, Path, int, int, int, int, float]] = []

    for page in pages:
        img_path = page_image_path(atlas_path, page)
        with Image.open(img_path) as im:
            w, h = im.size
        factor = factor_for_size(w, h, args)
        if factor is None:
            print(f"skip (already <= max-side): {img_path} ({w}x{h})")
            continue
        nw = max(1, int(round(w * factor)))
        nh = max(1, int(round(h * factor)))
        if max(nw, nh) < args.min_side:
            print(f"skip (would be < min-side {args.min_side}): {img_path} -> {nw}x{nh}")
            continue
        if (nw, nh) == (w, h):
            print(f"skip (no change): {img_path}")
            continue
        sx = nw / w
        sy = nh / h
        # Single atlas scale multiplier — use geometric mean so non-uniform
        # rounding still roughly preserves world size on both axes.
        scale_mul = (sx * sy) ** 0.5
        page_factors[page] = (sx, sy, scale_mul)
        plans.append((page, img_path, w, h, nw, nh, scale_mul))

    if not page_factors:
        return False

    new_atlas = transform_atlas_text(text, page_factors)
    rel = atlas_path.relative_to(args.root) if atlas_path.is_relative_to(args.root) else atlas_path
    print(f"\n{rel}")
    for page, img_path, w, h, nw, nh, scale_mul in plans:
        print(f"  {page}: {w}x{h} -> {nw}x{nh}  (scale *={scale_mul:.4f})")

    if not args.write:
        return True

    if args.backup:
        bak_atlas = atlas_path.with_suffix(atlas_path.suffix + ".bak")
        shutil.copy2(atlas_path, bak_atlas)
        for _, img_path, *_ in plans:
            shutil.copy2(img_path, img_path.with_suffix(img_path.suffix + ".bak"))

    for page, img_path, w, h, nw, nh, _ in plans:
        with Image.open(img_path) as im:
            im = im.convert("RGBA") if im.mode != "RGBA" else im
            resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
            tmp = img_path.with_suffix(img_path.suffix + ".tmp")
            ext = img_path.suffix.lower()
            # Keep PNG for mascot meshes (lossy WebP can break PMA edges).
            if ext in {".png"}:
                resized.save(tmp, "PNG", optimize=True, compress_level=9)
            else:
                resized.save(tmp, "WEBP", quality=args.quality, method=6)
            tmp.replace(img_path)

    atlas_path.write_text(new_atlas, encoding="utf-8")
    print("  wrote atlas + images")
    return True


def main() -> int:
    args = parse_args()
    if not args.write:
        args.dry_run = True
    if args.factor is None and args.max_side is None:
        print("error: pass --factor or --max-side", file=sys.stderr)
        return 2

    root = args.root if args.root.is_absolute() else (Path.cwd() / args.root).resolve()
    # Allow relative-to-app-root convenience.
    if not root.is_dir() and not args.root.is_absolute():
        alt = (APP_ROOT / args.root).resolve()
        if alt.is_dir():
            root = alt
    args.root = root

    atlases = find_atlas_jobs(root)
    if not atlases:
        print(f"no .atlas under {root}")
        return 1

    mode = "WRITE" if args.write else "DRY-RUN"
    print(f"[{mode}] scanning {root} ({len(atlases)} atlas files)")

    changed = 0
    for atlas in atlases:
        try:
            if process_atlas(atlas, args):
                changed += 1
        except Exception as exc:  # noqa: BLE001 — surface per-file and continue
            print(f"ERROR {atlas}: {exc}", file=sys.stderr)
            return 1

    print(f"\n{changed} atlas(es) {'would change' if not args.write else 'updated'}")
    if not args.write:
        print("Re-run with --write to apply.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
