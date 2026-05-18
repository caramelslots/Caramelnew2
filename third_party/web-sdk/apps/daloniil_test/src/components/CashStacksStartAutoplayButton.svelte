<!--
	CashStacksStartAutoplayButton.svelte — кастомная замена ButtonBet,
	которая рендерится в позиции центральной кнопки спина, КОГДА открыта
	модалка автоигры (stateModal.modal?.name === 'autoSpin').
	Клик по ней запускает автоигру с текущими выбранными параметрами,
	визуально выглядит как обычная Spin-кнопка чтобы игроку было понятно
	что это та же кнопка только в режиме "стартовать автоигру".
-->
<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import {
		stateUi,
		stateBet,
		stateBetDerived,
		stateModal,
		AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP,
		AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP,
	} from 'state-shared';
	// Импорт UiSprite напрямую — даёт нам тот же спрайт что у ButtonBet
	// (см. ButtonBet.svelte → key="bet"), чтобы кнопка выглядела идентично.
	import UiSprite from 'components-ui-pixi/src/components/UiSprite.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { getContext } from '../game/context';
	// Используем единый источник правды для значений раундов (см.
	// FeaturesAutoSpinOverlay.svelte — там тот же helper).
	import { getRoundsCounter } from '../game/autoplay';

	const props: { anchor?: number } = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const disabled = $derived(!stateBetDerived.isBetCostAvailable());

	const startAutoplay = () => {
		stateBet.autoSpinsCounter = getRoundsCounter(stateUi.autoSpinsText);
		stateBet.autoSpinsLossLimitAmount =
			stateBet.betAmount * AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsLossLimitText];
		stateBet.autoSpinsSingleWinLimitAmount =
			stateBet.betAmount *
			AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsSingleWinLimitText];
		if (stateBetDerived.activeBetMode().type === 'buy') stateBet.activeBetModeKey = 'BASE';
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		context.eventEmitter.broadcast({ type: 'autoBet' });
		stateModal.modal = null;
	};
</script>

<Button {...props} {sizes} onpress={startAutoplay} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<UiSprite
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				backgroundColor={disabled ? 0xaaaaaa : 0x000000}
			/>
			<Text
				anchor={0.5}
				text="▶"
				style={{
					align: 'center',
					fontFamily: 'proxima-nova',
					fontWeight: '700',
					fontSize: UI_BASE_FONT_SIZE * 1.2,
					fill: 0xffffff,
				}}
			/>
		</Container>
	{/snippet}
</Button>
