/** designer_assets/spin — HTML SpinePlayer viewport (skeleton bounds). */
export const SPIN_BUTTON_SPINE_VIEWPORT = {
	x: -460.5,
	y: -462.5,
	width: 921,
	height: 925,
	padLeft: '0%',
	padRight: '0%',
	padTop: '0%',
	padBottom: '0%',
} as const;

/** static/ asset path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveSpinButtonSpineUrl = (file: string) =>
	new URL(`assets/spines/spinButton/${file}`.replace(/^\//, ''), window.location.href).href;
