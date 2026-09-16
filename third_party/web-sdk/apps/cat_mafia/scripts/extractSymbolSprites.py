#!/usr/bin/env python3
"""
Extract per-symbol static WebP sprites from each symbol's Spine atlas.

Source:  assets/spines/symbols/{H1,H2,…}/  (atlas + page image)
Output:  assets/sprites/symbols/{Name}.webp
         static/assets/sprites/symbols/{Name}.webp  (dev-server copy)

Spine packs some regions with `rotate:90` (90° CCW in the atlas). Those must
be restored with a 90° CW transpose before fitting, otherwise letters like J/K
land sideways / look cropped (see previous L4.webp).

Glyphs are alpha-trimmed and letterboxed into SYMBOL_TEXTURE_NATIVE_PX (196²)
on a transparent canvas so reel spin sprites don't show black boxes.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
SPINE_ROOT = APP_ROOT / "assets/spines/symbols"
SPRITE_DIRS = (
	APP_ROOT / "assets/sprites/symbols",
	APP_ROOT / "static/assets/sprites/symbols",
)
# cat_mafia → apps → web-sdk → third_party → repo root
DESIGNER_ROOT = APP_ROOT.parents[3] / "designer_assets"

SYMBOL_SIZE = 196
# Tiny inset so Lanczos resize doesn't clip bevel/shadow into the frame edge.
FIT_PADDING = 0.02

# Atlas region name for the resting glyph inside each per-symbol skeleton.
# Bonus (B) is a composed still — do NOT extract `frame_000` (empty gold frame only).
ATLAS_REGION_BY_SYMBOL: dict[str, str] = {
	"H1": "diamond",
	"L1": "A",
	"L2": "K",
	"L3": "Q",
	"L4": "J",
}

# Spin-sprite filename when it differs from the spine folder key.
SPRITE_NAME_BY_SYMBOL: dict[str, str] = {}

# Full composed stills when the atlas has no single idle glyph (H2 = crossed
# revolvers). H1 designer still includes the sparkle star that sits on a
# separate spine attachment.
DESIGNER_STILL_BY_SYMBOL: dict[str, Path] = {
	"H1": DESIGNER_ROOT / "H1" / "H1_static.webp",
	"H2": DESIGNER_ROOT / "H2" / "H2_static.webp",
}


def parse_atlas(atlas_path: Path) -> tuple[str, dict[str, dict]]:
	"""Parse Spine 4.x compact atlas → (page image name, region fields)."""
	lines = atlas_path.read_text(encoding="utf-8").splitlines()
	page_image = ""
	regions: dict[str, dict] = {}

	i = 0
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


def unrotate_atlas_region(crop: Image.Image, rotate: str | None) -> Image.Image:
	"""Undo Spine atlas packing rotation.

	`rotate:90` / `true` means the region was stored rotated 90° counter-clockwise.
	Restore with 90° clockwise (PIL ROTATE_270).
	"""
	if rotate in (None, "false", "0"):
		return crop
	angle = 90 if rotate == "true" else int(rotate)
	if angle == 90:
		return crop.transpose(Image.ROTATE_270)
	if angle == 180:
		return crop.transpose(Image.ROTATE_180)
	if angle == 270:
		return crop.transpose(Image.ROTATE_90)
	raise ValueError(f"unsupported atlas rotate value: {rotate!r}")


def extract_region(atlas_img: Image.Image, fields: dict) -> Image.Image:
	if "bounds" in fields:
		x, y, w, h = fields["bounds"]
	else:
		x, y = fields["xy"]
		w, h = fields["size"]
	crop = atlas_img.crop((x, y, x + w, y + h))
	return unrotate_atlas_region(crop, fields.get("rotate"))


def fit_square(
	im: Image.Image,
	size: int = SYMBOL_SIZE,
	padding: float = FIT_PADDING,
	bg: tuple[int, int, int, int] = (0, 0, 0, 0),
) -> Image.Image:
	"""Alpha-trim and center into a transparent square canvas."""
	im = im.convert("RGBA")
	bbox = im.getbbox()
	if not bbox:
		return Image.new("RGBA", (size, size), bg)
	cropped = im.crop(bbox)
	cw, ch = cropped.size
	inner = size * (1.0 - 2.0 * padding)
	scale = min(inner / cw, inner / ch)
	nw = max(1, int(round(cw * scale)))
	nh = max(1, int(round(ch * scale)))
	resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
	canvas = Image.new("RGBA", (size, size), bg)
	canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
	return canvas


def clear_letterbox_black(
	im: Image.Image,
	thresh: int = 12,
) -> Image.Image:
	"""Flood-fill near-black from edges → transparent (for composed H3/H4 stills)."""
	from collections import deque

	im = im.convert("RGBA").copy()
	px = im.load()
	w, h = im.size

	def is_bg(x: int, y: int) -> bool:
		r, g, b, a = px[x, y]
		return a > 0 and r <= thresh and g <= thresh and b <= thresh

	queue: deque[tuple[int, int]] = deque()
	seen: set[tuple[int, int]] = set()
	for x in range(w):
		for y in (0, h - 1):
			if is_bg(x, y):
				queue.append((x, y))
				seen.add((x, y))
	for y in range(h):
		for x in (0, w - 1):
			if (x, y) not in seen and is_bg(x, y):
				queue.append((x, y))
				seen.add((x, y))

	while queue:
		x, y = queue.popleft()
		px[x, y] = (0, 0, 0, 0)
		for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
			if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and is_bg(nx, ny):
				seen.add((nx, ny))
				queue.append((nx, ny))
	return im


def save_sprite(sprite: Image.Image, name: str) -> None:
	out_name = SPRITE_NAME_BY_SYMBOL.get(name, name)
	for sprite_dir in SPRITE_DIRS:
		sprite_dir.mkdir(parents=True, exist_ok=True)
		out_path = sprite_dir / f"{out_name}.webp"
		sprite.save(out_path, "WEBP", lossless=True, method=6)
		print(f"  wrote {out_path.relative_to(APP_ROOT)} ({sprite.width}x{sprite.height})")


def extract_from_atlas(symbol: str, region_name: str) -> Image.Image:
	atlas_path = SPINE_ROOT / symbol / f"{symbol}.atlas"
	page_image, regions = parse_atlas(atlas_path)
	if region_name not in regions:
		raise KeyError(f"{symbol}: region {region_name!r} missing from {atlas_path.name}")
	fields = regions[region_name]
	atlas_img = Image.open(SPINE_ROOT / symbol / page_image).convert("RGBA")
	glyph = extract_region(atlas_img, fields)
	rotate = fields.get("rotate")
	print(f"  {symbol}: region={region_name!r} rotate={rotate!r} glyph={glyph.size}")
	return fit_square(glyph)


def extract_from_designer(symbol: str, still_path: Path) -> Image.Image:
	if not still_path.is_file():
		raise FileNotFoundError(still_path)
	print(f"  {symbol}: designer still {still_path}")
	return fit_square(Image.open(still_path).convert("RGBA"))


def extract() -> None:
	# Designer stills win when present (composed idle), else atlas glyph.
	done: set[str] = set()
	for symbol, still in DESIGNER_STILL_BY_SYMBOL.items():
		save_sprite(extract_from_designer(symbol, still), symbol)
		done.add(symbol)

	for symbol, region in ATLAS_REGION_BY_SYMBOL.items():
		if symbol in done:
			continue
		save_sprite(extract_from_atlas(symbol, region), symbol)

	# H3/H4 are composed stills (atlas only has mesh parts) — strip baked black letterbox.
	for symbol in ("H3", "H4"):
		src = SPRITE_DIRS[0] / f"{symbol}.webp"
		if not src.is_file():
			print(f"  skip {symbol}: missing {src}")
			continue
		cleared = clear_letterbox_black(Image.open(src))
		save_sprite(cleared, symbol)
		print(f"  {symbol}: cleared opaque letterbox")

	print("done.")


if __name__ == "__main__":
	extract()
