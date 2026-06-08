<!--
	UiCashStacksLayout.svelte — кастомный desktop-layout для Cash Stacks.
	  - BuyBonus  : CashStacksBuyBonusPanel (HTML)
	  - HUD bar + spin cluster : CashStacksDesktopHudOverlay (HTML)
	  - WIN — Pixi под доской
	Portrait — UiCashStacksPortraitLayout (+ CashStacksPortraitHudOverlay).
	Popout S/L + desktop — desktop HUD overlay.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateBet, stateUi } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container, Text } from 'pixi-svelte';
	import { EnableSpaceHold } from 'components-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';
	import UiCashStacksPortraitLayout from './UiCashStacksPortraitLayout.svelte';
	import LayoutLandscape from 'components-ui-pixi/src/components/LayoutLandscape.svelte';
	import LayoutTablet from 'components-ui-pixi/src/components/LayoutTablet.svelte';
	import LabelBalance from 'components-ui-pixi/src/components/LabelBalance.svelte';
	import LabelWin from 'components-ui-pixi/src/components/LabelWin.svelte';
	import LabelBet from 'components-ui-pixi/src/components/LabelBet.svelte';
	import ButtonPayTable from 'components-ui-pixi/src/components/ButtonPayTable.svelte';
	import ButtonGameRules from 'components-ui-pixi/src/components/ButtonGameRules.svelte';
	import ButtonSettings from 'components-ui-pixi/src/components/ButtonSettings.svelte';
	import ButtonBuyBonus from 'components-ui-pixi/src/components/ButtonBuyBonus.svelte';
	import CashStacksBetButton from './CashStacksBetButton.svelte';
	import ButtonTurbo from 'components-ui-pixi/src/components/ButtonTurbo.svelte';
	import CashStacksIncreaseButton from './CashStacksIncreaseButton.svelte';
	import CashStacksDecreaseButton from './CashStacksDecreaseButton.svelte';
	import ButtonAutoSpin from 'components-ui-pixi/src/components/ButtonAutoSpin.svelte';
	import ButtonMenu from 'components-ui-pixi/src/components/ButtonMenu.svelte';
	import ButtonMenuClose from 'components-ui-pixi/src/components/ButtonMenuClose.svelte';
	import ButtonSoundSwitch from 'components-ui-pixi/src/components/ButtonSoundSwitch.svelte';

	import { isPopoutViewport } from '../game/constants';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { getContextLayout } from 'utils-layout';

	type Props = {
		gameName?: Snippet;
		logo?: Snippet;
	};

	const props: Props = $props();
	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPopout = $derived(isPopoutViewport(stateLayoutDerived.canvasSizes()));
	const useDesktopHud = $derived(layoutType === 'desktop' || isPopout);
	const isFreeSpins = $derived(
		stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow,
	);

	const WIN_BELOW_BOARD_GAP = 72;
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const winHudPos = $derived({
		x: boardLayout.x,
		y: boardLayout.y + boardLayout.height * 0.5 + WIN_BELOW_BOARD_GAP,
	});
	const formatWinAmount = (v: number) => bookEventAmountToCurrencyString(v);
	const showWin = $derived(stateBet.winBookEventAmount > 0);

	const WIN_TEXT_STYLE = {
		fontFamily: 'proxima-nova',
		fontSize: 28,
		fontWeight: '700' as const,
		fill: 0xffd000,
	};
</script>

<EnableSpaceHold />

