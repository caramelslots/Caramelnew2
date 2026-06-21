<!--
	CashStacksTurboButton.svelte — кастомная замена SDK-шной ButtonTurbo.
	Циклически переключает 3 режима скорости (1 → 2 → 3 → 1).

	Ref. designer_assets/turbo_1.png … turbo_3.png — иконка по уровню скорости.
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet } from 'state-shared';

	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { PORTRAIT_UTIL_ICON_BASE } from '../game/constants';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { isSdkTurboSpin } from '../game/gameSpeed';
	import { UI_SPRITE_RENDER, uiScaledSize, type UiSizeScaleProps } from '../game/uiButtonSize';

	type Props = {
		anchor?: number;
		portraitCompact?: boolean;
	} & UiSizeScaleProps;

	const TURBO_KEYS = {
		1: 'turbo1',
		2: 'turbo2',
		3: 'turbo3',
	} as const;

	const { anchor, portraitCompact = false, sizeScale = 1 }: Props = $props();
	const context = getContext();

	const baseSize = $derived(portraitCompact ? PORTRAIT_UTIL_ICON_BASE : UI_BASE_SIZE);
	const { width, height, size } = $derived(uiScaledSize(baseSize, sizeScale));
	const sizes = $derived({ width, height });
	const disabled = $derived(stateBet.isSpaceHold);
	const turboKey = $derived(TURBO_KEYS[stateGame.gameSpeed]);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const next = (stateGame.gameSpeed === 3 ? 1 : stateGame.gameSpeed + 1) as 1 | 2 | 3;
		stateGame.gameSpeed = next;
		stateBet.isTurbo = isSdkTurboSpin(next);
	};
</script>

<Button {anchor} {sizes} {onpress} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite
				key={turboKey}
				width={size}
				height={size}
				anchor={0.5}
				alpha={disabled ? 0.45 : 1}
				{...UI_SPRITE_RENDER}
			/>
		</Container>
	{/snippet}
</Button>
