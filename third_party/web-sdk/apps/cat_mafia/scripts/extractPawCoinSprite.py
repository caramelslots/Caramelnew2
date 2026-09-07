#!/usr/bin/env python3
"""Bake PawCoin.webp from coins spine pose (main_coin_slow @ 0, board paw skin)."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
COINS = APP_ROOT / "static/assets/spines/symbols/coins"
POSE_JSON = SCRIPT_DIR / ".paw-coin-pose.json"
OUT_DIRS = (
	APP_ROOT / "static/assets/sprites/symbols",
	APP_ROOT / "assets/sprites/symbols",
)
SYMBOL_SIZE = 196
FIT_PADDING = 0.08
RENDER_PAD = 24


def export_pose() -> dict:
	subprocess.run(
		["node", str(SCRIPT_DIR / "exportPawCoinPose.mjs")],
		cwd=APP_ROOT,
		check=True,
	)
	return json.loads(POSE_JSON.read_text(encoding="utf-8"))


def rasterize_triangle(
	canvas: np.ndarray,
	atlas: np.ndarray,
	dst: np.ndarray,
	src: np.ndarray,
	color: tuple[float, float, float, float],
) -> None:
	"""Affine-map atlas texels into canvas RGBA for one triangle."""
	min_x = int(np.floor(dst[:, 0].min()))
	max_x = int(np.ceil(dst[:, 0].max()))
	min_y = int(np.floor(dst[:, 1].min()))
	max_y = int(np.ceil(dst[:, 1].max()))
	if max_x < 0 or max_y < 0 or min_x >= canvas.shape[1] or min_y >= canvas.shape[0]:
		return

	min_x = max(min_x, 0)
	min_y = max(min_y, 0)
	max_x = min(max_x, canvas.shape[1] - 1)
	max_y = min(max_y, canvas.shape[0] - 1)

	p0, p1, p2 = dst.astype(np.float64)
	s0, s1, s2 = src.astype(np.float64)
	den = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
	if abs(den) < 1e-6:
		return

	cr, cg, cb, ca = color
	h, w = atlas.shape[:2]

	for y in range(min_y, max_y + 1):
		for x in range(min_x, max_x + 1):
			p = np.array([x + 0.5, y + 0.5])
			w0 = ((p1[1] - p2[1]) * (p[0] - p2[0]) + (p2[0] - p1[0]) * (p[1] - p2[1])) / den
			w1 = ((p2[1] - p0[1]) * (p[0] - p2[0]) + (p0[0] - p2[0]) * (p[1] - p2[1])) / den
			w2 = 1.0 - w0 - w1
			if w0 < 0 or w1 < 0 or w2 < 0:
				continue
			s = s0 * w0 + s1 * w1 + s2 * w2
			sx = int(s[0])
			sy = int(s[1])
			if sx < 0 or sy < 0 or sx >= w or sy >= h:
				continue
			src_px = atlas[sy, sx].astype(np.float32)
			out_a = src_px[3] * ca
			if out_a < 1:
				continue
			dst_px = canvas[y, x].astype(np.float32)
			out_rgb = src_px[:3] * np.array([cr, cg, cb], dtype=np.float32)
			alpha = out_a / 255.0
			inv = 1.0 - alpha
			canvas[y, x, :3] = out_rgb * alpha + dst_px[:3] * inv
			canvas[y, x, 3] = min(255.0, out_a + dst_px[3] * inv)


def render_pose(pose: dict) -> Image.Image:
	atlas_img = Image.open(COINS / pose["atlasPage"]).convert("RGBA")
	atlas = np.array(atlas_img, dtype=np.float32)
	aw, ah = pose["atlasSize"]

	b = pose["bounds"]
	left = b["x"] - RENDER_PAD
	top = b["y"] - RENDER_PAD
	width = b["width"] + RENDER_PAD * 2
	height = b["height"] + RENDER_PAD * 2

	canvas = np.zeros((int(np.ceil(height)), int(np.ceil(width)), 4), dtype=np.float32)
	canvas_h = canvas.shape[0]

	for layer in pose["layers"]:
		verts = np.array(layer["vertices"], dtype=np.float64).reshape(-1, 2)
		uvs = np.array(layer["uvs"], dtype=np.float64).reshape(-1, 2)
		tris = layer["triangles"]
		color = tuple(layer["color"])

		dst = verts.copy()
		dst[:, 0] -= left
		dst[:, 1] -= top
		# Spine Y+ is up; image rows grow down (match Pixi board, not HTML scaleY=-1).
		dst[:, 1] = canvas_h - 1 - dst[:, 1]
		src = uvs.copy()
		src[:, 0] *= aw
		src[:, 1] *= ah

		for i in range(0, len(tris), 3):
			idx = tris[i], tris[i + 1], tris[i + 2]
			rasterize_triangle(
				canvas,
				atlas,
				dst[list(idx)],
				src[list(idx)],
				color,
			)

	img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), "RGBA")
	return fit_square(img)


def fit_square(im: Image.Image, size: int = SYMBOL_SIZE) -> Image.Image:
	im = im.convert("RGBA")
	cw, ch = im.size
	inner = size * (1.0 - 2.0 * FIT_PADDING)
	scale = min(inner / cw, inner / ch)
	nw = max(1, int(round(cw * scale)))
	nh = max(1, int(round(ch * scale)))
	resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
	canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
	canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
	return canvas


def main() -> None:
	pose = export_pose()
	sprite = render_pose(pose).rotate(180, resample=Image.Resampling.LANCZOS)
	for out_dir in OUT_DIRS:
		out_dir.mkdir(parents=True, exist_ok=True)
		out = out_dir / "PawCoin.webp"
		sprite.save(out, "WEBP", lossless=True, method=6)
		print(f"wrote {out.relative_to(APP_ROOT)} ({sprite.width}x{sprite.height})")


if __name__ == "__main__":
	main()
