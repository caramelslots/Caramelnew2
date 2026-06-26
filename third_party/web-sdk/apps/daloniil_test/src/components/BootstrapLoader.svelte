<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { SpinePlayer } from '@esotericsoftware/spine-player';
	import { waitForTimeout } from 'utils-shared/wait';

	import { LOADER_NEXT_SCREEN_BG_URL } from '../game/earlyLoaderPreload';

	type Props = {
		oncomplete?: () => void;
	};

	const props: Props = $props();

	const SPLASH_DURATION_MS = 2300;

	/** Frame only the logo circle; ignore off-screen title text in auto-bounds. */
	const LOGO_VIEWPORT = {
		x: -500,
		y: -500,
		width: 1000,
		height: 1000,
		padLeft: '18%',
		padRight: '18%',
		padTop: '18%',
		padBottom: '18%',
	};

	/** static/ asset path relative to deployed index.html (Stake CDN subpath-safe). */
	const resolveStaticUrl = (path: string) =>
		new URL(path.replace(/^\//, ''), window.location.href).href;

	let loading = $state(true);
	let playerContainer = $state<HTMLDivElement>();
	const bgUrl = LOADER_NEXT_SCREEN_BG_URL;
	let player: SpinePlayer | undefined;

	onMount(() => {
		if (!playerContainer) return;

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
			viewport: {
				animations: {
					appear: LOGO_VIEWPORT,
					static: LOGO_VIEWPORT,
				},
			},
			success: (spinePlayer) => {
				// Flip inside WebGL so viewport math matches pixels (CSS scaleY clips the canvas).
				spinePlayer.skeleton!.scaleY = -1;
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
		<div class="bg" style:background-image="url('{bgUrl}')" aria-hidden="true"></div>
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
		width: min(640px, 90vw);
		height: 100vh;
		overflow: visible;
	}

	.player :global(.spine-player) {
		position: relative;
		width: 100%;
		height: 100%;
		background: none;
	}

	.player :global(.spine-player-canvas) {
		display: block;
		width: 100%;
		height: 100%;
		background: transparent !important;
		border-radius: 0 !important;
	}

	.player :global(.spine-player-controls),
	.player :global(.spine-player-error) {
		display: none;
	}
</style>
