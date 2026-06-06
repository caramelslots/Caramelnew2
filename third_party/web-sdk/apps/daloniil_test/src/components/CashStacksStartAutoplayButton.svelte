<!--
	CashStacksStartAutoplayButton.svelte — кастомная замена ButtonBet,
	которая рендерится в позиции центральной кнопки спина, КОГДА открыта
	модалка автоигры (stateModal.modal?.name === 'autoSpin').
	Клик по ней запускает автоигру с текущими выбранными параметрами.

	Ref. designer_assets/spin_1.png
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import {
		stateUi,
		stateBet,
		stateBetDerived,
		stateModal,
		AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP,
		AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP,
	} from 'state-shared';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { getContext } from '../game/context';
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

<OnHotkey hotkey="Space" {disabled} onpress={startAutoplay} />
<Button {...props} {sizes} onpress={startAutoplay} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite
				key="spin1"
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				alpha={disabled ? 0.45 : 1}
			/>
		</Container>
	{/snippet}
</Button>
