<!--
	CashStacksSpinButton.svelte — кастомная замена SDK-шной ButtonBet.
	spin_1 — обычный спин; spin_2 — автоигра с счётчиком оставшихся раундов.

	Ref. designer_assets/spin_1.png, spin_2.png
-->
<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBet, stateBetDerived, stateUi } from 'state-shared';
	import { stateSlots } from 'utils-slots';

	import ButtonBetProvider from 'components-ui-pixi/src/components/ButtonBetProvider.svelte';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();
	const isFreeSpins = $derived(
		stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow,
	);
	const disabled = $derived(!stateBetDerived.isBetCostAvailable());
	const hasCounter = $derived(stateBetDerived.hasAutoBetCounter());
	let manualSpinHeld = $state(false);
	let reelsWereSpinning = $state(false);

	const isReelsSpinning = $derived(
		stateSlots.isPreSpinning ||
			context.stateGame.board.some((reel) => reel.reelState.motion !== 'stopped'),
	);

	$effect(() => {
		if (isReelsSpinning) reelsWereSpinning = true;
	});

	$effect(() => {
		if (manualSpinHeld && reelsWereSpinning && !isReelsSpinning) {
			manualSpinHeld = false;
			reelsWereSpinning = false;
		}
	});

	$effect(() => {
		if (hasCounter) {
			manualSpinHeld = false;
			reelsWereSpinning = false;
		}
	});

	$effect(() => {
		if (manualSpinHeld && context.stateXstateDerived.isIdle() && !reelsWereSpinning) {
			manualSpinHeld = false;
		}
	});
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
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

{#if !isFreeSpins}
	<ButtonBetProvider>
		{#snippet children({ key, onpress })}
			{@const handlePress = () => {
				if (key === 'spin_default' && !hasCounter) manualSpinHeld = true;
				onpress();
			}}
			<OnHotkey hotkey="Space" {disabled} onpress={handlePress} />
			<Button {...props} {sizes} onpress={handlePress} {disabled}>
				{#snippet children({ center })}
					{@const isDimmed =
						disabled ||
						['spin_disabled', 'stop_disabled'].includes(key) ||
						manualSpinHeld}
					<Container {...center}>
						<Sprite
							key={spriteKey}
							width={sizes.width}
							height={sizes.height}
							anchor={0.5}
							alpha={isDimmed ? 0.45 : 1}
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
{/if}
