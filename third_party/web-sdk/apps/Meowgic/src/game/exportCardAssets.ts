/**
 * Designer handoff: `designer_assets/export` — export card (back / front + `rotate` flip).
 * Copied to `static/assets/spines/exportCard`. The DEV export-cards screen paints the
 * atlas regions as HTML so three cards cost no extra WebGL context.
 */

const SPINE_BASE = `${import.meta.env.BASE_URL}assets/spines/exportCard`;

export const EXPORT_CARD_SPINE = {
	atlas: `${SPINE_BASE}/Card.atlas`,
	skeleton: `${SPINE_BASE}/Card.json`,
	page: `${SPINE_BASE}/Card.webp`,
} as const;

/** `Card.atlas` page size. */
const PAGE = { width: 2048, height: 2048 } as const;

/** Untrimmed attachment size (`Card.json` skins / atlas `offsets`). */
export const EXPORT_CARD_SIZE = { width: 553, height: 853 } as const;

type AtlasRegion = {
	x: number;
	y: number;
	width: number;
	height: number;
	offsetX: number;
	offsetY: number;
};

/** `Card.atlas` bounds + offsets (y measured from the top of the page). */
const REGIONS = {
	back: { x: 2, y: 255, width: 551, height: 851, offsetX: 1, offsetY: 1 },
	front: { x: 555, y: 255, width: 551, height: 851, offsetX: 1, offsetY: 1 },
} as const satisfies Record<string, AtlasRegion>;

export type ExportCardFace = keyof typeof REGIONS;

const pct = (value: number) => `${(value * 100).toFixed(4)}%`;

/** CSS vars that crop one atlas region into a box with the card's aspect ratio. */
export const exportCardFaceStyle = (face: ExportCardFace) => {
	const r = REGIONS[face];
	return [
		`--face-left:${pct(r.offsetX / EXPORT_CARD_SIZE.width)}`,
		`--face-top:${pct(r.offsetY / EXPORT_CARD_SIZE.height)}`,
		`--face-width:${pct(r.width / EXPORT_CARD_SIZE.width)}`,
		`--face-height:${pct(r.height / EXPORT_CARD_SIZE.height)}`,
		`--face-bg-size:${pct(PAGE.width / r.width)} ${pct(PAGE.height / r.height)}`,
		`--face-bg-pos:${pct(r.x / (PAGE.width - r.width))} ${pct(r.y / (PAGE.height - r.height))}`,
	].join(';');
};

/**
 * `Card.json` → `rotate`: `card_flip` scaleX 1 → 0 → 1 over 0.333 s; the back
 * attachment clears at the midpoint. Both halves use the same Spine bezier,
 * normalised to CSS below.
 */
export const EXPORT_CARD_FLIP_HALF_MS = 167;
export const EXPORT_CARD_FLIP_EASING = 'cubic-bezier(0.333, 0, 0.667, 1)';
