<!--
	ExportCardsDevOverlay — DEV preview of the FS entry card pick (designer_assets/export).
	Opened from DevButtons → UI & loading → Export Cards. Cards flip freely; Esc closes.
-->
<script lang="ts">
	import { getContext } from '../game/context';
	import { devPreview } from '../game/devPreview.svelte';
	import ExportCardsScreen from './ExportCardsScreen.svelte';

	/** Sample awards — same 8 / 10 / 12 FS tiers as the math book. */
	const CARD_FREE_SPINS = [8, 10, 12] as const;

	const context = getContext();
	let faceUp = $state<boolean[]>(CARD_FREE_SPINS.map(() => false));

	$effect(() => {
		if (devPreview.showExportCards) faceUp = CARD_FREE_SPINS.map(() => false);
	});
</script>

{#if devPreview.showExportCards}
	<!-- Above the DEV panel (99998). -->
	<ExportCardsScreen
		values={CARD_FREE_SPINS}
		{faceUp}
		hint={context.i18nDerived.cardPickTitle()}
		zIndex={100000}
		onPick={(i) => (faceUp[i] = !faceUp[i])}
		onClose={() => (devPreview.showExportCards = false)}
	/>
{/if}
