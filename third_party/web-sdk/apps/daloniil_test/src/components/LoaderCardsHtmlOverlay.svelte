<script lang="ts">
	import { onMount } from 'svelte';
	import { backOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { untrack } from 'svelte';

	import LoaderCardHtml from './LoaderCardHtml.svelte';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_CARD_IMAGE_URLS } from '../game/loaderCardAssets';
	import {
		LOADER_CARD_COUNT,
		computeLoaderCardsAnchor,
		computeLoaderCarouselMetrics,
		computeLoaderRowMetrics,
		shouldUseLoaderCarousel,
	} from '../game/loaderCardsHtmlLayout';
	import { preloadHtmlImages } from '../game/preloadHtmlImages';

	const SWIPE_THRESHOLD = 0.18;
	const SNAP_MS = 520;
	const AUTO_HOLD_MS = 3000;
	const AUTO_START_DELAY_MS = 900;

	const context = getContext();

	const show = $derived(
		context.stateLayout.showLoadingScreen && gameEntrance.loadingCardsVisible,
	);
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

	const overlayStyle = $derived(
		`left:${canvasSizes.width * 0.5}px;top:${anchor.y}px;transform:translate(-50%,-50%);`,
	);

	let activeIndex = $state(0);
	let dragDeltaX = $state(0);
	let isDragging = $state(false);
	let pointerStartX = 0;
	let autoAdvanceTimer: ReturnType<typeof setTimeout> | undefined;

	const trackOffset = new Tween(0);

	const trackX = $derived.by(() => {
		if (!useCarousel) return 0;
		if (isDragging) {
			return -activeIndex * carouselMetrics.slideStep + dragDeltaX;
		}
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
		dragDeltaX = 0;

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
			if (isDragging) {
				scheduleAutoAdvance(250);
				return;
			}

			snapToIndex((activeIndex + 1) % LOADER_CARD_COUNT);
			scheduleAutoAdvance();
		}, delay);
	};

	const onPointerDown = (event: PointerEvent) => {
		if (!useCarousel) return;
		clearAutoAdvance();
		isDragging = true;
		pointerStartX = event.clientX;
		dragDeltaX = 0;
		void trackOffset.set(-activeIndex * carouselMetrics.slideStep, { duration: 0 });
		event.preventDefault();
	};

	const onPointerMove = (event: PointerEvent) => {
		if (!useCarousel || !isDragging) return;

		const rawDelta = event.clientX - pointerStartX;
		const maxDragRight = activeIndex * carouselMetrics.slideStep;
		const maxDragLeft = (LOADER_CARD_COUNT - 1 - activeIndex) * carouselMetrics.slideStep;
		dragDeltaX = Math.max(-maxDragLeft, Math.min(maxDragRight, rawDelta));
	};

	const onPointerUp = () => {
		if (!useCarousel || !isDragging) return;

		isDragging = false;

		const swipeRatio = dragDeltaX / carouselMetrics.slideStep;
		let nextIndex = activeIndex;

		if (Math.abs(swipeRatio) >= SWIPE_THRESHOLD) {
			nextIndex = swipeRatio > 0 ? activeIndex - 1 : activeIndex + 1;
		} else {
			const projectedOffset = -activeIndex * carouselMetrics.slideStep + dragDeltaX;
			nextIndex = Math.round(-projectedOffset / carouselMetrics.slideStep);
		}

		snapToIndex(nextIndex);
		scheduleAutoAdvance();
	};

	onMount(() => {
		clearAutoAdvance();
		void preloadHtmlImages(LOADER_CARD_IMAGE_URLS, {
			priority: [LOADER_CARD_IMAGE_URLS[0]!],
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

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
/>

{#if show}
	<div class="loader-cards-overlay" style={overlayStyle} aria-hidden={!show}>
		{#if useCarousel}
			<div
				class="carousel-viewport"
				style:width="{carouselMetrics.viewportWidth}px"
				style:height="{carouselMetrics.cardHeight}px"
				style:cursor={isDragging ? 'grabbing' : 'grab'}
				onpointerdown={onPointerDown}
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
{/if}

<style lang="scss">
	.loader-cards-overlay {
		position: fixed;
		z-index: 43;
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
		pointer-events: auto;
		touch-action: pan-y;
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