{#if useDesktopHud}
	<UiFadeContainer>
		<Container x={20}>
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
					<Text
						anchor={0.5}
						eventMode="none"
						text={`${context.i18nDerived.win().toUpperCase()} ${formatWinAmount(stateBet.winBookEventAmount)}`}
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
{:else if layoutType === 'landscape' && !isPopout}
	<UiFadeContainer>
		<LayoutLandscape>
			{#snippet gameName()}
				{#if props.gameName}{@render props.gameName()}{/if}
			{/snippet}
			{#snippet logo()}
				{#if props.logo}{@render props.logo()}{/if}
			{/snippet}
			{#snippet amountBalance(labelProps)}<LabelBalance {...labelProps} />{/snippet}
			{#snippet amountWin(labelProps)}<LabelWin {...labelProps} />{/snippet}
			{#snippet amountBet(labelProps)}<LabelBet {...labelProps} />{/snippet}
			{#snippet buttonBuyBonus(buttonProps)}<ButtonBuyBonus {...buttonProps} />{/snippet}
			{#snippet buttonBet(buttonProps)}{#if !isFreeSpins}<CashStacksBetButton {...buttonProps} />{/if}{/snippet}
			{#snippet buttonTurbo(buttonProps)}<ButtonTurbo {...buttonProps} />{/snippet}
			{#snippet buttonAutoSpin(buttonProps)}<ButtonAutoSpin {...buttonProps} />{/snippet}
			{#snippet buttonIncrease(buttonProps)}<CashStacksIncreaseButton {...buttonProps} />{/snippet}
			{#snippet buttonDecrease(buttonProps)}<CashStacksDecreaseButton {...buttonProps} />{/snippet}
			{#snippet buttonMenu(buttonProps)}<ButtonMenu {...buttonProps} />{/snippet}
			{#snippet buttonMenuClose(buttonProps)}<ButtonMenuClose {...buttonProps} />{/snippet}
			{#snippet buttonPayTable(buttonProps)}<ButtonPayTable {...buttonProps} />{/snippet}
			{#snippet buttonGameRules(buttonProps)}<ButtonGameRules {...buttonProps} />{/snippet}
			{#snippet buttonSettings(buttonProps)}<ButtonSettings {...buttonProps} />{/snippet}
			{#snippet buttonSoundSwitch(buttonProps)}<ButtonSoundSwitch {...buttonProps} />{/snippet}
		</LayoutLandscape>
	</UiFadeContainer>
{:else}
	<UiFadeContainer>
		<LayoutTablet>
			{#snippet gameName()}
				{#if props.gameName}{@render props.gameName()}{/if}
			{/snippet}
			{#snippet logo()}
				{#if props.logo}{@render props.logo()}{/if}
			{/snippet}
			{#snippet amountBalance(labelProps)}<LabelBalance {...labelProps} />{/snippet}
			{#snippet amountWin(labelProps)}<LabelWin {...labelProps} />{/snippet}
			{#snippet amountBet(labelProps)}<LabelBet {...labelProps} />{/snippet}
			{#snippet buttonBuyBonus(buttonProps)}<ButtonBuyBonus {...buttonProps} />{/snippet}
			{#snippet buttonBet(buttonProps)}{#if !isFreeSpins}<CashStacksBetButton {...buttonProps} />{/if}{/snippet}
			{#snippet buttonTurbo(buttonProps)}<ButtonTurbo {...buttonProps} />{/snippet}
			{#snippet buttonAutoSpin(buttonProps)}<ButtonAutoSpin {...buttonProps} />{/snippet}
			{#snippet buttonIncrease(buttonProps)}<CashStacksIncreaseButton {...buttonProps} />{/snippet}
			{#snippet buttonDecrease(buttonProps)}<CashStacksDecreaseButton {...buttonProps} />{/snippet}
			{#snippet buttonMenu(buttonProps)}<ButtonMenu {...buttonProps} />{/snippet}
			{#snippet buttonMenuClose(buttonProps)}<ButtonMenuClose {...buttonProps} />{/snippet}
			{#snippet buttonPayTable(buttonProps)}<ButtonPayTable {...buttonProps} />{/snippet}
			{#snippet buttonGameRules(buttonProps)}<ButtonGameRules {...buttonProps} />{/snippet}
			{#snippet buttonSettings(buttonProps)}<ButtonSettings {...buttonProps} />{/snippet}
			{#snippet buttonSoundSwitch(buttonProps)}<ButtonSoundSwitch {...buttonProps} />{/snippet}
		</LayoutTablet>
	</UiFadeContainer>
{/if}
