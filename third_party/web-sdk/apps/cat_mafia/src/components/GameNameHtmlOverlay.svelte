<!--
	Clock + game title — HTML overlay pinned to the canvas top-left.
	Replaces Pixi UiGameName so the label stays crisp above the WebGL stage.
-->
<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';

	import { isPopoutSmallViewport, POPOUT_S_SCALE } from '../game/constants';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { getContextLayout } from 'utils-layout';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const GAME_NAME_LEFT = 20;
	const FONT_SIZE = 24;
	const LINE_HEIGHT = 32;
	const LABEL_GAP = 5;

	let uiVisible = $state(true);

	context.eventEmitter.subscribeOnMount({
		uiShow: () => {
			uiVisible = true;
		},
		uiHide: () => {
			uiVisible = false;
		},
	});

	const reactiveDate = new SvelteDate();
	const clock = $derived(
		reactiveDate.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: false,
		}),
	);

	$effect(() => {
		const interval = setInterval(() => {
			reactiveDate.setTime(Date.now());
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	});

	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const scale = $derived(isPopoutSmall ? POPOUT_S_SCALE : 1);
	const show = $derived(
		uiVisible &&
			!stateDuel.active &&
			(context.stateLayout.showLoadingScreen || gameEntrance.showContent),
	);
	const gameTitle = $derived(context.i18nDerived.gameTitle());
</script>

{#if show}
	<div
		class="game-name-overlay"
		style:left="{GAME_NAME_LEFT}px"
		style:top="0px"
		style:--gn-scale={scale}
		style:--gn-font-size="{FONT_SIZE}px"
		style:--gn-line-height="{LINE_HEIGHT}px"
		style:--gn-gap="{LABEL_GAP}px"
		aria-hidden="true"
	>
		<time class="clock">{clock}</time>
		<span class="title">{gameTitle}</span>
	</div>
{/if}

<style lang="scss">
	.game-name-overlay {
		position: fixed;
		z-index: 47;
		pointer-events: none;
		display: flex;
		align-items: baseline;
		gap: calc(var(--gn-gap) * var(--gn-scale));
		transform: scale(var(--gn-scale));
		transform-origin: top left;
		font-family: 'proxima-nova', sans-serif;
		font-size: var(--gn-font-size);
		font-weight: 600;
		line-height: var(--gn-line-height);
		color: #fff;
		white-space: nowrap;
	}

	.clock,
	.title {
		display: inline-block;
	}
</style>
