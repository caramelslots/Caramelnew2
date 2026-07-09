/*
	Dev-only preview toggles. Shared between DevButtons.svelte (controls) and
	the components they preview (e.g. ProgressLadder.svelte). Not used in prod.
*/
export const devPreview = $state({
	/** slow reel scroll to 0.5× (DevButtons toggle) */
	slowReelScroll: false,
	/** force the Free Spins bonus bar (ProgressLadder) to be visible */
	ladder: false,
	/** how many bonus cats are shown as collected (0..4) */
	ladderFilled: 2,
	/** preview the horizontal bar (bar_h) instead of the vertical one */
	ladderHorizontal: false,
});
