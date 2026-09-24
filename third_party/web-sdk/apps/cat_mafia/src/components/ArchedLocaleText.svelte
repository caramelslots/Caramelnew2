<!--
	Shallow circular-arc label for Spine slots — same bow math as
	ArchedRibbonTitle / loader card 1 (archDeg ≈ 34). Arabic stays flat
	(connected script breaks when split into glyphs).
-->
<script lang="ts">
	import { Container, type BitmapTextProps } from 'pixi-svelte';
	import { stateI18n } from 'state-shared';

	import { isArabicLocale } from '../game/constants';
	import LocaleGlyph from './LocaleGlyph.svelte';
	import ResponsiveLocaleText from './ResponsiveLocaleText.svelte';

	type Glyph = { char: string; x: number; y: number; rot: number };

	type Props = {
		text: string;
		maxWidth: number;
		/** Total sweep degrees left→right (loader card 1 uses 34). */
		archDeg?: number;
		/** Extra packing on glyph advances (<1 = tighter). */
		tracking?: number;
		y?: number;
		fallbackFill?: string | number;
		style: NonNullable<BitmapTextProps['style']>;
	};

	const {
		text,
		maxWidth,
		archDeg = 34,
		tracking = 0.92,
		y = 0,
		fallbackFill,
		style,
	}: Props = $props();

	const locale = $derived(stateI18n.i18n.locale);
	const useArch = $derived(!isArabicLocale(locale) && archDeg > 0);

	const baseFontSize = $derived(Number(style.fontSize) || 24);

	const measureWidths = (chars: string[], sizePx: number, pack: number) => {
		const widths: number[] = [];
		if (typeof document !== 'undefined') {
			const ctx = document.createElement('canvas').getContext('2d');
			if (ctx) {
				const family = String(style.fontFamily ?? 'proxima-nova, sans-serif');
				ctx.font = `700 ${sizePx}px ${family}`;
				for (const char of chars) {
					const raw = Math.max(
						ctx.measureText(char === ' ' ? '\u00a0' : char).width,
						sizePx * 0.18,
					);
					widths.push(raw * pack);
				}
				return widths;
			}
		}
		for (let i = 0; i < chars.length; i++) widths.push(sizePx * 0.55 * pack);
		return widths;
	};

	const layout = $derived.by((): { glyphs: Glyph[]; fontSize: number } => {
		const chars = Array.from(text);
		const n = chars.length;
		if (!useArch || n === 0) return { glyphs: [], fontSize: baseFontSize };

		const pack = Math.max(0.04, tracking);
		const naturalWidths = measureWidths(chars, baseFontSize, pack);
		const naturalTotal = naturalWidths.reduce((sum, w) => sum + w, 0);
		const fitScale =
			naturalTotal > 0 ? Math.min(1, Math.max(0.5, maxWidth / naturalTotal)) : 1;
		const fontSize = baseFontSize * fitScale;
		const widths =
			fitScale < 0.999 ? measureWidths(chars, fontSize, pack) : naturalWidths;

		const chord = Math.min(maxWidth, widths.reduce((sum, w) => sum + w, 0));
		const halfRad = (archDeg * Math.PI) / 360;
		const radius = halfRad > 0.001 ? chord / (2 * Math.sin(halfRad)) : chord;

		const total = widths.reduce((sum, w) => sum + w, 0);
		let cursor = -total / 2;
		const glyphs = chars.map((char, i) => {
			const width = widths[i]!;
			const arc = cursor + width * 0.5;
			cursor += width;
			const phi = arc / radius;
			return {
				char,
				x: radius * Math.sin(phi),
				// Peak at y=0; ends drop (+Y) — matches loader ribbon bow.
				y: radius * (1 - Math.cos(phi)),
				rot: phi,
			};
		});

		return { glyphs, fontSize };
	});

	const glyphStyle = $derived({
		...style,
		fontSize: layout.fontSize,
		align: 'center' as const,
	});
</script>

{#if useArch}
	<Container {y}>
		{#each layout.glyphs as glyph, i (i)}
			<Container x={glyph.x} y={glyph.y} rotation={glyph.rot}>
				<LocaleGlyph
					text={glyph.char === ' ' ? '\u00a0' : glyph.char}
					anchor={0.5}
					style={glyphStyle}
					{fallbackFill}
				/>
			</Container>
		{/each}
	</Container>
{:else}
	<ResponsiveLocaleText
		anchor={0.5}
		{y}
		{text}
		{maxWidth}
		{fallbackFill}
		{style}
	/>
{/if}
