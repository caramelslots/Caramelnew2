<script lang="ts">
	import { onMount } from 'svelte';
	import '@esotericsoftware/spine-player/dist/spine-player.css';
	import { SpinePlayer } from '@esotericsoftware/spine-player';

	import {
		SPIN_BUTTON_SPINE_VIEWPORT,
		resolveSpinButtonSpineUrl,
	} from '../game/spinButtonHtmlSpine';

	let container = $state<HTMLDivElement>();
	let ready = $state(false);
	let player: SpinePlayer | undefined;

	export function playPress() {
		if (!player || !ready) return;
		player.setAnimation('animation', false);
	}

	onMount(() => {
		if (!container) return;

		player = new SpinePlayer(container, {
			jsonUrl: resolveSpinButtonSpineUrl('spin_button.json'),
			atlasUrl: resolveSpinButtonSpineUrl('spin_button.atlas'),
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: false,
			preserveDrawingBuffer: false,
			alpha: true,
			viewport: {
				...SPIN_BUTTON_SPINE_VIEWPORT,
				animations: {
					animation: SPIN_BUTTON_SPINE_VIEWPORT,
				},
			},
			success: (spinePlayer) => {
				spinePlayer.skeleton!.scaleY = -1;
				spinePlayer.animationState?.setEmptyAnimation(0, 0);
				spinePlayer.animationState?.addListener({
					complete: (entry) => {
						if (entry.animation?.name === 'animation') {
							spinePlayer.animationState?.setEmptyAnimation(0, 0);
						}
					},
				});
				ready = true;
			},
		});

		return () => {
			player?.dispose();
			player = undefined;
		};
	});
</script>

<div class="spin-button-spine" class:ready bind:this={container}></div>

<style lang="scss">
	.spin-button-spine {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: hidden;
		opacity: 0;

		&.ready {
			opacity: 1;
		}
	}

	.spin-button-spine :global(.spine-player) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: none !important;
	}

	.spin-button-spine :global(.spine-player-canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
		background: transparent !important;
		border-radius: 0 !important;
	}

	.spin-button-spine :global(.spine-player-controls),
	.spin-button-spine :global(.spine-player-error),
	.spin-button-spine :global(.spine-player-loading) {
		display: none !important;
	}
</style>
