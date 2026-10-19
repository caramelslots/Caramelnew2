/**
 * Portrait phones cover-fit a ~¼-width slice of the room background spine.
 * Canvas already clips pixels; this list skips drawing overlays whose
 * setup-pose AABB sits fully outside that slice.
 *
 * Worst-case visible half-width ≈ 395 world units (`mobile` + portrait
 * aspect 0.8). Anything closer, or with a large glow/plate mesh, stays on:
 * room plate, `light_glow`, `stage`, `glow5` / `glow8`, `glow4` at x≈−398.
 *
 * Landscape / tablet / desktop: do not cull — sides are in frame.
 */
export const STREET_OFFSCREEN_SLOT_NAMES = [
	// Left desk: crystal ball, candle, ink + pen
	'desk',
	'paper',
	'candle',
	'orange_candle_light',
	'yellow_candle_light',
	'blue_candle_light',
	'candle_light',
	'magic ball_glow',
	'magic ball_glow2',
	'magic ball_glow3',
	'stand',
	'bg_color',
	'background_lamp',
	'pink_contour',
	'galaxy_neon',
	'galaxy_neon2',
	'galaxy_neon3',
	'galaxy_neon4',
	'smoke_orbit',
	'smoke_orbit2',
	'smoke_orbit3',
	'smoke_orbit4',
	'glass',
	'glow6',
	'glow7',
	'glare_1',
	'glare_2',
	'contour_ball',
	'inkstand2',
	'pen2',
	// Hanging lanterns (both sides)
	'left_lamp3',
	'light_inside_l4',
	'flame_l3',
	'left_lamp4',
	'light_inside_l5',
	'flame_l4',
	'glow9',
] as const;

/** Hidden for the whole duel session — the room background has no duel-only props. */
export const DUEL_HIDDEN_BACKGROUND_SLOTS: readonly string[] = [];

export const isStreetOffscreenCullActive = (
	layoutType: string,
	canvasSizeType: string,
) =>
	layoutType === 'portrait' &&
	(canvasSizeType === 'mobile' || canvasSizeType === 'smallMobile');

/** Phone canvas tiers — used for perf gates (static BG, no symbol idle). */
export const isPhoneCanvasSizeType = (canvasSizeType: string) =>
	canvasSizeType === 'mobile' || canvasSizeType === 'smallMobile';
