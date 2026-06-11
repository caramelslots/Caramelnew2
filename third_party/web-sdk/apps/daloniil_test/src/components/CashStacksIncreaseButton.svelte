<!--
	CashStacksIncreaseButton.svelte — кастомная замена SDK ButtonIncrease.
	Ref. designer_assets/plus.png
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet, stateBetDerived, stateConfig } from 'state-shared';

	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { canIncreaseBet } from '../game/buyBonusBalance';
	import { getContext } from '../game/context';
	import { UI_SPRITE_RENDER, uiScaledSize, type UiSizeScaleProps } from '../game/uiButtonSize';

	const props: Partial<Omit<ButtonProps, 'children'>> & UiSizeScaleProps = $props();
	const context = getContext();
	const { width, height } = $derived(uiScaledSize(UI_BASE_SIZE, props.sizeScale));
	const sizes = $derived({ width, height });
	const disabled = $derived(!context.stateXstateDerived.isIdle() || !canIncreaseBet());

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });

		const nextBigger = [...stateConfig.betAmountOptions]
			.sort((a, b) => a - b)
			.find((option) => option > stateBet.betAmount);

		stateBetDerived.setBetAmount(nextBigger || biggest);
	};
</script>

<Button {...props} {sizes} {onpress} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite
				key="betPlus"
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				alpha={disabled ? 0.45 : 1}
				{...UI_SPRITE_RENDER}
			/>
		</Container>
	{/snippet}
</Button>
