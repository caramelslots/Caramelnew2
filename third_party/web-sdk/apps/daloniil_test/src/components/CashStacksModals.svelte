<!--
	CashStacksModals.svelte — локальная замена SDK-овского <Modals> из
	components-ui-html. Содержит все стандартные модалки SDK, КРОМЕ:
	  - ModalAutoSpin → FeaturesAutoSpinOverlay (свой дизайн)
	  - ModalAutoSpinMessage → AutoplayMessageOverlay (рендерится отдельно в Game.svelte)
	  - ModalBuyBonus → BuyBonusOverlay (рендерится отдельно в Game.svelte)
	  - ModalBuyBonusConfirm → BuyBonusConfirmOverlay (рендерится отдельно в Game.svelte)
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import ModalError from 'components-ui-html/src/components/ModalError.svelte';
	import ModalBetMenu from 'components-ui-html/src/components/ModalBetMenu.svelte';
	import ModalPayTable from 'components-ui-html/src/components/ModalPayTable.svelte';
	import ModalGameRules from 'components-ui-html/src/components/ModalGameRules.svelte';
	import ModalSettings from 'components-ui-html/src/components/ModalSettings.svelte';

	type Props = {
		version: Snippet;
	};

	const props: Props = $props();
</script>

<ModalError />
<ModalBetMenu />
<!-- ModalBuyBonus: заменён на BuyBonusOverlay -->
<!-- ModalBuyBonusConfirm: заменён на BuyBonusConfirmOverlay -->
<!-- ModalAutoSpin: заменён на FeaturesAutoSpinOverlay -->
<!-- ModalAutoSpinMessage: заменён на AutoplayMessageOverlay -->
<ModalPayTable>
	{@render props.version()}
</ModalPayTable>
<ModalGameRules>
	{@render props.version()}
</ModalGameRules>
<ModalSettings />
