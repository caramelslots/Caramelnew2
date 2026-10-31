<!--
	idle → spin to square → hold → reels done → finish spin → idle
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';
	import { stateSlots } from 'utils-slots';

	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import {
		pauseSpinButtonClip,
		registerSpinButtonSpine,
		syncSpinButtonCycle,
	} from '../game/spinButtonPixi.svelte';
	import { stateGame } from '../game/stateGame.svelte';

	const spine = getContextSpine();
	const context = getContext();

	registerSpinButtonSpine(spine);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => {
			pauseSpinButtonClip();
		},
	});

	const preSpin = $derived(stateSlots.isPreSpinning);
	const reelsMoving = $derived(
		stateGame.board.some((reel) => reel.reelState.motion !== 'stopped'),
	);
	const autoplayActive = $derived(stateBetDerived.hasAutoBetCounter());

	$effect(() => {
		syncSpinButtonCycle({ preSpin, reelsMoving, autoplayActive });
	});

	onDestroy(() => {
		registerSpinButtonSpine(undefined);
	});
</script>
