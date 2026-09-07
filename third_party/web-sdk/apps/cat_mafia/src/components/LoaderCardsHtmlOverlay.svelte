<script lang="ts">
	import { onMount } from 'svelte';
	import { backOut, cubicIn } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { untrack } from 'svelte';

	import LoaderCardHtml from './LoaderCardHtml.svelte';
	import PressToContinueHtml from './PressToContinueHtml.svelte';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_EXIT_CARDS_DURATION_MS, LOADER_EXIT_CARDS_SLIDE_VH } from '../game/constants';
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

	// Cards after assets load; stay mounted during exit slide.
	const show = $derived(
		context.stateLayout.showLoadingScreen &&
			context.stateApp.loaded &&
			(gameEntrance.loadingCardsVisible || gameEntrance.loaderExitActive),
	);
	const assetsReady = $derived(context.stateApp.loaded);
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

	const logoStyle = $derived(
		`width:${logoMetrics.width}px;height:${logoMetrics.height}px;margin-bottom:${logoMetrics.gap}px;transform:translateX(-50%) translateY(${logoMetrics.dropOffset}px);`,
	);

	let activeIndex = $state(0);
	let autoAdvanceTimer: ReturnType<typeof setTimeout> | undefined;
	let exitAnimStarted = $state(false);

	const trackOffset = new Tween(0);
	const exitSlideY = new Tween(0);
	const exitOpacity = new Tween(1);

	const exitSlidePx = $derived(
		(typeof window !== 'undefined' ? window.innerHeight : canvasSizes.height) *
			(LOADER_EXIT_CARDS_SLIDE_VH / 100),
	);

	const trackX = $derived.by(() => {
		if (!useCarousel) return 0;
		return trackOffset.current;
	});

	const trackStyle = $derived.by(() => {
		if (!useCarousel) return '';
		return `transform:translateX(${trackX}px);`;
	});

	const clampIndex = (index: number) => Math.max(0, Math.min(LOADER_CARD_COUNT - 1, index));

	const overlayTransform = $derived.by(() => {
		const base = 'translate(-50%,-50%)';
		if (!gameEntrance.loaderExitActive) return base;
		return `${base} translateY(${exitSlideY.current}px)`;
	});

	const overlayStyle = $derived(
		`left:${canvasSizes.width * 0.5}px;top:${anchor.y + (logoMetrics.height + logoMetrics.gap) / 2}px;transform:${overlayTransform};opacity:${exitOpacity.current};`,
	);

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
			priority: [LOADER_NEON_LOGO_URL, LOADER_SCREEN_IMAGE_URLS[0]!],
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

	// Keep card 1 visible while assets load; reset when press-to-continue unlocks.
	$effect(() => {
		if (!show || !useCarousel) return;
		untrack(() => {
			if (!assetsReady) {
				snapToIndex(0, false);
			}
		});
	});

	$effect(() => {
		if (!show || !useCarousel || !assetsReady || gameEntrance.loaderExitActive) {
			clearAutoAdvance();
			return;
		}
		untrack(() => {
			snapToIndex(0, false);
		});
		scheduleAutoAdvance(AUTO_START_DELAY_MS);
		return clearAutoAdvance;
	});

	$effect(() => {
		if (!gameEntrance.loaderExitActive) {
			exitAnimStarted = false;
			void exitSlideY.set(0, { duration: 0 });
			void exitOpacity.set(1, { duration: 0 });
			return;
		}
		if (exitAnimStarted) return;

		exitAnimStarted = true;
		clearAutoAdvance();
		const slidePx = exitSlidePx;
		untrack(() => {
			void exitSlideY.set(0, { duration: 0 });
			void exitOpacity.set(1, { duration: 0 });
		});

		void Promise.all([
			exitSlideY.set(slidePx, { duration: LOADER_EXIT_CARDS_DURATION_MS, easing: cubicIn }),
			exitOpacity.set(0, { duration: LOADER_EXIT_CARDS_DURATION_MS, easing: cubicIn }),
		]);
	});
</script>

{#if show}
	<div
		class="loader-cards-overlay"
		class:exiting={gameEntrance.loaderExitActive}
		style={overlayStyle}
		aria-hidden={!show}
	>
		<div class="loader-cards-stack">
			<!-- Loader logo slot (layout only). -->
			<div class="loader-neon-logo-placeholder" style={logoStyle}></div>
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
		</div>
	</div>
	<!--
		Sibling of the transformed cards box — fixed label must not sit under a
		transform ancestor. Above LoaderStreetStill (42) and cards (44).
		Space / tap handlers live in LoadingScreen.
	-->
	<div class="loader-press-to-continue">
		{#if gameEntrance.loadingCardsVisible}
			<PressToContinueHtml />
		{/if}
	</div>
{/if}

<style lang="scss">
	.loader-neon-logo-placeholder {
		position: absolute;
		left: 50%;
		bottom: 100%;
		display: block;
		pointer-events: none;
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
		will-change: transform, opacity;
	}

	.loader-cards-overlay.exiting {
		z-index: 49;
	}

	.loader-press-to-continue {
		position: fixed;
		inset: 0;
		z-index: 45;
		pointer-events: none;
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
</style>
