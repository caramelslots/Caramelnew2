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

	type Props = {
		anchor?: number;
		portraitCompact?: boolean;
	};

	const TURBO_KEYS = {
		1: 'turbo1',
		2: 'turbo3',
		3: 'turbo2',
	} as const;

	const { anchor, portraitCompact = false }: Props = $props();
	const context = getContext();

	const size = $derived(portraitCompact ? PORTRAIT_UTIL_ICON_BASE : UI_BASE_SIZE);
	const sizes = $derived({ width: size, height: size });
	const disabled = $derived(stateBet.isSpaceHold);
	const turboKey = $derived(TURBO_KEYS[stateGame.gameSpeed]);

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
			<Sprite key={turboKey} width={size} height={size} anchor={0.5} alpha={disabled ? 0.45 : 1} />
		</Container>
	{/snippet}
</Button>
