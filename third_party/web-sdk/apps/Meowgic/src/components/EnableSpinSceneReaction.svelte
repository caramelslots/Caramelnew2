<script lang="ts">
	/**
	 * Spin → scene reaction: after a short delay, bump `spinSceneReaction.token`.
	 * Board + background play one-shot reactions and mix back to idle themselves.
	 */
	import { onDestroy } from 'svelte';
	import { stateBetDerived } from 'state-shared';

	import { SPIN_SCENE_REACTION_DELAY_MS } from '../game/constants';
	import { getContext } from '../game/context';
	import { devPreview } from '../game/devPreview.svelte';
	import { spinSceneReaction } from '../game/spinSceneReaction.svelte';

	const context = getContext();

	let delayTimer: ReturnType<typeof setTimeout> | null = null;

	const clearDelay = () => {
		if (delayTimer === null) return;
		clearTimeout(delayTimer);
		delayTimer = null;
	};

	onDestroy(clearDelay);

	context.eventEmitter.subscribeOnMount({
		bet: () => {
			if (devPreview.boardAnim || devPreview.bgAnim) return;
			if (devPreview.forceShowDemoStageArt) return;
			clearDelay();
			const delayMs = SPIN_SCENE_REACTION_DELAY_MS / stateBetDerived.timeScale();
			delayTimer = setTimeout(() => {
				delayTimer = null;
				spinSceneReaction.token += 1;
			}, delayMs);
		},
	});
</script>
