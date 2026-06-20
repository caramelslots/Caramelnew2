<!--
	CashStacksMenuButton.svelte — квадратная кнопка-бургер (меню настроек).
	Ref. designer_assets/cash_stacks_sounds/menu.png
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateUi } from 'state-shared';

	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { getContext } from '../game/context';
	import { UI_SPRITE_RENDER, uiScaledSize, type UiSizeScaleProps } from '../game/uiButtonSize';

	const props: { anchor?: number } & UiSizeScaleProps = $props();
	const context = getContext();
	const { width, height, size } = $derived(uiScaledSize(UI_BASE_SIZE * 0.72, props.sizeScale));
	const sizes = $derived({ width, height });

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = !stateUi.menuOpen;
	};
</script>

<Button {...props} {sizes} {onpress}>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite key="menuButton" width={size} height={size} anchor={0.5} {...UI_SPRITE_RENDER} />
		</Container>
	{/snippet}
</Button>
