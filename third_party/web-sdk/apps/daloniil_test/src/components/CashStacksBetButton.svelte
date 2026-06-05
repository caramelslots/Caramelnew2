<!--
	CashStacksBetButton.svelte — обёртка над ButtonBet.
	Когда открыта модалка автоигры, рендерит CashStacksStartAutoplayButton
	(текст «autobet», клик запускает авто-спины).
-->
<script lang="ts">
	import type { ButtonProps } from 'components-pixi';
	import { stateModal } from 'state-shared';

	import ButtonBet from 'components-ui-pixi/src/components/ButtonBet.svelte';
	import CashStacksStartAutoplayButton from './CashStacksStartAutoplayButton.svelte';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const isAutoSpinModalOpen = $derived(stateModal.modal?.name === 'autoSpin');
</script>

{#if isAutoSpinModalOpen}
	<CashStacksStartAutoplayButton {...props} />
{:else}
	<ButtonBet {...props} />
{/if}
