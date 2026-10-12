<!--
	CashStacksInfoButton.svelte — круглая кнопка «i» (правила игры).
	Ref. designer_assets/buttons/info.png
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateModal } from 'state-shared';

	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { getContext } from '../game/context';
	import { UI_SPRITE_RENDER, uiScaledSize, type UiSizeScaleProps } from '../game/uiButtonSize';

	const props: { anchor?: number } & UiSizeScaleProps = $props();
	const context = getContext();
	const { width, height, size } = $derived(uiScaledSize(UI_BASE_SIZE * 0.72, props.sizeScale));
	const sizes = $derived({ width, height });

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'gameRules' };
	};
</script>

<Button {...props} {sizes} {onpress}>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite key="infoButton" width={size} height={size} anchor={0.5} {...UI_SPRITE_RENDER} />
		</Container>
	{/snippet}
</Button>
