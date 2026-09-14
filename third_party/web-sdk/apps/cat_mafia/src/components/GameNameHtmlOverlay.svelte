<!--
	Clock + game title — HTML overlay pinned to the canvas top-left.
	Replaces Pixi UiGameName so the label stays crisp above the WebGL stage.
-->
<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';

	import { computeGameNameHtmlLayout } from '../game/gameNameHtmlLayout';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { getContextLayout } from 'utils-layout';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

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

	const layout = $derived(computeGameNameHtmlLayout(stateLayoutDerived));
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
		style:left="{layout.left}px"
		style:top="{layout.top}px"
		style:font-size="{layout.fontSize}px"
		style:line-height="{layout.lineHeight}px"
		style:gap="{layout.gap}px"
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
		font-family: 'proxima-nova', sans-serif;
		font-weight: 600;
		color: #fff;
		white-space: nowrap;
	}

	.clock,
	.title {
		display: inline-block;
	}
</style>
