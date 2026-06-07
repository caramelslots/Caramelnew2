<!--
	CashStacksBetButton.svelte — обёртка над CashStacksSpinButton.
	Когда открыта модалка автоигры, рендерит CashStacksStartAutoplayButton
	(клик запускает авто-спины).
-->
<script lang="ts">
	import type { ButtonProps } from 'components-pixi';
	import { stateModal, stateUi } from 'state-shared';

	import { stateGame } from '../game/stateGame.svelte';
	import CashStacksSpinButton from './CashStacksSpinButton.svelte';
	import CashStacksStartAutoplayButton from './CashStacksStartAutoplayButton.svelte';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const isFreeSpins = $derived(
		stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow,
	);
	const isAutoSpinModalOpen = $derived(stateModal.modal?.name === 'autoSpin');
</script>

{#if isFreeSpins}
{:else if isAutoSpinModalOpen}
	<CashStacksStartAutoplayButton {...props} />
{:else}
	<CashStacksSpinButton {...props} />
{/if}
