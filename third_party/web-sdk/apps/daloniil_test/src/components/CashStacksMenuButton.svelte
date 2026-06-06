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

	const props: { anchor?: number } = $props();
	const context = getContext();
	const size = UI_BASE_SIZE * 0.72;
	const sizes = { width: size, height: size };

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = true;
	};
</script>

<Button {...props} {sizes} {onpress}>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite key="menuButton" width={size} height={size} anchor={0.5} />
		</Container>
	{/snippet}
</Button>
