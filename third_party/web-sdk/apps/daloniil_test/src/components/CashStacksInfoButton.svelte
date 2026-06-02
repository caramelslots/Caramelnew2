<!--
	CashStacksInfoButton.svelte — круглая кнопка «i» (правила игры).
	Ref. designer_assets/IMAGE 2026-06-02 13:12:00 — тёмный круг, белая i.
-->
<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateModal } from 'state-shared';

	import UiSprite from 'components-ui-pixi/src/components/UiSprite.svelte';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	import { getContext } from '../game/context';

	const props: { anchor?: number } = $props();
	const context = getContext();
	const size = UI_BASE_SIZE * 0.72;
	const sizes = { width: size, height: size };

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'gameRules' };
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
				borderRadius={size / 2}
			/>
			<Text
				anchor={0.5}
				text="i"
				style={{
					align: 'center',
					fontFamily: 'proxima-nova',
					fontStyle: 'italic',
					fontWeight: '800',
					fontSize: size * 0.42,
					fill: 0xffffff,
				}}
			/>
		</Container>
	{/snippet}
</Button>
