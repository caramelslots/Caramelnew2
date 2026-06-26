<script lang="ts">
	import { onMount } from 'svelte';
	import { backOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { untrack } from 'svelte';

	import LoaderCardHtml from './LoaderCardHtml.svelte';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_NEON_LOGO_URL, LOADER_SCREEN_IMAGE_URLS } from '../game/loaderCardAssets';
	import {
		LOADER_CARD_COUNT,
		computeLoaderCardsAnchor,
		computeLoaderCarouselMetrics,
		computeLoaderLogoMetrics,
		computeLoaderRowMetrics,
		shouldUseLoaderCarousel,
	} from '../game/loaderCardsHtmlLayout';
	import { preloadHtmlImages } from '../game/preloadHtmlImages';

	const SNAP_MS = 520;
	const AUTO_HOLD_MS = 3000;
	const AUTO_START_DELAY_MS = 900;

	const context = getContext();

	const show = $derived(
		context.stateLayout.showLoadingScreen && gameEntrance.loadingCardsVisible,
	);
	const loadingProgress = $derived(Math.round(context.stateApp.loadingProgress));
	const showLoadProgress = $derived(show && !context.stateApp.loaded);
	const useCarousel = $derived(shouldUseLoaderCarousel(context.stateLayoutDerived));
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());

	const anchor = $derived(computeLoaderCardsAnchor(context.stateLayoutDerived));
	const rowMetrics = $derived(computeLoaderRowMetrics(anchor.layoutWidth, anchor.scale));
	const carouselMetrics = $derived(
		computeLoaderCarouselMetrics(
			anchor.layoutWidth,
			anchor.scale,
			canvasSizes.width,
			canvasSizes.height,
		),
	);

	const logoMetrics = $derived(computeLoaderLogoMetrics(context.stateLayoutDerived));

	const overlayStyle = $derived(
		`left:${canvasSizes.width * 0.5}px;top:${anchor.y + (logoMetrics.height + logoMetrics.gap) / 2}px;transform:translate(-50%,-50%);`,
	);
	const logoStyle = $derived(
		`width:${logoMetrics.width}px;height:${logoMetrics.height}px;margin-bottom:${logoMetrics.gap}px;transform:translateX(-50%) translateY(${logoMetrics.dropOffset}px);`,
	);

	let activeIndex = $state(0);
	let autoAdvanceTimer: ReturnType<typeof setTimeout> | undefined;

	const trackOffset = new Tween(0);

	const trackX = $derived.by(() => {
		if (!useCarousel) return 0;
		return trackOffset.current;
	});

	const trackStyle = $derived.by(() => {
		if (!useCarousel) return '';
		return `transform:translateX(${trackX}px);`;
	});

	const clampIndex = (index: number) => Math.max(0, Math.min(LOADER_CARD_COUNT - 1, index));

	const snapToIndex = (index: number, animate = true) => {
		const nextIndex = clampIndex(index);
		activeIndex = nextIndex;

		if (animate) {
			void trackOffset.set(-nextIndex * carouselMetrics.slideStep, {
				duration: SNAP_MS,
				easing: backOut,
			});
			return;
		}

		void trackOffset.set(-nextIndex * carouselMetrics.slideStep, { duration: 0 });
	};

	const clearAutoAdvance = () => {
		if (autoAdvanceTimer !== undefined) {
			clearTimeout(autoAdvanceTimer);
			autoAdvanceTimer = undefined;
		}
	};

	const scheduleAutoAdvance = (delay = AUTO_HOLD_MS) => {
		if (!useCarousel) return;
		clearAutoAdvance();
		autoAdvanceTimer = setTimeout(() => {
			snapToIndex((activeIndex + 1) % LOADER_CARD_COUNT);
			scheduleAutoAdvance();
		}, delay);
	};

	onMount(() => {
		clearAutoAdvance();
		void preloadHtmlImages(LOADER_SCREEN_IMAGE_URLS, {
			priority: [LOADER_NEON_LOGO_URL, LOADER_SCREEN_IMAGE_URLS[1]!],
			concurrency: 2,
		});
	});

	$effect(() => {
		if (!useCarousel) return;
		const step = carouselMetrics.slideStep;
		untrack(() => {
			void trackOffset.set(-activeIndex * step, { duration: 0 });
		});
	});

	$effect(() => {
		if (!show || !useCarousel) {
			clearAutoAdvance();
			return;
		}
		scheduleAutoAdvance(AUTO_START_DELAY_MS);
		return clearAutoAdvance;
	});
</script>

{#if show}
	<div class="loader-cards-overlay" style={overlayStyle} aria-hidden={!show}>
		<div class="loader-cards-stack">
			<img
				class="loader-neon-logo"
				src={LOADER_NEON_LOGO_URL}
				alt="Wok Fury"
				style={logoStyle}
				draggable="false"
			/>
			{#if useCarousel}
			<div
				class="carousel-viewport"
				style:width="{carouselMetrics.viewportWidth}px"
				style:height="{carouselMetrics.cardHeight}px"
			>
				<div class="carousel-track" style={trackStyle}>
					{#each Array(LOADER_CARD_COUNT) as _, index (index)}
						<div class="carousel-slide" style:width="{carouselMetrics.slideWidth}px">
							<LoaderCardHtml
								{index}
								cardIndex={index}
								cardWidth={carouselMetrics.cardWidth}
								carousel
								isActive={index === activeIndex}
								bounceKey={activeIndex}
							/>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div
				class="cards-row"
				style:width="{rowMetrics.rowWidth}px"
				style:gap="{rowMetrics.gap}px"
			>
				{#each Array(LOADER_CARD_COUNT) as _, index (index)}
					<LoaderCardHtml cardIndex={index} cardWidth={rowMetrics.cardWidth} {index} />
				{/each}
			</div>
		{/if}
		{#if showLoadProgress}
			<div class="load-progress" aria-hidden="true">
				<div class="load-progress__track">
					<div class="load-progress__fill" style:width="{loadingProgress}%"></div>
				</div>
				<span class="load-progress__label">{loadingProgress}%</span>
			</div>
		{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	.loader-neon-logo {
		position: absolute;
		left: 50%;
		bottom: 100%;
		display: block;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
		mix-blend-mode: screen;
	}

	.loader-cards-stack {
		position: relative;
	}

	.loader-cards-overlay {
		position: fixed;
		z-index: 44;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		user-select: none;
		overflow: visible;
	}

	.cards-row {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
	}

	.carousel-viewport {
		overflow: hidden;
	}

	.carousel-track {
		display: flex;
		align-items: center;
		will-change: transform;
	}

	.carousel-slide {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.load-progress {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		margin-top: 14px;
		min-width: min(280px, 72vw);
	}

	.load-progress__track {
		width: 100%;
		height: 6px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.12);
		overflow: hidden;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	}

	.load-progress__fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #ff4fd8 0%, #7c5cff 100%);
		transition: width 120ms linear;
	}

	.load-progress__label {
		font-family: 'JetBrains Mono', 'Menlo', monospace;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.72);
	}
</style>
