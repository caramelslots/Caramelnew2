<!--
	Pixi Canvas Text, but GPU pages stay small.

	Pixi pads each string to nextPow2(measure × resolution). Super Wild
	labels at ~196px × DPR 2–3 become 1024² (4 MB) per style. Bake at a
	capped font size with resolution 1, then scale the object to the
	visual size.
-->
<script lang="ts">
	import { Text } from 'pixi-svelte';
	import type { TextOptions } from 'pixi.js';

	/** Longest edge of the baked glyphs before POT pad — 64px → typically 256×128 (~128 KB), not 4 MB. */
	export const CANVAS_TEXT_MAX_BAKE_PX = 64;

	type Stroke = { color?: number | string; width?: number };

	type Props = TextOptions & {
		maxBakePx?: number;
		onresize?: (sizes: { width: number; height: number }) => void;
	};

	const props: Props = $props();

	const visualSize = $derived(Math.max(1, Number(props.style?.fontSize) || 24));
	const bakeSize = $derived(Math.min(visualSize, props.maxBakePx ?? CANVAS_TEXT_MAX_BAKE_PX));
	const fit = $derived(visualSize / bakeSize);

	const bakeStyle = $derived.by(() => {
		const style = { ...(props.style ?? {}), fontSize: bakeSize };
		const stroke = style.stroke as Stroke | undefined;
		if (stroke && typeof stroke === 'object' && stroke.width != null) {
			style.stroke = {
				...stroke,
				width: Math.max(1, Math.round(Number(stroke.width) * (bakeSize / visualSize))),
			};
		}
		return style;
	});

	const scale = $derived.by(() => {
		const raw = props.scale;
		const sx = typeof raw === 'number' ? raw : (raw?.x ?? 1);
		const sy = typeof raw === 'number' ? raw : (raw?.y ?? 1);
		return { x: sx * fit, y: sy * fit };
	});
</script>

<Text
	{...props}
	style={bakeStyle}
	{scale}
	resolution={1}
/>
