/**
 * Test SSAA for oversized designer Spine symbols (diamond / lighter /
 * telephone / letters). Spine is baked each frame into a 2× RenderTexture,
 * then shown as a linearly filtered sprite at 1× — same idea as mascot CSS SSAA.
 *
 * Set `SYMBOL_SPINE_SSAA` to `1` to disable and use the normal SpineProvider path.
 */
export const SYMBOL_SPINE_SSAA = 2;

/** Extra RT padding around the fit box so glow / stop motion isn't clipped. */
export const SYMBOL_SPINE_SSAA_PAD_FRAC = 0.5;

export const SYMBOL_SPINE_SSAA_ASSET_KEYS = new Set([
	'H1',
	'H3',
	'H4',
	'L1',
	'L2',
	'L3',
	'L4',
	'BT',
]);

export const usesSymbolSpineSsaa = (assetKey: string) =>
	SYMBOL_SPINE_SSAA > 1 && SYMBOL_SPINE_SSAA_ASSET_KEYS.has(assetKey);
