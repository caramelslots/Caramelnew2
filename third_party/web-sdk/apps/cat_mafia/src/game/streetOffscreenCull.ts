/**
 * Portrait phones cover-fit a ~¼-width slice of the street spine.
 * Canvas already clips pixels; this list skips drawing overlays whose
 * setup-pose AABB sits fully outside that slice.
 *
 * Worst-case visible half-width ≈ 401 world units (`mobile` + portrait
 * aspect 0.8). Anything closer, or with a large glow/plate mesh, stays on:
 * street plate, sky, car, clouds, ropes, near clothes, `glow_bottom`,
 * `glow_lamp*`, `plant_*` at x≈444.
 *
 * Landscape / tablet / desktop: do not cull — sides are in frame.
 */
export const STREET_OFFSCREEN_SLOT_NAMES = [
	// Far left decorations
	'plant_1',
	'plant_day_1',
	'plant_2',
	'plant_day_2',
	'awning',
	'awning_day',
	'window_2',
	'window_3',
	'window_4',
	'window_5',
	'glow_window_10',
	'glow_window_11',
	'glow_window_12',
	'glow_window_13',
	'headlights_glow',
	'headlights_glow2',
	'headlights_glow3',
	'clothes_01',
	'clothes_n_01',
	'clothes_03',
	'clothes_n_03',
	'clothes_04',
	'clothes_n_04',
	'moon',
	'moon_glow',
	// Far right decorations
	'window_8',
	'plant_3',
	'plant_day_5',
	'plant_day_7',
	'singboard',
	'singboard3',
	'signboard_day',
	'signboard_day2',
	'lamp',
	'lamp_day',
	'lamp_day2',
	'shadow_lamp_day',
	'shadow_lamp_night',
	'glass_day_reflections3',
	'glow2',
	'glow3',
	'dot5',
	'dot6',
	'bulb',
	'bulb_glow',
	'lighting',
	'way',
	'way2',
	'way3',
	'way4',
] as const;

export const isStreetOffscreenCullActive = (
	layoutType: string,
	canvasSizeType: string,
) =>
	layoutType === 'portrait' &&
	(canvasSizeType === 'mobile' || canvasSizeType === 'smallMobile');
