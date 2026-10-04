<script lang="ts" module>
	import { SpinePlayer } from '@esotericsoftware/spine-player';

	let splashPlayer: SpinePlayer | undefined;
	let splashRoot: HTMLElement | undefined;
	let splashPark: HTMLDivElement | undefined;

	const splashParkHost = () => {
		if (splashPark) return splashPark;
		const host = document.createElement('div');
		host.setAttribute('aria-hidden', 'true');
		host.style.cssText =
			'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
		document.body.appendChild(host);
		splashPark = host;
		return host;
	};

	const splashPlayerRoot = (spinePlayer: SpinePlayer) => {
		if (splashRoot) return splashRoot;
		const canvas = (spinePlayer as { canvas?: HTMLCanvasElement }).canvas;
		const root = canvas?.closest('.spine-player');
		if (root instanceof HTMLElement) splashRoot = root;
		return splashRoot;
	};

	/** Pause and detach. dispose() calls loseContext and can blank the main canvas. */
	const retainSplashPlayer = (spinePlayer: SpinePlayer | undefined) => {
		if (!spinePlayer) return;
		try {
			spinePlayer.paused = true;
		} catch {
			/* not ready */
		}
		splashPlayer = spinePlayer;
		const root = splashPlayerRoot(spinePlayer);
		if (root) splashParkHost().appendChild(root);
		const canvas = (spinePlayer as { canvas?: HTMLCanvasElement }).canvas;
		if (canvas) {
			canvas.width = 1;
			canvas.height = 1;
		}
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SpinePlayer } from '@esotericsoftware/spine-player';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { isPopoutSmallViewport, STAKE_EMBED_VIEWPORTS } from '../game/constants';
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
	const context = getContext();

	const SPLASH_DURATION_MS = 2300;

	/** Popup L reference — S is exactly half; layout mirrors L then scales uniformly. */
	const POPOUT_L = STAKE_EMBED_VIEWPORTS.popoutL;

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

	const progressLabel = $derived(context.i18nDerived.loadingProgress(Math.round(progress)));

	const show = $derived(props.preview ? devPreview.loaderProgress : loading);

	const canvasSize = $derived.by(() => {
		const layout = context.stateLayoutDerived.canvasSizes();
		if (layout.width > 1 && layout.height > 1) return layout;
		return {
			width: typeof window !== 'undefined' ? window.innerWidth : 1280,
			height: typeof window !== 'undefined' ? window.innerHeight : 720,
		};
	});

	/** Stake mini embed 400×225 — only viewport that needs a CSS override. */
	const isPopoutS = $derived(isPopoutSmallViewport(canvasSize));

	/**
	 * Same formulas as the default CSS, evaluated at popup-L (800×450):
	 *   player: min(640, 90vw) × min(740, 85vh), translateY(-6vh)
	 *   bar:    min(360px, 45vh) offset, width min(280, 55vw)
	 * Then the whole L-stage is scaled to S (×0.5) — uniform, no side-squash.
	 */
	const popoutLPlayerW = Math.min(640, POPOUT_L.width * 0.9);
	const popoutLPlayerH = Math.min(740, POPOUT_L.height * 0.85);
	const popoutLPlayerLift = POPOUT_L.height * 0.06;
	const popoutLBarOffset = Math.min(360, POPOUT_L.height * 0.45);
	const popoutLBarW = Math.min(280, POPOUT_L.width * 0.55);
	const popoutSScale = 0.5;

	onMount(() => {
		if (!playerContainer) return;

		if (splashPlayer) {
			player = splashPlayer;
			const root = splashPlayerRoot(splashPlayer);
			if (root) playerContainer.appendChild(root);
			try {
				splashPlayer.paused = false;
			} catch {
				/* not ready */
			}
			return () => {
				retainSplashPlayer(splashPlayer);
				player = undefined;
			};
		}

		player = new SpinePlayer(playerContainer, {
			jsonUrl: resolveStaticUrl('logo-loader/skeleton.json'),
			atlasUrl: resolveStaticUrl('logo-loader/skeleton.atlas'),
			animation: 'appear',
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
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
				splashPlayer = spinePlayer;
				const root = playerContainer?.querySelector('.spine-player');
				if (root instanceof HTMLElement) splashRoot = root;
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
				return;
			}

			await waitForTimeout(SPLASH_DURATION_MS);
			props.oncomplete?.();

			while (!stateApp.loaded) {
				await waitForTimeout(50);
			}

			loading = false;
			props.ondismissed?.();
		})();

		return () => {
			retainSplashPlayer(player ?? splashPlayer);
			player = undefined;
		};
	});

	$effect(() => {
		if (show) return;
		retainSplashPlayer(player);
		player = undefined;
	});
</script>

{#if show}
	<!-- Transparent wrap: intro sky + roofs live in LoaderIntroBackground underneath. -->
	<div
		class="wrap"
		class:popout-s={isPopoutS}
		style:--popout-l-w="{POPOUT_L.width}px"
		style:--popout-l-h="{POPOUT_L.height}px"
		style:--popout-s-scale={popoutSScale}
		style:--popout-player-w="{popoutLPlayerW}px"
		style:--popout-player-h="{popoutLPlayerH}px"
		style:--popout-player-lift="{popoutLPlayerLift}px"
		style:--popout-bar-offset="{popoutLBarOffset}px"
		style:--popout-bar-w="{popoutLBarW}px"
		transition:fade
	>
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
			<span class="progress-label">{progressLabel}</span>
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
		/* Clip logo WebGL so it cannot smear over the intro backdrop. */
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
		gap: 0.35rem;
		width: min(280px, 55vw);
		pointer-events: none;
		user-select: none;
	}

	.progress-track {
		width: 100%;
		height: 9px;
		border-radius: 999px;
		background: rgba(18, 12, 8, 0.55);
		overflow: hidden;
		box-shadow:
			inset 0 1px 3px rgba(0, 0, 0, 0.45),
			inset 0 0 0 1px rgba(255, 255, 255, 0.06);
	}

	.progress-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #f58220 0%, #ffbf2e 62%, #ffd845 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
		transition: width 360ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.progress-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: #ffffff;
		margin-top: 0.15rem;
	}

	@media (max-width: 768px) {
		.wrap:not(.popout-s) .progress-label {
			font-size: clamp(1.05rem, 4.2vw, 1.35rem);
			letter-spacing: 0.1em;
			margin-top: 0.35rem;
		}
	}

	@media (max-width: 768px) and (orientation: portrait) {
		.wrap:not(.popout-s) .progress-wrap {
			width: min(340px, 78vw);
			gap: 0.5rem;
		}

		.wrap:not(.popout-s) .progress-track {
			height: 12px;
		}

		.wrap:not(.popout-s) .progress-label {
			font-size: clamp(1.15rem, 4.8vw, 1.4rem);
		}
	}

	/*
	 * Popout S = popup L laid out at 800×450, then uniform scale(0.5).
	 * Same rules as L/PC — no separate width/height % (that squashed the spine).
	 */
	.wrap.popout-s {
		inset: auto;
		left: 50%;
		top: 50%;
		width: var(--popout-l-w);
		height: var(--popout-l-h);
		transform: translate(-50%, -50%) scale(var(--popout-s-scale));
		transform-origin: center center;
	}

	.wrap.popout-s .player {
		width: var(--popout-player-w);
		height: var(--popout-player-h);
		transform: translateY(calc(-1 * var(--popout-player-lift)));
	}

	.wrap.popout-s .progress-wrap {
		width: var(--popout-bar-w);
		transform: translate(-50%, calc(-50% + var(--popout-bar-offset)));
	}
</style>
