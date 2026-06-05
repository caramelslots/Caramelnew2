<!--
	UiCashStacksLayout.svelte — кастомный desktop-layout для Cash Stacks.
	Использует SDK-кнопки/лейблы (deep-import из components-ui-pixi), но
	переставляет элементы согласно дизайн-референсу:
	  - BuyBonus  : левый HTML-блок (CashStacksBuyBonusPanel) + Bonus Boost
	  - Menu      : компактная иконка слева от balance/win/bet bar
	  - Labels    : Balance + Bet слева (две строки); Win — под доской по центру
	  - Spin-кластер (desktop): − | Spin | + в правом нижнем углу, одна линия;
	    «автоигра» — под Spin; Turbo — справа от +
	Portrait (Popup S) — UiCashStacksPortraitLayout. Landscape/tablet — SDK.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateBet } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container, Text, anchorToPivot } from 'pixi-svelte';
	import { EnableSpaceHold } from 'components-shared';
	import { numberToCurrencyString, bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import {
		DESKTOP_BASE_SIZE,
		DESKTOP_BACKGROUND_WIDTH_LIST,
		UI_BASE_SIZE,
	} from 'components-ui-pixi/src/constants';
	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';
	import UiCashStacksPortraitLayout from './UiCashStacksPortraitLayout.svelte';
	import LayoutLandscape from 'components-ui-pixi/src/components/LayoutLandscape.svelte';
	import LayoutTablet from 'components-ui-pixi/src/components/LayoutTablet.svelte';
	import LabelBalance from 'components-ui-pixi/src/components/LabelBalance.svelte';
	import LabelWin from 'components-ui-pixi/src/components/LabelWin.svelte';
	import LabelBet from 'components-ui-pixi/src/components/LabelBet.svelte';
	import ButtonPayTable from 'components-ui-pixi/src/components/ButtonPayTable.svelte';
	import CashStacksInfoButton from './CashStacksInfoButton.svelte';
	import ButtonSettings from 'components-ui-pixi/src/components/ButtonSettings.svelte';
	import ButtonBuyBonus from 'components-ui-pixi/src/components/ButtonBuyBonus.svelte';
	import CashStacksBetButton from './CashStacksBetButton.svelte';
	import ButtonTurbo from 'components-ui-pixi/src/components/ButtonTurbo.svelte';
	// SDK-шный ButtonAutoSpin/ButtonTurbo не используем — заменены на кастомные.
	// Старт автоигры по клику на Spin кнопку (CashStacksStartAutoplayButton
	// рендерится вместо ButtonBet когда modal open).
	import CashStacksAutoSpinButton from './CashStacksAutoSpinButton.svelte';
	import CashStacksTurboButton from './CashStacksTurboButton.svelte';
	import ButtonIncrease from 'components-ui-pixi/src/components/ButtonIncrease.svelte';
	import ButtonDecrease from 'components-ui-pixi/src/components/ButtonDecrease.svelte';
	import ButtonAutoSpin from 'components-ui-pixi/src/components/ButtonAutoSpin.svelte';
	import ButtonMenu from 'components-ui-pixi/src/components/ButtonMenu.svelte';
	import CashStacksMenuButton from './CashStacksMenuButton.svelte';
	import ButtonMenuClose from 'components-ui-pixi/src/components/ButtonMenuClose.svelte';
	import ButtonSoundSwitch from 'components-ui-pixi/src/components/ButtonSoundSwitch.svelte';

	import { BOARD_FRAME_OFFSET } from '../game/constants';
	import { isFreeSpinsActive } from '../game/activeFeature';
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
	const isFreeSpins = $derived(isFreeSpinsActive());

	const TOTAL_BAR_WIDTH = DESKTOP_BACKGROUND_WIDTH_LIST.reduce((sum, w) => sum + w, 0);

	// X-coords ВНУТРИ панели (origin = левый край панели после anchorToPivot).
	//   [ i | ☰ ] баланс / ставка     WIN (под доской)    [− Spin + / авто]
	// Buy Bonus — CashStacksBuyBonusPanel (HTML, слева от доски).
	const X = {
		info: 175,
		menu: 248,
		hudText: 298,
	};

	const Y_BUTTON = DESKTOP_BASE_SIZE * 0.5;
	const Y_BALANCE_LINE = Y_BUTTON - 16;
	const Y_BET_LINE = Y_BUTTON + 16;
	// Отступ от низа сетки 5×5 до текста WIN (под фиолетовой рамкой, на «мостовой»).
	const WIN_BELOW_BOARD_GAP = 72;

	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const winHudPos = $derived({
		x: boardLayout.x + BOARD_FRAME_OFFSET.x,
		y: boardLayout.y + boardLayout.height * 0.5 + WIN_BELOW_BOARD_GAP,
	});

	// Spin-кластер: правый нижний угол (ref. designer_assets/IMAGE 2026-06-02 13:12:00).
	const mainLayout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const barBottomY = $derived(mainLayout.height - DESKTOP_BASE_SIZE - 10);
	const SPIN_CLUSTER = {
		rightPad: 210,
		centerYOffset: Y_BUTTON - 74,
		betControlsGap: 14,
		spinScale: 0.85,
		smallScale: 0.48,
		autoplayGap: 12,
		autoplayScale: 0.52,
		turboGap: 8,
		turboScale: 0.38,
	};
	const spinHalf = (UI_BASE_SIZE * SPIN_CLUSTER.spinScale) / 2;
	const smallHalf = (UI_BASE_SIZE * SPIN_CLUSTER.smallScale) / 2;
	const betControlOffsetX = $derived(
		spinHalf + SPIN_CLUSTER.betControlsGap + smallHalf,
	);
	const autoplayHalf = (UI_BASE_SIZE * SPIN_CLUSTER.autoplayScale) / 2;
	const turboHalf = (UI_BASE_SIZE * SPIN_CLUSTER.turboScale) / 2;
	const autoplayOffsetY = $derived(
		spinHalf + SPIN_CLUSTER.autoplayGap + autoplayHalf,
	);
	const turboOffsetX = $derived(autoplayHalf + SPIN_CLUSTER.turboGap + turboHalf);
	// Origin кластера = центр Spin; «+» — самый правый элемент.
	const spinClusterCenterX = $derived(
		mainLayout.width - SPIN_CLUSTER.rightPad - betControlOffsetX - smallHalf,
	);

	// Currency-форматтер для balance/bet значений.
	const formatAmount = (v: number) => numberToCurrencyString(v);
	// Win amount приходит в book event как int (cents), нужен свой форматтер.
	const formatWinAmount = (v: number) => bookEventAmountToCurrencyString(v);

	// WIN в HUD: значение просто появляется (без tween/count-up). Синхронность
	// с доской обеспечивается тем, что setWin-хендлер обновляет
	// stateBet.winBookEventAmount ДО await'а доски — поэтому цифра в баре
	// возникает в момент начала целебрации и совпадает с конечным значением
	// count-up'а на доске. Скрывается на следующем bet'е, когда playBet
	// /onNewGameStart сбрасывают winBookEventAmount → 0.
	const showWin = $derived(stateBet.winBookEventAmount > 0);

	const HUD_LINE_STYLE = {
		fontFamily: 'proxima-nova',
		fontSize: 24,
		fontWeight: '600' as const,
		fill: 0xffffff,
		letterSpacing: 0.5,
	};

	const WIN_WORD_GAP = 10;

	const WIN_TEXT_STYLE = {
		fontFamily: 'proxima-nova',
		fontSize: 28,
		fontWeight: '700' as const,
		fill: 0xffd000,
	};
</script>

<EnableSpaceHold />

{#if layoutType === 'desktop'}
	<UiFadeContainer>
		<!-- Top-left: game name + logo подряд -->
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

		<!-- WIN — тот же MainContainer что Board (game layout), по центру под полем -->
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

		<MainContainer standard alignVertical="bottom">
			<Container
				x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
				y={context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE - 10}
				pivot={anchorToPivot({
					anchor: { x: 0.5, y: 0 },
					sizes: { height: DESKTOP_BASE_SIZE, width: TOTAL_BAR_WIDTH },
				})}
			>
				<!-- Info + Menu — вне dark bar, рядом как на макете -->
				<Container x={X.info} y={Y_BUTTON} scale={0.5}>
					<CashStacksInfoButton anchor={0.5} />
				</Container>
				<Container x={X.menu} y={Y_BUTTON} scale={0.5}>
					<CashStacksMenuButton anchor={0.5} />
				</Container>

				<!-- Баланс и ставка — две строки справа от i / ☰ (как на макете). -->
				<Text
					anchor={{ x: 0, y: 0.5 }}
					x={X.hudText}
					y={Y_BALANCE_LINE}
					eventMode="none"
					text={`${context.i18nDerived.balance()} ${formatAmount(stateBet.balanceAmount)}`}
					style={HUD_LINE_STYLE}
				/>
				<Text
					anchor={{ x: 0, y: 0.5 }}
					x={X.hudText}
					y={Y_BET_LINE}
					eventMode="none"
					text={`${context.i18nDerived.bet()} ${formatAmount(stateBet.betAmount)}`}
					style={HUD_LINE_STYLE}
				/>
			</Container>

			<!-- Spin-кластер: FS — только Bet + Turbo; base — − | Spin | + / автоигра -->
			<Container x={spinClusterCenterX} y={barBottomY + SPIN_CLUSTER.centerYOffset}>
				{#if !isFreeSpins}
					<Container x={-betControlOffsetX} y={0} scale={SPIN_CLUSTER.smallScale}>
						<ButtonDecrease anchor={0.5} />
					</Container>
				{/if}

				<Container x={0} y={0} scale={SPIN_CLUSTER.spinScale}>
					<CashStacksBetButton anchor={0.5} />
				</Container>

				{#if !isFreeSpins}
					<Container x={betControlOffsetX} y={0} scale={SPIN_CLUSTER.smallScale}>
						<ButtonIncrease anchor={0.5} />
					</Container>

					<Container x={0} y={autoplayOffsetY} scale={SPIN_CLUSTER.autoplayScale}>
						<CashStacksAutoSpinButton anchor={0.5} />
					</Container>
				{/if}

				<Container
					x={isFreeSpins ? 0 : turboOffsetX}
					y={autoplayOffsetY}
					scale={SPIN_CLUSTER.turboScale}
				>
					<CashStacksTurboButton anchor={0.5} />
				</Container>
			</Container>
		</MainContainer>

		<!--
			Дефолтное PixiJS-меню (PayTable / GameRules / Settings / Sound)
			заменено на HTML-overlay CashStacksMenuOverlay (см. Game.svelte —
			рендерится вне MainContainer чтобы быть поверх canvas).
		-->
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
{:else if layoutType === 'landscape'}
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
			{#snippet buttonBet(buttonProps)}<CashStacksBetButton {...buttonProps} />{/snippet}
			{#snippet buttonTurbo(buttonProps)}<ButtonTurbo {...buttonProps} />{/snippet}
			{#snippet buttonAutoSpin(buttonProps)}<ButtonAutoSpin {...buttonProps} />{/snippet}
			{#snippet buttonIncrease(buttonProps)}<ButtonIncrease {...buttonProps} />{/snippet}
			{#snippet buttonDecrease(buttonProps)}<ButtonDecrease {...buttonProps} />{/snippet}
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
			{#snippet buttonBet(buttonProps)}<CashStacksBetButton {...buttonProps} />{/snippet}
			{#snippet buttonTurbo(buttonProps)}<ButtonTurbo {...buttonProps} />{/snippet}
			{#snippet buttonAutoSpin(buttonProps)}<ButtonAutoSpin {...buttonProps} />{/snippet}
			{#snippet buttonIncrease(buttonProps)}<ButtonIncrease {...buttonProps} />{/snippet}
			{#snippet buttonDecrease(buttonProps)}<ButtonDecrease {...buttonProps} />{/snippet}
			{#snippet buttonMenu(buttonProps)}<ButtonMenu {...buttonProps} />{/snippet}
			{#snippet buttonMenuClose(buttonProps)}<ButtonMenuClose {...buttonProps} />{/snippet}
			{#snippet buttonPayTable(buttonProps)}<ButtonPayTable {...buttonProps} />{/snippet}
			{#snippet buttonGameRules(buttonProps)}<ButtonGameRules {...buttonProps} />{/snippet}
			{#snippet buttonSettings(buttonProps)}<ButtonSettings {...buttonProps} />{/snippet}
			{#snippet buttonSoundSwitch(buttonProps)}<ButtonSoundSwitch {...buttonProps} />{/snippet}
		</LayoutTablet>
	</UiFadeContainer>
{/if}
