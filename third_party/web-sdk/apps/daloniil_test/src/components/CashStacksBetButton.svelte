<!--
	CashStacksBetButton.svelte — обёртка над CashStacksSpinButton.
-->
<script lang="ts">
	import type { ButtonProps } from 'components-pixi';
	import { stateUi } from 'state-shared';

	import { stateGame } from '../game/stateGame.svelte';
	import type { UiSizeScaleProps } from '../game/uiButtonSize';
	import CashStacksSpinButton from './CashStacksSpinButton.svelte';

	const props: Partial<Omit<ButtonProps, 'children'>> & UiSizeScaleProps = $props();
	const isFreeSpins = $derived(
		stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow,
	);
</script>

{#if !isFreeSpins}
	<CashStacksSpinButton {...props} />
{/if}
