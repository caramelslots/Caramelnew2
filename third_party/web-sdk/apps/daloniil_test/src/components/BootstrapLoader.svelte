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

	/** static/ asset path relative to deployed index.html (Stake CDN subpath-safe). */
	const resolveStaticUrl = (path: string) =>
		new URL(path.replace(/^\//, ''), window.location.href).href;

	let loading = $state(true);
	let playerContainer = $state<HTMLDivElement>();
	let bgUrl = $state('');
	let player: SpinePlayer | undefined;

	onMount(() => {
		if (!playerContainer) return;

		bgUrl = resolveStaticUrl('assets/sprites/background/day.png');

		player = new SpinePlayer(playerContainer, {
			jsonUrl: resolveStaticUrl('logo-loader/skeleton.json'),
			atlasUrl: resolveStaticUrl('logo-loader/skeleton.atlas'),
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
			error: () => {
				/* Fail silently — splash still dismisses after timeout. */
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
		<div class="bg" style:background-image={bgUrl ? `url('${bgUrl}')` : undefined} aria-hidden="true"></div>
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
		background-color: #000;
		background-position: center;
		background-size: cover;
		background-repeat: no-repeat;
	}

	.player {
		position: relative;
		z-index: 1;
		--player-size: min(640px, 90vw, 60vh);
		width: var(--player-size);
		height: var(--player-size);
		transform: scaleY(-1);
	}

	.player :global(.spine-player),
	.player :global(.spine-player-canvas) {
		background: transparent !important;
	}

	.player :global(.spine-player-controls),
	.player :global(.spine-player-error) {
		display: none;
	}
</style>
