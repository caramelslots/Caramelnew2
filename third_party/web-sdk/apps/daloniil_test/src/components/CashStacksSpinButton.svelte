<!--
	CashStacksSpinButton.svelte — кастомная замена SDK-шной ButtonBet.
	spin_1 — обычный спин; spin_2 — автоигра с счётчиком оставшихся раундов.

	Ref. designer_assets/spin_1.png, spin_2.png
-->
<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBet, stateBetDerived } from 'state-shared';

	import ButtonBetProvider from 'components-ui-pixi/src/components/ButtonBetProvider.svelte';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const disabled = $derived(!stateBetDerived.isBetCostAvailable());
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const hasCounter = $derived(stateBetDerived.hasAutoBetCounter());
	const spriteKey = $derived(hasCounter ? 'spin2' : 'spin1');

	const counterFontSize = $derived.by(() => {
		if (stateBet.autoSpinsCounter === Infinity) return UI_BASE_SIZE * 0.32;
		if (stateBet.autoSpinsCounter > 99) return UI_BASE_SIZE * 0.16;
		if (stateBet.autoSpinsCounter > 9) return UI_BASE_SIZE * 0.22;
		return UI_BASE_SIZE * 0.28;
	});

	/** Optical center inside spin_2 inner ring. */
	const counterOffsetY = UI_BASE_SIZE * 0.012;
</script>

<ButtonBetProvider>
	{#snippet children({ key, onpress })}
		<OnHotkey hotkey="Space" {disabled} {onpress} />
		<Button {...props} {sizes} {onpress} {disabled}>
			{#snippet children({ center })}
				<Container {...center}>
					<Sprite
						key={spriteKey}
						width={sizes.width}
						height={sizes.height}
						anchor={0.5}
						alpha={disabled || ['spin_disabled', 'stop_disabled'].includes(key) ? 0.45 : 1}
					/>
					{#if hasCounter}
						<Text
							anchor={0.5}
							x={0}
							y={counterOffsetY}
							text={stateBet.autoSpinsCounter === Infinity ? '∞' : stateBet.autoSpinsCounter}
							style={{
								align: 'center',
								fontFamily: 'proxima-nova',
								fill: 0xffffff,
								fontWeight: 'bold',
								fontSize: counterFontSize,
								lineHeight: counterFontSize,
							}}
						/>
					{/if}
				</Container>
			{/snippet}
		</Button>
	{/snippet}
</ButtonBetProvider>
