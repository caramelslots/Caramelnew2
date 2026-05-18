<!--
	CashStacksTurboButton.svelte — кастомная замена SDK-шной ButtonTurbo.
	Циклически переключает 3 режима скорости (1 → 2 → 3 → 1) и показывает
	цифрой выбранный уровень. Связан с тем же stateGame.gameSpeed что и
	меню Информация — кнопка в HUD и контрол в меню всегда синхронны.
-->
<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet } from 'state-shared';

	import UiSprite from 'components-ui-pixi/src/components/UiSprite.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';

	const props: { anchor?: number } = $props();
	const context = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const disabled = $derived(stateBet.isSpaceHold);

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		// Cycle 1 → 2 → 3 → 1
		const next = (stateGame.gameSpeed === 3 ? 1 : stateGame.gameSpeed + 1) as 1 | 2 | 3;
		stateGame.gameSpeed = next;
		// SDK работает с бинарным isTurbo. Маппим: 1 = off, 2/3 = on.
		stateBet.isTurbo = next > 1;
	};
</script>

<Button {...props} {sizes} {onpress} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<UiSprite
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				backgroundColor={disabled ? 0xaaaaaa : 0x000000}
				{...stateGame.gameSpeed > 1
					? {
							borderWidth: 8,
							borderColor: 0xffd000,
						}
					: {}}
			/>
			<!-- TURBO label -->
			<Text
				anchor={0.5}
				y={-sizes.height * 0.18}
				text="TURBO"
				style={{
					align: 'center',
					fontFamily: 'proxima-nova',
					fontWeight: '700',
					fontSize: UI_BASE_FONT_SIZE * 0.65,
					fill: 0xffffff,
				}}
			/>
			<!--
				Индикатор уровня — большая цифра 1/2/3 под TURBO label.
				Жёлтая для активных уровней (2/3), белая для дефолта (1).
			-->
			<Text
				anchor={0.5}
				y={sizes.height * 0.18}
				text={String(stateGame.gameSpeed)}
				style={{
					align: 'center',
					fontFamily: 'proxima-nova',
					fontWeight: '900',
					fontSize: UI_BASE_FONT_SIZE * 1.5,
					fill: stateGame.gameSpeed > 1 ? 0xffd000 : 0xffffff,
				}}
			/>
		</Container>
	{/snippet}
</Button>
