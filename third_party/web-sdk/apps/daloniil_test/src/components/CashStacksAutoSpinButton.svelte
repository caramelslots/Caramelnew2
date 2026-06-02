<!--
	CashStacksAutoSpinButton.svelte — кастомная замена SDK-кнопки
	ButtonAutoSpin для Cash Stacks. Имеет три состояния:

	  1. autoSpin modal открыт → красная кнопка с белым крестом,
	     клик закрывает модалку (отмена выбора).
	  2. Автоигра запущена (stateBet.autoSpinsCounter > 0) → стандартный
	     stop autospin (как в SDK).
	  3. Idle → открывает модалку выбора параметров автоигры.

	portraitPill — широкая капсула «автоигра» (ref. portrait mockup).
-->
<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet, stateBetDerived, stateModal } from 'state-shared';

	import UiSprite from 'components-ui-pixi/src/components/UiSprite.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import ButtonBetAutoSpinsCounter from 'components-ui-pixi/src/components/ButtonBetAutoSpinsCounter.svelte';

	import { PORTRAIT_AUTOPLAY_PILL_BASE } from '../game/constants';
	import { getContext } from '../game/context';

	type Props = {
		anchor?: number;
		portraitPill?: boolean;
	};

	const { anchor, portraitPill = false }: Props = $props();
	const context = getContext();

	const sizes = $derived(
		portraitPill
			? { ...PORTRAIT_AUTOPLAY_PILL_BASE }
			: { width: UI_BASE_SIZE, height: UI_BASE_SIZE },
	);

	const isModalOpen = $derived(stateModal.modal?.name === 'autoSpin');
	const hasCounter = $derived(stateBetDerived.hasAutoBetCounter());

	const disabled = $derived.by(() => {
		if (stateBet.isSpaceHold) return true;
		if (isModalOpen) return false;
		if (!context.stateXstateDerived.isIdle() && !hasCounter) return true;
		if (!stateBetDerived.isBetCostAvailable()) return true;
		return false;
	});

	const label = $derived.by(() => {
		if (isModalOpen) return '×';
		if (portraitPill) return context.i18nDerived.autoplayTitle().toLowerCase();
		return 'AUTO';
	});

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isModalOpen) {
			stateModal.modal = null;
		} else if (hasCounter) {
			stateBet.autoSpinsCounter = 0;
		} else {
			stateModal.modal = { name: 'autoSpin' };
		};
	};
</script>

<Button {anchor} {sizes} {onpress} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<UiSprite
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				backgroundColor={isModalOpen ? 0xd32f2f : 0x2e2e2e}
				borderRadius={portraitPill ? sizes.height / 2 : 0}
				{...disabled && !isModalOpen ? { backgroundColor: 0xaaaaaa } : {}}
			/>
			<Text
				anchor={0.5}
				text={label}
				style={{
					align: 'center',
					fontFamily: 'proxima-nova',
					fontWeight: portraitPill ? '600' : '700',
					fontSize: isModalOpen
						? UI_BASE_FONT_SIZE * (portraitPill ? 1.4 : 1.8)
						: portraitPill
							? sizes.height * 0.38
							: UI_BASE_FONT_SIZE * 0.9,
					fill: 0xffffff,
				}}
			/>
			{#if hasCounter && !isModalOpen}
				<Container x={0} y={0}>
					<ButtonBetAutoSpinsCounter />
				</Container>
			{/if}
		</Container>
	{/snippet}
</Button>
