<!--
	UiCashStacksPortraitLayout.svelte — portrait mobile (ref. IMAGE 2026-06-02 13:11:58).
	  WIN под доской
	  Buy + Bonus Boost — CashStacksBuyBonusPanel (HTML)
	  − | Spin | + по центру (в FS — spin-кластер скрыт)
	  i | ☰ | balance + bet | автоигра | turbo — CashStacksPortraitHudOverlay (HTML)
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateBet, stateUi } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container, Text } from 'pixi-svelte';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';

	import CashStacksBetButton from './CashStacksBetButton.svelte';
	import CashStacksIncreaseButton from './CashStacksIncreaseButton.svelte';
	import CashStacksDecreaseButton from './CashStacksDecreaseButton.svelte';

	import { PORTRAIT_UI_LAYOUT } from '../game/constants';
	import { computePortraitHudY, portraitScaleY } from '../game/portraitHudLayout';
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

	const ml = $derived(stateLayoutDerived.mainLayout());
	const W = $derived(ml.width);
	const H = $derived(ml.height);

	const scalePortraitX = (px: number) => (px / PORTRAIT_UI_LAYOUT.refWidth) * W;

	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const winHudPos = $derived({
		x: W * 0.5,
		y:
			boardLayout.y +
			boardLayout.visualHeight * 0.5 +
			portraitScaleY(PORTRAIT_UI_LAYOUT.winBelowBoardGap, H),
	});

	const isFreeSpins = $derived(
		stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow,
	);
	const showWin = $derived(stateBet.winBookEventAmount > 0);
	const formatWinAmount = (v: number) => bookEventAmountToCurrencyString(v);

	const btn = PORTRAIT_UI_LAYOUT.buttons;
	const spinScale = $derived(btn.spinDiam / UI_BASE_SIZE);
	const spinSmallScale = $derived(btn.spinBetDiam / UI_BASE_SIZE);

	const spinHalf = $derived((UI_BASE_SIZE * spinScale) / 2);
	const smallHalf = $derived((UI_BASE_SIZE * spinSmallScale) / 2);
	const betControlOffsetX = $derived(spinHalf + btn.spinBetGap + smallHalf);
	const spinRaiseY = $derived(portraitScaleY(btn.spinRaiseY, H));
	const spinClusterShiftX = $derived(scalePortraitX(PORTRAIT_UI_LAYOUT.spinClusterShiftX));
	const utilRowHalf = $derived(
		Math.max(portraitScaleY(btn.utilIconDiam, H), portraitScaleY(26, H)) / 2,
	);

	const hudY = $derived.by(() => {
		void stateGame.gameType;
		void stateUi.freeSpinCounterShow;
		return computePortraitHudY(stateLayoutDerived, spinHalf, utilRowHalf);
	});
	const spinCenterY = $derived(hudY.spinCenterY);

	const WIN_TEXT_STYLE = {
		fontFamily: 'proxima-nova',
		fontSize: 28,
		fontWeight: '700' as const,
		fill: 0xffd000,
	};
</script>

<UiFadeContainer>
	<Container x={20}>
		{#if props.gameName}{@render props.gameName()}{/if}
	</Container>

	<Container x={W - 20}>
		{#if props.logo}{@render props.logo()}{/if}
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

	<MainContainer alignVertical="bottom">
		<!-- Spin-кластер: FS — без Spin (−/+ тоже скрыты); base — − | Spin | + -->
		{#if !isFreeSpins}
			<Container x={W * 0.5 + spinClusterShiftX} y={spinCenterY}>
				<Container x={-betControlOffsetX} y={0}>
					<CashStacksDecreaseButton anchor={0.5} sizeScale={spinSmallScale} />
				</Container>
				<Container x={0} y={spinRaiseY}>
					<CashStacksBetButton anchor={0.5} sizeScale={spinScale} />
				</Container>
				<Container x={betControlOffsetX} y={0}>
					<CashStacksIncreaseButton anchor={0.5} sizeScale={spinSmallScale} />
				</Container>
			</Container>
		{/if}
	</MainContainer>
</UiFadeContainer>
