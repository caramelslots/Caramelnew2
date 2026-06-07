<!--
	UiCashStacksLayout.svelte — кастомный desktop-layout для Cash Stacks.
	Использует SDK-кнопки/лейблы (deep-import из components-ui-pixi), но
	переставляет элементы согласно дизайн-референсу:
	  - BuyBonus  : левый HTML-блок (CashStacksBuyBonusPanel) + Bonus Boost
	  - Menu      : компактная иконка слева от balance/win/bet bar
	  - Labels    : Balance + Bet слева (две строки); Win — под доской по центру
	  - Spin-кластер (desktop): − | Spin | + в правом нижнем углу, одна линия;
	    «автоигра» — под Spin; Turbo — справа от +
	Portrait (mobile) — UiCashStacksPortraitLayout.
	Popout S/L (400×225, 800×450) + desktop — один HUD как на ПК.
	Landscape/tablet — SDK.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateBet, stateUi } from 'state-shared';
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
	import CashStacksIncreaseButton from './CashStacksIncreaseButton.svelte';
	import CashStacksDecreaseButton from './CashStacksDecreaseButton.svelte';
	import ButtonAutoSpin from 'components-ui-pixi/src/components/ButtonAutoSpin.svelte';
	import ButtonMenu from 'components-ui-pixi/src/components/ButtonMenu.svelte';
	import CashStacksMenuButton from './CashStacksMenuButton.svelte';
	import ButtonMenuClose from 'components-ui-pixi/src/components/ButtonMenuClose.svelte';
	import ButtonSoundSwitch from 'components-ui-pixi/src/components/ButtonSoundSwitch.svelte';

	import {
		BOARD_FRAME_OFFSET,
		AUTOPLAY_PILL_BASE,
		DESKTOP_UI_LAYOUT,
		isPopoutViewport,
		isPopoutSmallViewport,
	} from '../game/constants';
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
	const isPopoutSmall = $derived(isPopoutSmallViewport(stateLayoutDerived.canvasSizes()));
	const useDesktopHud = $derived(layoutType === 'desktop' || isPopout);
	const isFreeSpins = $derived(
		stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow,
	);
	const hudLayout = $derived(
		isPopoutSmall
			? {
					utilScale: DESKTOP_UI_LAYOUT.popoutSmall.utilScale,
					spinCluster: {
						...DESKTOP_UI_LAYOUT.spinCluster,
						...DESKTOP_UI_LAYOUT.popoutSmall.spinCluster,
					},
				}
			: {
					utilScale: DESKTOP_UI_LAYOUT.utilScale,
					spinCluster: DESKTOP_UI_LAYOUT.spinCluster,
				},
	);

	const TOTAL_BAR_WIDTH = DESKTOP_BACKGROUND_WIDTH_LIST.reduce((sum, w) => sum + w, 0);

	// X-coords ВНУТРИ панели (origin = левый край панели после anchorToPivot).
	//   [ i | ☰ ] баланс / ставка     WIN (под доской)    [− Spin + / авто]
	// Buy Bonus — CashStacksBuyBonusPanel (HTML, слева от доски).
	const X = $derived(
		isPopoutSmall ? DESKTOP_UI_LAYOUT.popoutSmall.utilX : DESKTOP_UI_LAYOUT.utilX,
	);

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
	const SPIN_CLUSTER = $derived({
		...hudLayout.spinCluster,
		centerYOffset: Y_BUTTON - 74,
	});
	const spinHalf = $derived((UI_BASE_SIZE * SPIN_CLUSTER.spinScale) / 2);
	const smallHalf = $derived((UI_BASE_SIZE * SPIN_CLUSTER.smallScale) / 2);
	const betControlOffsetX = $derived(
		spinHalf + SPIN_CLUSTER.betControlsGap + smallHalf,
	);
	const autoplayHalfW = $derived((AUTOPLAY_PILL_BASE.width * SPIN_CLUSTER.autoplayScale) / 2);
	const autoplayHalfH = $derived((AUTOPLAY_PILL_BASE.height * SPIN_CLUSTER.autoplayScale) / 2);
	const turboHalf = $derived((UI_BASE_SIZE * SPIN_CLUSTER.turboScale) / 2);
	const autoplayOffsetY = $derived(
		spinHalf + SPIN_CLUSTER.autoplayGap + autoplayHalfH,
	);
	const turboOffsetX = $derived(autoplayHalfW + SPIN_CLUSTER.turboGap + turboHalf);
	// Origin кластера = центр Spin (не сдвигаем при FS — turbo остаётся на месте).
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
		fontFamily: 'Arial',
		fontSize: 24,
		fontWeight: '400' as const,
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

{#if useDesktopHud}
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
				<Container x={X.info} y={Y_BUTTON} scale={hudLayout.utilScale}>
					<CashStacksInfoButton anchor={0.5} />
				</Container>
				<Container x={X.menu} y={Y_BUTTON} scale={hudLayout.utilScale}>
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

			<!-- Spin-кластер: FS скрывает −/Spin/+/авто; turbo всегда на том же месте -->
			<Container x={spinClusterCenterX} y={barBottomY + SPIN_CLUSTER.centerYOffset}>
				{#if !isFreeSpins}
					<Container x={-betControlOffsetX} y={0} scale={SPIN_CLUSTER.smallScale}>
						<CashStacksDecreaseButton anchor={0.5} />
					</Container>
					<Container x={0} y={0} scale={SPIN_CLUSTER.spinScale}>
						<CashStacksBetButton anchor={0.5} />
					</Container>
					<Container x={betControlOffsetX} y={0} scale={SPIN_CLUSTER.smallScale}>
						<CashStacksIncreaseButton anchor={0.5} />
					</Container>
					<Container x={0} y={autoplayOffsetY} scale={SPIN_CLUSTER.autoplayScale}>
						<CashStacksAutoSpinButton anchor={0.5} />
					</Container>
				{/if}
				<Container x={turboOffsetX} y={autoplayOffsetY} scale={SPIN_CLUSTER.turboScale}>
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
