<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { SpinePlayer } from '@esotericsoftware/spine-player';
	import '@esotericsoftware/spine-player/dist/spine-player.css';
	import { waitForTimeout } from 'utils-shared/wait';

	type Props = {
		oncomplete?: () => void;
	};

	const props: Props = $props();

	const SPLASH_DURATION_MS = 2300;

	let loading = $state(true);
	let playerContainer = $state<HTMLDivElement>();
	let player: SpinePlayer | undefined;

	onMount(() => {
		if (!playerContainer) return;

		player = new SpinePlayer(playerContainer, {
			jsonUrl: '/logo-loader/skeleton.json',
			atlasUrl: '/logo-loader/skeleton.atlas',
			animation: 'appear',
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			alpha: true,
			success: (spinePlayer) => {
				spinePlayer.setAnimation('appear', false);
				spinePlayer.addAnimation('static', true, 0);
			},
		});

		void (async () => {
			await waitForTimeout(SPLASH_DURATION_MS);
			loading = false;
			props.oncomplete?.();
		})();

		return () => {
			player?.dispose();
		};
	});
</script>

{#if loading}
	<div class="wrap" transition:fade>
		<div class="bg" aria-hidden="true"></div>
		<div class="player" bind:this={playerContainer}></div>
	</div>
{/if}

<style lang="scss">
	.wrap {
		position: absolute;
		inset: 0;
		z-index: 999;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #000;
		overflow: hidden;
	}

	.bg {
		position: absolute;
		inset: 0;
		background: #000 url('/assets/sprites/background/day.png') center / cover no-repeat;
	}

	.player {
		position: relative;
		z-index: 1;
		width: min(640px, 90vw);
		height: min(640px, 60vh);
		transform: scaleY(-1);
	}

	.player :global(.spine-player),
	.player :global(.spine-player-canvas) {
		background: transparent !important;
	}

	.player :global(.spine-player-controls) {
		display: none;
	}
</style>
