<script lang="ts">
	import { untrack } from 'svelte';
	import { backOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';

	import ArchedRibbonTitle from './ArchedRibbonTitle.svelte';
	import { getContext } from '../game/context';
	import { GAME_INFO_SYMBOL_IMAGES } from '../game/gameInfoSymbols';
	import { loaderCardImageUrl } from '../game/loaderCardAssets';

	const bonusSymbolUrl = GAME_INFO_SYMBOL_IMAGES.B;

	const BOUNCE_MS = 520;

	type Props = {
		cardIndex: number;
		cardWidth: number;
		animationIndex?: number;
		animate?: boolean;
		carousel?: boolean;
		isActive?: boolean;
		bounceKey?: number;
	};

	const props: Props = $props();
	const context = getContext();

	const scale = new Tween(1);

	const cardUrl = $derived(loaderCardImageUrl(props.cardIndex));
	const titleText = $derived(
		props.cardIndex === 0
			? context.i18nDerived.loaderCard1Title()
			: props.cardIndex === 1
				? context.i18nDerived.loaderCard2Title()
				: context.i18nDerived.loaderCard3Title(),
	);
	const titleArchDeg = $derived(props.cardIndex === 0 ? 34 : props.cardIndex === 1 ? 30 : 26);
	const animationIndex = $derived(props.animationIndex ?? props.cardIndex);
	const cardStyle = $derived(
		`--card-width:${props.cardWidth}px;transform:scale(${scale.current});`,
	);

	$effect(() => {
		if (!props.carousel) return;

		if (!props.isActive) {
			untrack(() => {
				void scale.set(1, { duration: 0 });
			});
			return;
		}

		props.bounceKey;
		untrack(() => {
			void scale.set(0.86, { duration: 0 });
			void scale.set(1, { duration: BOUNCE_MS, easing: backOut });
		});
	});
</script>

<article
	class="loader-card"
	class:animate-in={!props.carousel && props.animate !== false}
	style={cardStyle}
	style:--anim-index={animationIndex}
	aria-label="loader card {props.cardIndex + 1}"
>
	<img class="card-bg" src={cardUrl} alt="" draggable="false" />

	<div class="card-content">
		<div class="card-title">
			<ArchedRibbonTitle text={titleText} archDeg={titleArchDeg} tracking={1} />
		</div>
		{#if props.cardIndex === 0}
			<div class="card-bonus-symbol">
				<img class="card-bonus-symbol-img" src={bonusSymbolUrl} alt="" draggable="false" />
			</div>
			<div class="card-body card-body--1">
				<div class="line-block line-block--1">
					<p class="line">{context.i18nDerived.loaderCard1Line1()}</p>
					<p class="line highlight">{context.i18nDerived.loaderCard1Line2()}</p>
				</div>
				<div class="line-block line-block--2">
					<p class="line">{context.i18nDerived.loaderCard1Line3()}</p>
					<p class="line highlight">{context.i18nDerived.loaderCard1Line4()}</p>
				</div>
			</div>
		{:else if props.cardIndex === 1}
			<div class="card-body card-body--2">
				<p class="line">{context.i18nDerived.loaderCard2Body()}</p>
			</div>
		{:else}
			<div class="card-body card-body--3">
				<div class="line-block line-block--3">
					<p class="line">{context.i18nDerived.loaderCard3Line1()}</p>
					<p class="line highlight">{context.i18nDerived.loaderCard3Line2()}</p>
				</div>
			</div>
		{/if}
	</div>
</article>

<style lang="scss">
	.loader-card {
		position: relative;
		width: var(--card-width);
		aspect-ratio: 862 / 1484;
		flex: 0 0 auto;
		transform-origin: center center;
		--card-height: calc(var(--card-width) * 1484 / 862);
		--line-height: calc(var(--card-width) * 0.059);
	}

	.loader-card.animate-in {
		opacity: 0;
		animation: loader-card-in 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(var(--anim-index, 0) * 160ms);
	}

	@keyframes loader-card-in {
		from {
			opacity: 0;
			transform: scale(0.78) translateY(24px);
		}

		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.card-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
	}

	.card-content {
		position: absolute;
		inset: 0;
	}

	.card-title {
		position: absolute;
		top: calc(var(--card-height) * 0.033);
		left: 12%;
		right: 12%;
		height: calc(var(--card-height) * 0.12);
		margin: 0;
		font-size: calc(var(--card-width) * 0.06);
		--bb-title-tracking: 1;
	}

	.card-title :global(.arched-title) {
		filter: none;
	}

	.card-title :global(.arch-char) {
		top: 21%;
		color: #f5e6c8;
		background: none;
		background-clip: unset;
		-webkit-background-clip: unset;
		-webkit-text-fill-color: #f5e6c8;
		font-weight: 900;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
	}

	.card-bonus-symbol {
		position: absolute;
		left: 50%;
		top: calc(var(--card-height) * 0.33);
		transform: translate(-50%, -50%);
		width: calc(var(--card-width) * 0.7);
		height: calc(var(--card-height) * 0.36);
		z-index: 2;
		pointer-events: none;
	}

	.card-bonus-symbol-img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		user-select: none;
		pointer-events: none;
	}

	.card-body {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}

	.line {
		position: absolute;
		left: 12%;
		right: 12%;
		margin: 0;
		width: auto;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--card-width) * 0.05);
		line-height: var(--line-height);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.015em;
		text-align: center;
		color: #4a3020;
	}

	.line.highlight {
		color: #d4512a;
		font-weight: 800;
	}

	.line-block {
		position: absolute;
		left: 12%;
		right: 12%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--line-block-gap);
	}

	.line-block .line {
		position: static;
		width: 100%;
	}

	/* Offsets mirror former Pixi LoaderCardContent layout math. */
	.line-block--1 {
		top: calc(var(--card-height) * 0.582);
		--line-block-gap: calc(var(--line-height) * 0.25);
	}

	.line-block--2 {
		top: calc(var(--card-height) * 0.6 + var(--line-height) * 5.3);
		--line-block-gap: calc(var(--line-height) * 0.25);
	}

	.card-body--2 .line:nth-child(1) {
		top: calc(var(--card-height) * 0.645);
	}

	.line-block--3 {
		top: calc(var(--card-height) * 0.735);
		--line-block-gap: calc(var(--line-height) * 0.25);
	}
</style>
