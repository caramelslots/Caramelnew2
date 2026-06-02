<!--
	CashStacksMenuButton.svelte — квадратная кнопка-бургер (меню настроек).
	Ref. designer_assets/IMAGE 2026-06-02 13:12:00 — тёмный скруглённый квадрат, ☰.
-->
<script lang="ts">
	import { Container, Rectangle } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateUi } from 'state-shared';

	import UiSprite from 'components-ui-pixi/src/components/UiSprite.svelte';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { getContext } from '../game/context';

	const props: { anchor?: number } = $props();
	const context = getContext();
	const size = UI_BASE_SIZE * 0.72;
	const sizes = { width: size, height: size };
	const lineW = size * 0.38;
	const lineH = Math.max(3, size * 0.05);
	const lineGap = size * 0.14;

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = true;
	};
</script>

<Button {...props} {sizes} {onpress}>
	{#snippet children({ center })}
		<Container {...center}>
			<UiSprite
				width={size}
				height={size}
				anchor={0.5}
				backgroundColor={0x2e2e2e}
				borderRadius={size * 0.22}
			/>
			{#each [-lineGap, 0, lineGap] as dy}
				<Rectangle
					anchor={0.5}
					y={dy}
					width={lineW}
					height={lineH}
					borderRadius={lineH / 2}
					backgroundColor={0xffffff}
				/>
			{/each}
		</Container>
	{/snippet}
</Button>
