<!--
	UiCashStacksLayout.svelte — кастомный desktop-layout для Cash Stacks.
	Использует SDK-кнопки/лейблы (deep-import из components-ui-pixi), но
	переставляет элементы согласно дизайн-референсу:
	  - BuyBonus  : отдельная кнопка слева (далеко от меню)
	  - Menu      : компактная иконка слева от balance/win/bet bar
	  - Labels    : Balance / Win / Bet — посередине, в один ряд
	  - +/-       : сразу справа от bet
	  - Bet       : большая центральная Spin-кнопка
	  - AutoSpin/Turbo : справа от Spin (rounded order)
	Для не-desktop layout'ов (portrait/landscape/tablet) используем дефолт SDK.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateUi, stateBet, stateModal } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle, Text, anchorToPivot } from 'pixi-svelte';
	import { EnableSpaceHold } from 'components-shared';
	import { numberToCurrencyString, bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import {
		DESKTOP_BASE_SIZE,
		DESKTOP_BACKGROUND_WIDTH_LIST,
	} from 'components-ui-pixi/src/constants';
	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';
	import LayoutPortrait from 'components-ui-pixi/src/components/LayoutPortrait.svelte';
	import LayoutLandscape from 'components-ui-pixi/src/components/LayoutLandscape.svelte';
	import LayoutTablet from 'components-ui-pixi/src/components/LayoutTablet.svelte';
	import LabelBalance from 'components-ui-pixi/src/components/LabelBalance.svelte';
	import LabelWin from 'components-ui-pixi/src/components/LabelWin.svelte';
	import LabelBet from 'components-ui-pixi/src/components/LabelBet.svelte';
	import ButtonPayTable from 'components-ui-pixi/src/components/ButtonPayTable.svelte';
	import ButtonGameRules from 'components-ui-pixi/src/components/ButtonGameRules.svelte';
	import ButtonSettings from 'components-ui-pixi/src/components/ButtonSettings.svelte';
	import ButtonBuyBonus from 'components-ui-pixi/src/components/ButtonBuyBonus.svelte';
	import ButtonBet from 'components-ui-pixi/src/components/ButtonBet.svelte';
	import ButtonTurbo from 'components-ui-pixi/src/components/ButtonTurbo.svelte';
	// SDK-шный ButtonAutoSpin/ButtonTurbo не используем — заменены на кастомные.
	// Старт автоигры по клику на Spin кнопку (CashStacksStartAutoplayButton
	// рендерится вместо ButtonBet когда modal open).
	import CashStacksAutoSpinButton from './CashStacksAutoSpinButton.svelte';
	import CashStacksStartAutoplayButton from './CashStacksStartAutoplayButton.svelte';
	import CashStacksTurboButton from './CashStacksTurboButton.svelte';
	import ButtonIncrease from 'components-ui-pixi/src/components/ButtonIncrease.svelte';
	import ButtonDecrease from 'components-ui-pixi/src/components/ButtonDecrease.svelte';
	import ButtonMenu from 'components-ui-pixi/src/components/ButtonMenu.svelte';
	import ButtonMenuClose from 'components-ui-pixi/src/components/ButtonMenuClose.svelte';
	import ButtonSoundSwitch from 'components-ui-pixi/src/components/ButtonSoundSwitch.svelte';

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

	const TOTAL_BAR_WIDTH = DESKTOP_BACKGROUND_WIDTH_LIST.reduce((sum, w) => sum + w, 0);

	// X-coords ВНУТРИ панели (origin = левый край панели после anchorToPivot).
	// Все элементы кроме BuyBonus — внутри одного dark bar.
	//   [BuyBonus]   [ ☰ | Balance | Win | Bet | ± | Spin | A/T ]
	//   (вне bar)              (единый dark bar)
	const X = {
		buyBonus: 130,
		// Все следующие — внутри bar (центрированы по Y_BUTTON).
		menu: 310,
		balanceLabel: 470,
		winLabel: 800,
		// БЕТ — сразу слева от +/- (компактный кластер ставки).
		betLabel: 1240,
		plusMinus: 1360,
		spin: 1490,
		autoTurbo: 1620,
	};

	// Единый dark bar — занимает всю зону кроме BuyBonus.
	const BAR_START_X = 220;
	const BAR_END_X = 1730;
	const BAR_WIDTH = BAR_END_X - BAR_START_X;
	const BAR_HEIGHT = 130;

	const Y_BUTTON = DESKTOP_BASE_SIZE * 0.5;
	// Y для двух-строчных лейблов (label / value).
	const Y_LABEL_TOP = Y_BUTTON - 18;
	const Y_LABEL_BOT = Y_BUTTON + 18;
	// Y для stacked иконок (+/-, AutoSpin/Turbo).
	const Y_STACK_TOP = Y_BUTTON - 36;
	const Y_STACK_BOT = Y_BUTTON + 36;

	// Currency-форматтер для balance/bet значений.
	const formatAmount = (v: number) => numberToCurrencyString(v);
	// Win amount приходит в book event как int (cents), нужен свой форматтер.
	const formatWinAmount = (v: number) => bookEventAmountToCurrencyString(v);

	// WIN в HUD: показываем после setTotalWin, скрываем при следующем bet (winBookEventAmount → 0).
	const showWin = $derived(stateBet.winBookEventAmount > 0);

	const LABEL_STYLE = {
		fontFamily: 'proxima-nova',
		fontSize: 22,
		fontWeight: '600' as const,
		fill: 0xb0a890,
		letterSpacing: 1.5,
	};

	const VALUE_STYLE = {
		fontFamily: 'proxima-nova',
		fontSize: 28,
		fontWeight: '700' as const,
		fill: 0xffffff,
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

		<MainContainer standard alignVertical="bottom">
			<Container
				x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5}
				y={context.stateLayoutDerived.mainLayoutStandard().height - DESKTOP_BASE_SIZE - 10}
				pivot={anchorToPivot({
					anchor: { x: 0.5, y: 0 },
					sizes: { height: DESKTOP_BASE_SIZE, width: TOTAL_BAR_WIDTH },
				})}
			>
				<!-- LEFT (вне dark bar, изолирован): Buy Bonus -->
				<Container x={X.buyBonus} y={Y_BUTTON} scale={0.85}>
					<ButtonBuyBonus anchor={0.5} />
				</Container>

				<!-- SINGLE DARK BAR: фон под всем (от Menu до Auto/Turbo) -->
				<Rectangle
					x={BAR_START_X}
					y={Y_BUTTON - BAR_HEIGHT * 0.5}
					width={BAR_WIDTH}
					height={BAR_HEIGHT}
					borderRadius={20}
					backgroundColor={0x141414}
					backgroundAlpha={0.92}
				/>

				<!-- INSIDE BAR: Menu (hamburger) — всё на одной Y-линии (Y_BUTTON) -->
				<Container x={X.menu} y={Y_BUTTON} scale={0.5}>
					<ButtonMenu anchor={0.5} />
				</Container>

				<!-- БАЛАНС: label + value (две строки, центрированы по Y_BUTTON).
					 eventMode="none" гарантирует что текст не реагирует на клики. -->
				<Text
					anchor={0.5}
					x={X.balanceLabel}
					y={Y_LABEL_TOP}
					eventMode="none"
					text={context.i18nDerived.balance().toUpperCase()}
					style={LABEL_STYLE}
				/>
				<Text
					anchor={0.5}
					x={X.balanceLabel}
					y={Y_LABEL_BOT}
					eventMode="none"
					text={formatAmount(stateBet.balanceAmount)}
					style={VALUE_STYLE}
				/>

				<!-- ВЫИГРЫШ: виден после выигрыша до следующего bet.
					 eventMode="none" — гарантия что лейблы и значения не интерактивны. -->
				{#if showWin}
					<Text
						anchor={0.5}
						x={X.winLabel}
						y={Y_LABEL_TOP}
						eventMode="none"
						text={context.i18nDerived.win().toUpperCase()}
						style={LABEL_STYLE}
					/>
					<Text
						anchor={0.5}
						x={X.winLabel}
						y={Y_LABEL_BOT}
						eventMode="none"
						text={formatWinAmount(stateBet.winBookEventAmount)}
						style={{ ...VALUE_STYLE, fill: 0xffd000 }}
					/>
				{/if}

				<!-- СТАВКА: размещена сразу слева от +/-, чисто display, без кликов. -->
				<Text
					anchor={0.5}
					x={X.betLabel}
					y={Y_LABEL_TOP}
					eventMode="none"
					text={context.i18nDerived.bet().toUpperCase()}
					style={LABEL_STYLE}
				/>
				<Text
					anchor={0.5}
					x={X.betLabel}
					y={Y_LABEL_BOT}
					eventMode="none"
					text={formatAmount(stateBet.betAmount)}
					style={VALUE_STYLE}
				/>

				<!-- +/- STACKED (компактные, scale 0.42): + сверху, - снизу -->
				<Container x={X.plusMinus} y={Y_STACK_TOP} scale={0.42}>
					<ButtonIncrease anchor={0.5} />
				</Container>

				<Container x={X.plusMinus} y={Y_STACK_BOT} scale={0.42}>
					<ButtonDecrease anchor={0.5} />
				</Container>

				<!--
					Spin (центральная кнопка) — внутри бара, на той же Y-линии.
					Когда открыта модалка autoSpin, заменяем визуал ButtonBet на
					CashStacksStartAutoplayButton: ту же кнопку, но onpress →
					startAutoplay (как просил пользователь — кнопка bet = start).
				-->
				<Container x={X.spin} y={Y_BUTTON} scale={0.85}>
					{#if stateModal.modal?.name === 'autoSpin'}
						<CashStacksStartAutoplayButton anchor={0.5} />
					{:else}
						<ButtonBet anchor={0.5} />
					{/if}
				</Container>

				<!-- AutoSpin + Turbo STACKED.
					 CashStacksAutoSpinButton: 3 состояния — open(red X) / running(stop) / idle. -->
				<Container x={X.autoTurbo} y={Y_STACK_TOP} scale={0.42}>
					<CashStacksAutoSpinButton anchor={0.5} />
				</Container>

				<Container x={X.autoTurbo} y={Y_STACK_BOT} scale={0.42}>
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
	<UiFadeContainer>
		<LayoutPortrait>
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
			{#snippet buttonBet(buttonProps)}<ButtonBet {...buttonProps} />{/snippet}
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
		</LayoutPortrait>
	</UiFadeContainer>
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
			{#snippet buttonBet(buttonProps)}<ButtonBet {...buttonProps} />{/snippet}
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
			{#snippet buttonBet(buttonProps)}<ButtonBet {...buttonProps} />{/snippet}
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
