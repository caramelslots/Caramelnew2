<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { SpinePlayer } from '@esotericsoftware/spine-player';
	import { waitForTimeout } from 'utils-shared/wait';

	import { stateApp } from '../game/stateApp';
	import { devPreview } from '../game/devPreview.svelte';

	type Props = {
		/** Advances the asset pipeline (e.g. setLoaderStage('cards')). */
		oncomplete?: () => void;
		/** Called after the splash UI has faded out (real load only). */
		ondismissed?: () => void;
		/** Dev remount: fake progress, ignore real asset pipeline. */
		preview?: boolean;
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
	let player: SpinePlayer | undefined;

	const progress = $derived(
		Math.max(
			0,
			Math.min(
				100,
				props.preview ? devPreview.loaderProgressValue : (stateApp.loadingProgress ?? 0),
			),
		),
	);

	const show = $derived(props.preview ? devPreview.loaderProgress : loading);

	onMount(() => {
		if (!playerContainer) return;

		player = new SpinePlayer(playerContainer, {
			jsonUrl: resolveStaticUrl('logo-loader/skeleton.json'),
			atlasUrl: resolveStaticUrl('logo-loader/skeleton.atlas'),
			animation: 'appear',
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			// Atlas is straight alpha (no pma:true).
			premultipliedAlpha: false,
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
			if (props.preview) {
				// Stay until Hide Loading clears `devPreview.loaderProgress`.
				return;
			}

			await waitForTimeout(SPLASH_DURATION_MS);
			// Unlock batch-3 / cards assets while the spine splash stays up.
			props.oncomplete?.();

			while (!stateApp.loaded) {
				await waitForTimeout(50);
			}

			loading = false;
			props.ondismissed?.();
		})();

		return () => {
			player?.dispose();
		};
	});
</script>

{#if show}
	<!-- Transparent wrap: static street lives in LoaderStreetStill underneath. -->
	<div class="wrap" transition:fade>
		<div class="player" bind:this={playerContainer}></div>
		<div
			class="progress-wrap"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(progress)}
			aria-busy="true"
			aria-live="polite"
		>
			<div class="progress-track">
				<div class="progress-fill" style:width="{progress}%"></div>
			</div>
			<span class="progress-label">{Math.round(progress)}%</span>
		</div>
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
		background-color: transparent;
		overflow: hidden;
		pointer-events: none;
	}

	.player {
		position: relative;
		z-index: 1;
		/* Clip logo WebGL so it cannot smear over the static street. */
		width: min(640px, 90vw);
		height: min(740px, 85vh);
		overflow: hidden;
		transform: translateY(-6vh);
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

	.progress-wrap {
		position: absolute;
		z-index: 2;
		left: 50%;
		top: 50%;
		transform: translate(-50%, calc(-50% + min(360px, 45vh)));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		width: min(280px, 55vw);
		pointer-events: none;
		user-select: none;
	}

	.progress-track {
		width: 100%;
		height: 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.12);
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.18);
	}

	.progress-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #c9a24a, #f0d78c);
		transition: width 120ms linear;
	}

	.progress-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.75);
	}

	@media (max-width: 768px) and (orientation: portrait) {
		.progress-wrap {
			width: min(340px, 78vw);
			gap: 0.6rem;
		}

		.progress-track {
			height: 14px;
			border-width: 1.5px;
		}

		.progress-label {
			font-size: 1.05rem;
		}
	}
</style>
