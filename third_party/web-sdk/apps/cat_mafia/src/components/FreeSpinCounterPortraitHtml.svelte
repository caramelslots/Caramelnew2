<!--
	Phone portrait FS count — same pill as DuelModeOverlay counters,
	anchored to the top-right gold rail (duel sits top-left).
-->
<script lang="ts">
	import { fade } from 'svelte/transition';

	import { getContext } from '../game/context';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { devPreview } from '../game/devPreview.svelte';
	import { getPortraitFsCounterScreenPos } from '../game/duelLayout';

	const context = getContext();

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);

	const forceShow = $derived(devPreview.forceShowFsBoardChrome);
	const visible = $derived.by(() => {
		if (!isPortrait || !gameEntrance.showContent) return false;
		if (stateDuel.active || stateGame.transitionActive) return false;
		if (forceShow) return true;
		return show;
	});

	const pos = $derived(
		getPortraitFsCounterScreenPos({
			mainLayout: context.stateLayoutDerived.mainLayout(),
			boardLayout: context.stateGameDerived.boardLayout(),
		}),
	);

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
		class="fs-duel-counter"
		style:left="{pos.left}px"
		style:top="{pos.top}px"
		data-test="fs-counter-portrait"
		transition:fade={{ duration: 220 }}
		aria-hidden="true"
	>
		<span class="counter-label">{label}</span>
		<span class="counter-value">{value}</span>
	</div>
{/if}

<style lang="scss">
	.fs-duel-counter {
		position: fixed;
		z-index: 41;
		pointer-events: none;
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		width: max-content;
		gap: 0.55rem;
		padding: 0.5rem 1.05rem;
		border-radius: 999px;
		background: rgba(18, 10, 28, 0.82);
		border: 1px solid rgba(255, 210, 120, 0.95);
		box-shadow:
			0 0 0 1px rgba(255, 200, 100, 0.35),
			0 0 14px rgba(255, 180, 60, 0.35);
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		color: #f6e6c2;
		line-height: 1;
		white-space: nowrap;
		/* Right-align the pill; sit fully above the gold crest. */
		transform: translate(-100%, -100%);
	}

	.counter-label,
	.counter-value {
		flex-shrink: 0;
		white-space: nowrap;
	}

	.counter-label {
		font-size: clamp(1rem, 3.6vw, 1.2rem);
		letter-spacing: 0.06em;
		opacity: 0.9;
		text-transform: uppercase;
	}

	.counter-value {
		font-size: clamp(1.2rem, 4.2vw, 1.5rem);
		font-variant-numeric: tabular-nums;
	}
</style>
