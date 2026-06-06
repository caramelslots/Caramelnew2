<!--
	CashStacksIncreaseButton.svelte — кастомная замена SDK ButtonIncrease.
	Ref. designer_assets/plus.png
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet, stateBetDerived, stateConfig } from 'state-shared';

	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { getContext } from '../game/context';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const biggest = $derived(stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1]);
	const disabled = $derived(!context.stateXstateDerived.isIdle() || stateBet.betAmount === biggest);

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
			/>
		</Container>
	{/snippet}
</Button>
