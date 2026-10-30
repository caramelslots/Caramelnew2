/**
 * Shared Spin → board/background reaction trigger.
 * Bumps `token` after `SPIN_SCENE_REACTION_DELAY_MS`; listeners play a one-shot
 * reaction and mix back to idle (no looping for the rest of the spin).
 */
export const spinSceneReaction = $state({
	/** Bump to fire one desk + street reaction. */
	token: 0,
});
