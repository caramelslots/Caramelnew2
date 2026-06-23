<script lang="ts">
	import { Container, BitmapText, type BitmapTextProps } from 'pixi-svelte';
	import { stateBet, stateI18n } from 'state-shared';

	import { amountToLayoutParts } from '../game/currencyTextSegments';
	import {
		FONT_BABLO,
		FONT_KRUTOI,
		FONT_PROSTOI,
		FONT_PROSTOI_RU,
		FONT_PROSTOI_HI,
		FONT_PROSTOI_VI,
		FONT_PROSTOI_CJK,
		fontForLocale,
		LOCALE_TEXT_FILL_GOLD,
	} from '../game/constants';
	import LocaleGlyph from './LocaleGlyph.svelte';

	type BodyFontVariant = 'krutoi' | 'prostoi';

	type Props = Omit<BitmapTextProps, 'text' | 'style' | 'scale' | 'onresize'> & {
		maxWidth: number;
		amount: number;
		bookEvent?: boolean;
		prefix?: string;
		/** prostoi for small wins / HUD; krutoi (default) for big-win overlays. */
		bodyFontVariant?: BodyFontVariant;
		style: Omit<NonNullable<BitmapTextProps['style']>, 'fontFamily'>;
	};

	const props: Props = $props();

	const parts = $derived(
		amountToLayoutParts(props.amount, {
			bookEvent: props.bookEvent,
			prefix: props.prefix,
		}),
	);

	const isProstoi = $derived((props.bodyFontVariant ?? 'krutoi') === 'prostoi');

	/** Digits/separators always use the default latin bitmap (not locale variants). */
	const digitFont = $derived(isProstoi ? FONT_PROSTOI : FONT_KRUTOI);

	/** Localised labels (e.g. HUD "WIN") use prostoi per locale; krutoi stays latin. */
	const labelFont = $derived(
		isProstoi
			? fontForLocale(
					FONT_PROSTOI,
					FONT_PROSTOI_RU,
					stateI18n.i18n.locale,
					FONT_PROSTOI_HI,
					FONT_PROSTOI_VI,
					FONT_PROSTOI_CJK,
				)
			: FONT_KRUTOI,
	);

	const layoutStyle = $derived({
		...props.style,
		align: 'left' as const,
	});

	const anchorX = $derived(typeof props.anchor === 'number' ? props.anchor : props.anchor?.x ?? 0);
	const anchorY = $derived(typeof props.anchor === 'number' ? props.anchor : props.anchor?.y ?? 0);

	let labelWidth = $state(0);
	let beforeWidth = $state(0);
	let symbolWidth = $state(0);
	let afterWidth = $state(0);

	const totalWidth = $derived(labelWidth + beforeWidth + symbolWidth + afterWidth);
	const responsiveScale = $derived(
		totalWidth > 0 ? Math.min(props.maxWidth / totalWidth, 1) : 1,
	);

	const beforeX = $derived(labelWidth);
	const symbolX = $derived(labelWidth + beforeWidth);
	const afterX = $derived(labelWidth + beforeWidth + symbolWidth);

	const structureKey = $derived(
		`${props.prefix ?? ''}|${stateBet.currency}|${stateI18n.i18n.locale}`,
	);

	$effect.pre(() => {
		structureKey;
		labelWidth = 0;
		beforeWidth = 0;
		symbolWidth = 0;
		afterWidth = 0;
	});
</script>

<!-- Hidden measure row -->
<Container visible={false}>
	{#if parts.label}
		<LocaleGlyph
			text={parts.label}
			fallbackFill={LOCALE_TEXT_FILL_GOLD}
			style={{ ...layoutStyle, fontFamily: labelFont }}
			onresize={(s) => {
				if (labelWidth !== s.width) labelWidth = s.width;
			}}
		/>
	{/if}
	{#if parts.before}
		<BitmapText
			text={parts.before}
			style={{ ...layoutStyle, fontFamily: digitFont }}
			onresize={(s) => {
				if (beforeWidth !== s.width) beforeWidth = s.width;
			}}
		/>
	{/if}
	{#if parts.symbol}
		<BitmapText
			text={parts.symbol}
			style={{ ...layoutStyle, fontFamily: FONT_BABLO }}
			onresize={(s) => {
				if (symbolWidth !== s.width) symbolWidth = s.width;
			}}
		/>
	{/if}
	{#if parts.after}
		<BitmapText
			text={parts.after}
			style={{ ...layoutStyle, fontFamily: digitFont }}
			onresize={(s) => {
				if (afterWidth !== s.width) afterWidth = s.width;
			}}
		/>
	{/if}
</Container>

<Container
	x={props.x}
	y={props.y}
	scale={responsiveScale}
	eventMode={props.eventMode}
	zIndex={props.zIndex}
>
	{#if parts.label}
		<LocaleGlyph
			x={-totalWidth * anchorX}
			y={0}
			anchor={{ x: 0, y: anchorY }}
			text={parts.label}
			fallbackFill={LOCALE_TEXT_FILL_GOLD}
			style={{ ...layoutStyle, fontFamily: labelFont }}
		/>
	{/if}
	{#if parts.before}
		<BitmapText
			x={beforeX - totalWidth * anchorX}
			y={0}
			anchor={{ x: 0, y: anchorY }}
			text={parts.before}
			style={{ ...layoutStyle, fontFamily: digitFont }}
		/>
	{/if}
	{#if parts.symbol}
		<BitmapText
			x={symbolX - totalWidth * anchorX}
			y={0}
			anchor={{ x: 0, y: anchorY }}
			text={parts.symbol}
			style={{ ...layoutStyle, fontFamily: FONT_BABLO }}
		/>
	{/if}
	{#if parts.after}
		<BitmapText
			x={afterX - totalWidth * anchorX}
			y={0}
			anchor={{ x: 0, y: anchorY }}
			text={parts.after}
			style={{ ...layoutStyle, fontFamily: digitFont }}
		/>
	{/if}
</Container>
