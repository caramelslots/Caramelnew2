<!--
	CashStacksStartAutoplayButton.svelte — кастомная замена ButtonBet,
	которая рендерится в позиции центральной кнопки спина, КОГДА открыта
	модалка автоигры (stateModal.modal?.name === 'autoSpin').
	Клик по ней запускает автоигру с текущими выбранными параметрами.

	Ref. designer_assets/spine_1.png
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateModal } from 'state-shared';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { canAffordSpin } from '../game/buyBonusBalance';
	import { getContext } from '../game/context';
	import { launchCashStacksAutoplay } from '../game/autoplay';
	import { UI_SPRITE_RENDER, uiScaledSize, type UiSizeScaleProps } from '../game/uiButtonSize';

	const props: { anchor?: number } & UiSizeScaleProps = $props();
	const context = getContext();
	const { width, height } = $derived(uiScaledSize(UI_BASE_SIZE, props.sizeScale));
	const sizes = $derived({ width, height });
	const disabled = $derived(!canAffordSpin());

	const startAutoplay = () => {
		launchCashStacksAutoplay((event) => context.eventEmitter.broadcast(event));
	};
</script>

<OnHotkey hotkey="Space" {disabled} onpress={startAutoplay} />
<Button {...props} {sizes} onpress={startAutoplay} {disabled}>
	{#snippet children({ center })}
		<Container {...center}>
			<Sprite
				key="spin1"
				width={sizes.width}
				height={sizes.height}
				anchor={0.5}
				alpha={disabled ? 0.45 : 1}
				{...UI_SPRITE_RENDER}
			/>
		</Container>
	{/snippet}
</Button>
