<!--
	UiCashStacksLayout.svelte — кастомный layout для Wok Fury.
	  - BuyBonus  : CashStacksBuyBonusPanel (HTML)
	  - HUD bar + spin cluster : CashStacksDesktopHudOverlay (HTML), кроме portrait
	  - WIN — WinHudHtmlOverlay (proxima-nova, same as FS intro Congratulations)
	Portrait — UiCashStacksPortraitLayout (+ CashStacksPortraitHudOverlay).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { EnableSpaceHold } from 'components-shared';

	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';
	import UiCashStacksPortraitLayout from './UiCashStacksPortraitLayout.svelte';
	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { isAnyMenuOpen } from '../game/isAnyMenuOpen';
	import { isLoaderScreenBlockingSpin } from '../game/isLoaderScreenBlockingSpin';
	import { getContextLayout } from 'utils-layout';

	type Props = {
		logo?: Snippet;
	};

	const props: Props = $props();
	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const useDesktopHud = $derived(layoutType !== 'portrait');
	const spaceHoldDisabled = $derived(
		isAnyMenuOpen() || isLoaderScreenBlockingSpin(context.stateLayout.showLoadingScreen),
	);
</script>

<EnableSpaceHold disabled={spaceHoldDisabled} />

{#if useDesktopHud}
	<UiFadeContainer>
		<Container x={20} y={70}>
			{#if props.logo}
				{@render props.logo()}
			{/if}
		</Container>
	</UiFadeContainer>
{:else if layoutType === 'portrait'}
	<UiCashStacksPortraitLayout>
		{#snippet logo()}
			{#if props.logo}{@render props.logo()}{/if}
		{/snippet}
	</UiCashStacksPortraitLayout>
{/if}
