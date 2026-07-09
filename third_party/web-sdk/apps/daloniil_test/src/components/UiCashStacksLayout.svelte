<!--
	UiCashStacksLayout.svelte — кастомный layout для Wok Fury.
	  - BuyBonus  : CashStacksBuyBonusPanel (HTML)
	  - HUD bar + spin cluster : CashStacksDesktopHudOverlay (HTML), кроме portrait
	  - WIN — Pixi под доской
	Portrait — UiCashStacksPortraitLayout (+ CashStacksPortraitHudOverlay).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateBet } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container } from 'pixi-svelte';
	import { EnableSpaceHold } from 'components-shared';

	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';
	import UiCashStacksPortraitLayout from './UiCashStacksPortraitLayout.svelte';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';

	import {
		BITMAP_FONT_SCALE,
		isPopoutSmallViewport,
		POPOUT_S_SCALE,
		WIN_HUD_FONT_SIZE,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { getContextLayout } from 'utils-layout';

	type Props = {
		gameName?: Snippet;
		logo?: Snippet;
	};

	const props: Props = $props();
	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPopoutSmall = $derived(isPopoutSmallViewport(stateLayoutDerived.canvasSizes()));
	const useDesktopHud = $derived(layoutType !== 'portrait');
	const gameNameScale = $derived(isPopoutSmall ? POPOUT_S_SCALE : 1);

	const WIN_BELOW_BOARD_GAP = 58;
	/** Horizontal nudge right from screen center, as a fraction of main layout width. */
	const WIN_HUD_X_OFFSET_RATIO = 0.012;
	const ml = $derived(stateLayoutDerived.mainLayout());
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const winHudPos = $derived({
		x: ml.width * (0.5 + WIN_HUD_X_OFFSET_RATIO),
		y: boardLayout.y + boardLayout.height * 0.5 + WIN_BELOW_BOARD_GAP,
	});
	const showWin = $derived(stateBet.winBookEventAmount > 0);

	const WIN_TEXT_STYLE = {
		fontSize: WIN_HUD_FONT_SIZE * BITMAP_FONT_SCALE,
		fontWeight: 'bold' as const,
		letterSpacing: 1,
	};
	const winLabelGap = WIN_HUD_FONT_SIZE * BITMAP_FONT_SCALE * 0.78;
</script>

<EnableSpaceHold />

{#if useDesktopHud}
	<UiFadeContainer>
		<Container x={20} scale={gameNameScale}>
			{#if props.gameName}
				{@render props.gameName()}
			{/if}
		</Container>

		<Container x={20} y={70}>
			{#if props.logo}
				{@render props.logo()}
			{/if}
		</Container>

		{#if showWin}
			<MainContainer>
				<Container x={winHudPos.x} y={winHudPos.y} zIndex={20}>
					<ResponsiveCurrencyBitmapText
						anchor={0.5}
						bodyFontVariant="prostoi"
						eventMode="none"
						prefix={context.i18nDerived.win().toUpperCase()}
						amount={stateBet.winBookEventAmount}
						bookEvent
						maxWidth={boardLayout.width * 0.96}
						minScale={0.5}
						labelGap={winLabelGap}
						style={WIN_TEXT_STYLE}
					/>
				</Container>
			</MainContainer>
		{/if}
	</UiFadeContainer>
{:else if layoutType === 'portrait'}
	<UiCashStacksPortraitLayout>
		{#snippet gameName()}
			{#if props.gameName}{@render props.gameName()}{/if}
		{/snippet}
		{#snippet logo()}
			{#if props.logo}{@render props.logo()}{/if}
		{/snippet}
	</UiCashStacksPortraitLayout>
{/if}
