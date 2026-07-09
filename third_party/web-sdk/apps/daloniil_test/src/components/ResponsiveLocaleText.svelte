<script lang="ts">
	import { Container, type BitmapTextProps } from 'pixi-svelte';

	import LocaleGlyph from './LocaleGlyph.svelte';

	type Props = Omit<BitmapTextProps, 'scale' | 'onresize'> & {
		maxWidth: number;
		fallbackFill?: string | number;
	};

	const { maxWidth, fallbackFill, style, ...restTextProps }: Props = $props();
	let baseSizes = $state({ width: 0, height: 0 });

	const fitScale = $derived(Math.min(maxWidth / (baseSizes.width || 1), 1));
	const baseFontSize = $derived(Number(style?.fontSize) || 24);
	const displayStyle = $derived({
		...style,
		fontSize: baseFontSize * fitScale,
	});
</script>

<Container visible={false}>
	<LocaleGlyph
		{...restTextProps}
		{style}
		{fallbackFill}
		onresize={(sizes) => (baseSizes = sizes)}
	/>
</Container>

<Container>
	<LocaleGlyph {...restTextProps} style={displayStyle} {fallbackFill} />
</Container>
