<!--
	CashStacksDecreaseButton.svelte — кастомная замена SDK ButtonDecrease.
	Ref. designer_assets/minus.png
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
	const smallest = $derived(stateConfig.betAmountOptions[0]);
	const disabled = $derived(
		!context.stateXstateDerived.isIdle() || stateBet.betAmount === smallest,
	);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });

		const nextSmaller = [...stateConfig.betAmountOptions]
			.sort((a, b) => b - a)
			.find((option) => option < stateBet.betAmount);

		stateBetDerived.setBetAmount(nextSmaller || smallest);
	};
</script>

<Button {...props} {sizes} {onpress} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite
				key="betMinus"
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				alpha={disabled ? 0.45 : 1}
			/>
		</Container>
	{/snippet}
</Button>
