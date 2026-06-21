<script lang="ts">
	import { untrack } from 'svelte';
	import { backOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';

	import { getContext } from '../game/context';
	import { loaderCardImageUrl } from '../game/loaderCardAssets';

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
		{#if props.cardIndex === 0}
			<h3 class="card-title">{context.i18nDerived.loaderCard1Title()}</h3>
			<div class="card-body card-body--1">
				<p class="line">{context.i18nDerived.loaderCard1Line1()}</p>
				<p class="line highlight">{context.i18nDerived.loaderCard1Line2()}</p>
				<p class="line">{context.i18nDerived.loaderCard1Line3()}</p>
				<p class="line highlight">{context.i18nDerived.loaderCard1Line4()}</p>
			</div>
		{:else if props.cardIndex === 1}
			<h3 class="card-title">{context.i18nDerived.loaderCard2Title()}</h3>
			<div class="card-body card-body--2">
				<p class="line">{context.i18nDerived.loaderCard2Body()}</p>
			</div>
		{:else}
			<h3 class="card-title">{context.i18nDerived.loaderCard3Title()}</h3>
			<div class="card-body card-body--3">
				<p class="line">{context.i18nDerived.loaderCard3Line1()}</p>
				<p class="line highlight">{context.i18nDerived.loaderCard3Line2()}</p>
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
		top: calc(var(--card-height) * 0.105);
		left: 12%;
		right: 12%;
		margin: 0;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--card-width) * 0.052);
		font-weight: 900;
		font-style: italic;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		line-height: 1.05;
		text-align: center;
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
	}

	.card-body {
		position: absolute;
		inset: 0;
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

	/* Offsets mirror former Pixi LoaderCardContent layout math. */
	.card-body--1 .line:nth-child(1) {
		top: calc(var(--card-height) * 0.582);
	}

	.card-body--1 .line:nth-child(2) {
		top: calc(var(--card-height) * 0.6 + var(--line-height) * 1.8);
	}

	.card-body--1 .line:nth-child(3) {
		top: calc(var(--card-height) * 0.6 + var(--line-height) * 5.3);
	}

	.card-body--1 .line:nth-child(4) {
		top: calc(var(--card-height) * 0.6 + var(--line-height) * 6.3);
	}

	.card-body--2 .line:nth-child(1) {
		top: calc(var(--card-height) * 0.645);
	}

	.card-body--3 .line:nth-child(1) {
		top: calc(var(--card-height) * 0.7);
	}

	.card-body--3 .line:nth-child(2) {
		top: calc(var(--card-height) * 0.73 + var(--line-height) * 2.15);
	}
</style>
