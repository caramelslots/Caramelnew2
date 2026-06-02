<!--
	CashStacksTurboButton.svelte — кастомная замена SDK-шной ButtonTurbo.
	Циклически переключает 3 режима скорости (1 → 2 → 3 → 1).

	portraitCompact — круг с молнией (ref. portrait mockup).
-->
<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet } from 'state-shared';

	import UiSprite from 'components-ui-pixi/src/components/UiSprite.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { PORTRAIT_UTIL_ICON_BASE } from '../game/constants';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';

	type Props = {
		anchor?: number;
		portraitCompact?: boolean;
	};

	const { anchor, portraitCompact = false }: Props = $props();
	const context = getContext();

	const size = $derived(portraitCompact ? PORTRAIT_UTIL_ICON_BASE : UI_BASE_SIZE);
	const sizes = $derived({ width: size, height: size });
	const disabled = $derived(stateBet.isSpaceHold);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const next = (stateGame.gameSpeed === 3 ? 1 : stateGame.gameSpeed + 1) as 1 | 2 | 3;
		stateGame.gameSpeed = next;
		stateBet.isTurbo = next > 1;
	};
</script>

<Button {anchor} {sizes} {onpress} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<UiSprite
				width={size}
				height={size}
				anchor={0.5}
				backgroundColor={disabled ? 0xaaaaaa : 0x2e2e2e}
				borderRadius={portraitCompact ? size / 2 : 0}
				{...!portraitCompact && stateGame.gameSpeed > 1
					? { borderWidth: 8, borderColor: 0xffd000 }
					: {}}
				{...portraitCompact && stateGame.gameSpeed > 1
					? { borderWidth: 3, borderColor: 0xffd000 }
					: {}}
			/>
			{#if portraitCompact}
				<Text
					anchor={0.5}
					text="⚡"
					style={{
						align: 'center',
						fontSize: size * 0.42,
						fill: stateGame.gameSpeed > 1 ? 0xffd000 : 0xffffff,
					}}
				/>
			{:else}
				<Text
					anchor={0.5}
					y={-size * 0.18}
					text="TURBO"
					style={{
						align: 'center',
						fontFamily: 'proxima-nova',
						fontWeight: '700',
						fontSize: UI_BASE_FONT_SIZE * 0.65,
						fill: 0xffffff,
					}}
				/>
				<Text
					anchor={0.5}
					y={size * 0.18}
					text={String(stateGame.gameSpeed)}
					style={{
						align: 'center',
						fontFamily: 'proxima-nova',
						fontWeight: '900',
						fontSize: UI_BASE_FONT_SIZE * 1.5,
						fill: stateGame.gameSpeed > 1 ? 0xffd000 : 0xffffff,
					}}
				/>
			{/if}
		</Container>
	{/snippet}
</Button>
