<!--
	UiCashStacksPortraitLayout.svelte — portrait mobile (ref. IMAGE 2026-06-02 13:11:58).
	  WIN под доской
	  Buy + Bonus Boost — CashStacksBuyBonusPanel (HTML)
	  − | Spin | + по центру (в FS — spin-кластер скрыт)
	  i | ☰ | balance + bet | автоигра | turbo — нижний ряд (в FS только balance)
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateBet, stateUi } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container, Text } from 'pixi-svelte';
	import { numberToCurrencyString, bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';

	import CashStacksBetButton from './CashStacksBetButton.svelte';
	import CashStacksIncreaseButton from './CashStacksIncreaseButton.svelte';
	import CashStacksDecreaseButton from './CashStacksDecreaseButton.svelte';

	import CashStacksInfoButton from './CashStacksInfoButton.svelte';
	import CashStacksMenuButton from './CashStacksMenuButton.svelte';
	import CashStacksAutoSpinButton from './CashStacksAutoSpinButton.svelte';
	import CashStacksTurboButton from './CashStacksTurboButton.svelte';
	import {
		BOARD_FRAME_OFFSET,
		PORTRAIT_UI_LAYOUT,
		PORTRAIT_UTIL_ICON_BASE,
		PORTRAIT_TURBO_ICON_BASE,
	} from '../game/constants';
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
		x: boardLayout.x + BOARD_FRAME_OFFSET.x,
		y:
			boardLayout.y +
			boardLayout.visualHeight * 0.5 +
			portraitScaleY(PORTRAIT_UI_LAYOUT.winBelowBoardGap, H),
	});

	const isFreeSpins = $derived(
		stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow,
	);
	const showWin = $derived(stateBet.winBookEventAmount > 0);
	const formatAmount = (v: number) => numberToCurrencyString(v);
	const formatWinAmount = (v: number) => bookEventAmountToCurrencyString(v);

	const btn = PORTRAIT_UI_LAYOUT.buttons;
	const spinScale = $derived(btn.spinDiam / UI_BASE_SIZE);
	const spinSmallScale = $derived(btn.spinBetDiam / UI_BASE_SIZE);
	const utilIconScale = $derived(btn.utilIconDiam / PORTRAIT_UTIL_ICON_BASE);
	const turboScale = $derived(btn.utilIconDiam / PORTRAIT_TURBO_ICON_BASE);

	const spinHalf = $derived((UI_BASE_SIZE * spinScale) / 2);
	const smallHalf = $derived((UI_BASE_SIZE * spinSmallScale) / 2);
	const betControlOffsetX = $derived(spinHalf + btn.spinBetGap + smallHalf);
	const utilRowHalf = $derived(
		Math.max(portraitScaleY(btn.utilIconDiam, H), portraitScaleY(26, H)) / 2,
	);

	const hudY = $derived.by(() => {
		void stateGame.gameType;
		void stateUi.freeSpinCounterShow;
		return computePortraitHudY(stateLayoutDerived, spinHalf, utilRowHalf);
	});
	const spinCenterY = $derived(hudY.spinCenterY);
	const Y_UTIL = $derived(hudY.utilCenterY);

	const utilIconHalfX = $derived(scalePortraitX(btn.utilIconDiam) / 2);
	const xInfo = $derived(scalePortraitX(PORTRAIT_UI_LAYOUT.utilX.info));
	const xMenu = $derived(scalePortraitX(PORTRAIT_UI_LAYOUT.utilX.menu));
	const xAutoplay = $derived(scalePortraitX(PORTRAIT_UI_LAYOUT.utilX.autoplay));
	const xTurbo = $derived(scalePortraitX(PORTRAIT_UI_LAYOUT.utilX.turbo));
	const xBalanceBet = $derived.by(() => {
		const rightEdge = isFreeSpins
			? xTurbo - utilIconHalfX
			: xAutoplay - utilIconHalfX;
		return (xMenu + utilIconHalfX + rightEdge) / 2;
	});

	const WIN_WORD_GAP = 10;
	const WIN_TEXT_STYLE = {
		fontFamily: 'proxima-nova',
		fontSize: 28,
		fontWeight: '700' as const,
		fill: 0xffd000,
	};
	const FOOTER_STYLE = {
		fontFamily: 'Arial',
		fontSize: 20,
		fontWeight: '400' as const,
		fill: 0xffffff,
		letterSpacing: 0.4,
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
					anchor={{ x: 1, y: 0.5 }}
					x={-WIN_WORD_GAP}
					eventMode="none"
					text={context.i18nDerived.win().toUpperCase()}
					style={WIN_TEXT_STYLE}
				/>
				<Text
					anchor={{ x: 0, y: 0.5 }}
					x={WIN_WORD_GAP}
					eventMode="none"
					text={formatWinAmount(stateBet.winBookEventAmount)}
					style={WIN_TEXT_STYLE}
				/>
			</Container>
		</MainContainer>
	{/if}

	<MainContainer alignVertical="bottom">
		<!-- Spin-кластер: FS — без Spin (−/+ тоже скрыты); base — − | Spin | + -->
		{#if !isFreeSpins}
			<Container x={W * 0.5} y={spinCenterY}>
				<Container x={-betControlOffsetX} y={0} scale={spinSmallScale}>
					<CashStacksDecreaseButton anchor={0.5} />
				</Container>
				<Container x={0} y={0} scale={spinScale}>
					<CashStacksBetButton anchor={0.5} />
				</Container>
				<Container x={betControlOffsetX} y={0} scale={spinSmallScale}>
					<CashStacksIncreaseButton anchor={0.5} />
				</Container>
			</Container>
		{/if}

		<!-- Нижний ряд: i | ☰ | balance/bet | [автоигра] | turbo -->
		<Container x={xInfo} y={Y_UTIL} scale={utilIconScale}>
			<CashStacksInfoButton anchor={0.5} />
		</Container>
		<Container x={xMenu} y={Y_UTIL} scale={utilIconScale}>
			<CashStacksMenuButton anchor={0.5} />
		</Container>
		<Text
			anchor={0.5}
			x={xBalanceBet}
			y={Y_UTIL}
			eventMode="none"
			text={`${context.i18nDerived.balance()} ${formatAmount(stateBet.balanceAmount)}  ${context.i18nDerived.bet()} ${formatAmount(stateBet.betAmount)}`}
			style={FOOTER_STYLE}
		/>
		{#if !isFreeSpins}
			<Container x={xAutoplay} y={Y_UTIL} scale={utilIconScale}>
				<CashStacksAutoSpinButton anchor={0.5} portraitPill />
			</Container>
		{/if}
		<Container x={xTurbo} y={Y_UTIL} scale={turboScale}>
			<CashStacksTurboButton anchor={0.5} portraitCompact />
		</Container>
	</MainContainer>
</UiFadeContainer>
