<!--
	CashStacksAutoSpinButton.svelte — кастомная замена SDK-кнопки
	ButtonAutoSpin для Cash Stacks. Имеет три состояния:

	  1. autoSpin modal открыт → клик закрывает модалку (вид кнопки без изменений).
	  2. Автоигра запущена → клик останавливает автоигру.
	  3. Idle → открывает модалку выбора параметров автоигры.

	Desktop: designer_assets/autoplay.png + текст «Autoplay».
	Portrait/mobile: designer_assets/autoplay_mobile.png (квадратная иконка).
-->
<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet, stateBetDerived, stateModal } from 'state-shared';

	import { AUTOPLAY_PILL_BASE, PORTRAIT_UTIL_ICON_BASE } from '../game/constants';
	import { getContext } from '../game/context';

	type Props = {
		anchor?: number;
		/** Portrait / mobile — square coin-stack icon instead of pill + label. */
		portraitPill?: boolean;
	};

	const { anchor, portraitPill = false }: Props = $props();
	const context = getContext();

	const sizes = $derived(
		portraitPill
			? { width: PORTRAIT_UTIL_ICON_BASE, height: PORTRAIT_UTIL_ICON_BASE }
			: { ...AUTOPLAY_PILL_BASE },
	);
	const spriteKey = $derived(portraitPill ? 'autoplayMobileButton' : 'autoplayButton');

	const isModalOpen = $derived(stateModal.modal?.name === 'autoSpin');
	const hasCounter = $derived(stateBetDerived.hasAutoBetCounter());

	const disabled = $derived.by(() => {
		if (stateBet.isSpaceHold) return true;
		if (isModalOpen) return false;
		if (!context.stateXstateDerived.isIdle() && !hasCounter) return true;
		if (!stateBetDerived.isBetCostAvailable()) return true;
		return false;
	});

	const showLabel = $derived(!portraitPill);
	const label = $derived(context.i18nDerived.autoplayTitle());

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isModalOpen) {
			stateModal.modal = null;
		} else if (hasCounter) {
			stateBet.autoSpinsCounter = 0;
		} else {
			stateModal.modal = { name: 'autoSpin' };
		}
	};
</script>

<Button {anchor} {sizes} {onpress} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite
				key={spriteKey}
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				alpha={disabled && !isModalOpen ? 0.45 : 1}
			/>
			{#if showLabel}
				<Text
					anchor={0.5}
					text={label}
					style={{
						align: 'center',
						fontFamily: 'proxima-nova',
						fontWeight: '600',
						fontSize: sizes.height * 0.42,
						fill: 0xffffff,
					}}
				/>
			{/if}
		</Container>
	{/snippet}
</Button>
