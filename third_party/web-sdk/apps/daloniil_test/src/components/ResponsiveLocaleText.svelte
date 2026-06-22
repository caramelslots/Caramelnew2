<script lang="ts">
	import { Container, type BitmapTextProps } from 'pixi-svelte';

	import LocaleGlyph from './LocaleGlyph.svelte';

	type Props = Omit<BitmapTextProps, 'scale' | 'onresize'> & {
		maxWidth: number;
		fallbackFill?: string | number;
	};

	const { maxWidth, fallbackFill, ...textProps }: Props = $props();
	let baseSizes = $state({ width: 0, height: 0 });
	const responsiveScale = $derived(maxWidth / (baseSizes.width || 1));
</script>

<Container visible={false}>
	<LocaleGlyph
		{...textProps}
		{fallbackFill}
		onresize={(sizes) => (baseSizes = sizes)}
	/>
</Container>

<Container>
	<LocaleGlyph
		{...textProps}
		{fallbackFill}
		scale={Math.min(responsiveScale, 1)}
	/>
</Container>
