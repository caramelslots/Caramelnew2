<!--
	UiCashStacksPortraitLayout.svelte — portrait mobile (ref. IMAGE 2026-06-02 13:11:58).
	  WIN — WinHudHtmlOverlay (proxima-nova)
	  Buy + Bonus Boost — CashStacksBuyBonusPanel (HTML)
	  − | Spin | + и util-ряд — CashStacksPortraitHudOverlay (HTML)
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';
	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';
	import { getContextLayout } from 'utils-layout';

	type Props = {
		logo?: Snippet;
	};

	const props: Props = $props();
	const { stateLayoutDerived } = getContextLayout();
	const W = $derived(stateLayoutDerived.mainLayout().width);
</script>

<UiFadeContainer>
	<Container x={W - 20}>
		{#if props.logo}{@render props.logo()}{/if}
	</Container>
</UiFadeContainer>
