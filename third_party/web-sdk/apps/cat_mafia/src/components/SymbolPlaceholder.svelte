<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { onMount } from 'svelte';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		oncomplete?: () => void;
	};

	const props: Props = $props();

	const PLACEHOLDER_COLORS: Record<string, number> = {
		bonus: 0xff9a3c,
		mystery: 0x7b3ff2,
	};

	const fillColor = $derived(PLACEHOLDER_COLORS[props.symbolInfo.assetKey] ?? 0xffffff);
	const label = $derived(
		props.symbolInfo.label ?? (props.symbolInfo.assetKey === 'mystery' ? 'M' : '?'),
	);
	const width = $derived(SYMBOL_SIZE * props.symbolInfo.sizeRatios.width);
	const height = $derived(SYMBOL_SIZE * props.symbolInfo.sizeRatios.height);

	onMount(() => {
		props.oncomplete?.();
	});

	$effect(() => {
		props.symbolInfo;
		props.oncomplete?.();
	});
</script>

<Container x={(props.x ?? 0) - width / 2} y={(props.y ?? 0) - height / 2}>
	<Rectangle
		{width}
		{height}
		borderRadius={8}
		backgroundColor={fillColor}
		backgroundAlpha={0.95}
		borderColor={0xffffff}
		borderWidth={2}
		borderAlpha={0.4}
	/>
	<Rectangle
		width={width - 6}
		height={height - 6}
		x={3}
		y={3}
		borderRadius={6}
		backgroundColor={0xffffff}
		backgroundAlpha={0.15}
	/>
	<Text
		text={label}
		x={width / 2}
		y={height / 2}
		anchor={0.5}
		style={{
			fontFamily: 'Arial',
			fontSize: Math.round(height * 0.45),
			fontWeight: 'bold',
			fill: 0xffffff,
			stroke: { color: 0x000000, width: 4 },
		}}
	/>
</Container>
