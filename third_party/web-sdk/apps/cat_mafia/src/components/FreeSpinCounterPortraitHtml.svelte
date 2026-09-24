<!--
	Phone portrait FS count — autoplay.webp plaque on the top desk rail
	(number only, no FREE SPINS label).

	No fade-in: same as desktop FreeSpinCounter — appear in the same beat as
	HUD / board chrome (not after steam / intro clears).
-->
<script lang="ts">
	import { stateUi } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { devPreview } from '../game/devPreview.svelte';
	import { getPortraitFsCounterScreenBox } from '../game/duelLayout';
	import { HUD_ASSETS } from '../game/uiHtmlAssetManifest';

	const context = getContext();

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);

	const forceShow = $derived(devPreview.forceShowFsBoardChrome);
	const visible = $derived.by(() => {
		if (!isPortrait || !gameEntrance.showContent) return false;
		if (stateDuel.active) return false;
		if (forceShow) return true;
		return show || stateUi.freeSpinCounterShow;
	});

	const box = $derived(
		getPortraitFsCounterScreenBox({
			mainLayout: context.stateLayoutDerived.mainLayout(),
			boardLayout: context.stateGameDerived.boardLayout(),
		}),
	);

	const plaqueUrl = HUD_ASSETS.autoplay;
	const label = $derived(context.i18nDerived.fsCounterLabel());
	const value = $derived(`${current}/${total}`);

	$effect(() => {
		if (!forceShow) return;
		if (total <= 0) {
			current = 3;
			total = 10;
		}
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

{#if visible}
	<div
		class="fs-plaque-counter"
		style:left="{box.left}px"
		style:top="{box.top}px"
		style:width="{box.width}px"
		style:height="{box.height}px"
		style:font-size="{box.fontSize}px"
		style:background-image="url('{plaqueUrl}')"
		data-test="fs-counter-portrait"
		aria-label="{label} {value}"
		aria-hidden="true"
	>
		<span class="counter-value">{value}</span>
	</div>
{/if}

<style lang="scss">
	.fs-plaque-counter {
		position: fixed;
		z-index: 41;
		pointer-events: none;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-position: center;
		transform: translate(-50%, -50%);
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		color: #f6e6c2;
		line-height: 1;
	}

	.counter-value {
		flex-shrink: 0;
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.06em;
		text-shadow:
			0 0 8px rgba(255, 200, 100, 0.45),
			0 2px 4px rgba(0, 0, 0, 0.9);
		white-space: nowrap;
	}
</style>
