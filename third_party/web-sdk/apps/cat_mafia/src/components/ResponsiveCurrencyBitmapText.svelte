<script lang="ts">
	import { Container, BitmapText, type BitmapTextProps } from 'pixi-svelte';
	import { stateBet, stateI18n } from 'state-shared';

	import { amountToLayoutParts } from '../game/currencyTextSegments';
	import { devPreview } from '../game/devPreview.svelte';
	import {
		FONT_BABLO,
		FONT_KRUTOI,
		FONT_MEOWFIA_BIGER,
		FONT_PROSTOI,
		FONT_PROSTOI_RU,
		FONT_PROSTOI_HI,
		FONT_PROSTOI_VI,
		FONT_PROSTOI_CJK,
		fontForLocale,
		LOCALE_TEXT_FILL_GOLD,
	} from '../game/constants';
	import LocaleGlyph from './LocaleGlyph.svelte';

	type BodyFontVariant = 'krutoi' | 'prostoi' | 'meowfiaBiger';

	type Props = Omit<BitmapTextProps, 'text' | 'style' | 'scale' | 'onresize'> & {
		maxWidth: number;
		amount: number;
		bookEvent?: boolean;
		prefix?: string;
		/** prostoi = small wins / HUD; krutoi = default overlays; meowfiaBiger = Big/Total Win. */
		bodyFontVariant?: BodyFontVariant;
		/** Gap between label prefix and amount (layout px, before responsive scale). */
		labelGap?: number;
		/** Minimum scale when the full string exceeds maxWidth. */
		minScale?: number;
		style: Omit<NonNullable<BitmapTextProps['style']>, 'fontFamily'>;
	};

	const props: Props = $props();

	const parts = $derived(
		amountToLayoutParts(props.amount, {
			bookEvent: props.bookEvent,
			prefix: props.prefix,
			fractionDigits: devPreview.winForceFractionDigits,
		}),
	);

	const labelText = $derived(parts.label.trimEnd());
	const hasLabel = $derived(labelText.length > 0);

	const bodyVariant = $derived(props.bodyFontVariant ?? 'krutoi');

	/** Digits/separators: latin bitmap chosen by variant (not locale prostoi atlases). */
	const digitFont = $derived(
		bodyVariant === 'prostoi'
			? FONT_PROSTOI
			: bodyVariant === 'meowfiaBiger'
				? FONT_MEOWFIA_BIGER
				: FONT_KRUTOI,
	);

	/**
	 * Currency glyph: Meowfia Biger for Big/Total Win (includes `$`);
	 * bablo otherwise (full multi-currency set).
	 */
	const symbolFont = $derived(
		bodyVariant === 'meowfiaBiger' ? FONT_MEOWFIA_BIGER : FONT_BABLO,
	);

	/** Localised labels (e.g. HUD "WIN") use prostoi per locale; display variants stay latin. */
	const labelFont = $derived(
		bodyVariant === 'prostoi'
			? fontForLocale(
					FONT_PROSTOI,
					FONT_PROSTOI_RU,
					stateI18n.i18n.locale,
					FONT_PROSTOI_HI,
					FONT_PROSTOI_VI,
					FONT_PROSTOI_CJK,
				)
			: bodyVariant === 'meowfiaBiger'
				? FONT_MEOWFIA_BIGER
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
	/** Last measured string lengths — ignore proportional glyph jitter at same length. */
	let labelMeasureLen = $state(-1);
	let beforeMeasureLen = $state(-1);
	let symbolMeasureLen = $state(-1);
	let afterMeasureLen = $state(-1);

	const labelGapPx = $derived(
		props.labelGap ?? (props.style.fontSize ?? 24) * (hasLabel ? 0.38 : 0),
	);
	const minFitScale = $derived(props.minScale ?? 0.45);

	const totalWidth = $derived(
		labelWidth + labelGapPx + beforeWidth + symbolWidth + afterWidth,
	);
	const responsiveScale = $derived(
		totalWidth > 0 ? Math.min(Math.max(props.maxWidth / totalWidth, minFitScale), 1) : 1,
	);

	const beforeX = $derived(labelWidth + labelGapPx);
	const symbolX = $derived(beforeX + beforeWidth);
	const afterX = $derived(symbolX + symbolWidth);
	const pivotX = $derived(totalWidth * anchorX);

	/**
	 * Remount / width-reset only when layout *structure* changes — not on every
	 * count-up tick. Updating BitmapText.text in place keeps FPS stable on phones.
	 */
	const structureKey = $derived(
		[
			labelText,
			stateBet.currency,
			stateI18n.i18n.locale,
			labelGapPx,
			minFitScale,
			props.style.fontSize,
			digitFont,
			symbolFont,
			parts.symbol,
			hasLabel ? '1' : '0',
			parts.before ? '1' : '0',
			parts.after ? '1' : '0',
			devPreview.winForceFractionDigits ?? 'auto',
		].join('|'),
	);

	const isLayoutReady = $derived(
		totalWidth > 0 &&
			(!hasLabel || labelWidth > 0) &&
			(!parts.before || beforeWidth > 0) &&
			(!parts.symbol || symbolWidth > 0) &&
			(!parts.after || afterWidth > 0),
	);

	/** Apply measure: grow on longer/wider text, never shrink (avoids L/R jitter). */
	const commitWidth = (
		kind: 'label' | 'before' | 'symbol' | 'after',
		text: string,
		width: number,
	) => {
		const len = text.length;
		if (kind === 'label') {
			if (len < labelMeasureLen) return;
			labelMeasureLen = len;
			if (width > labelWidth) labelWidth = width;
		} else if (kind === 'before') {
			if (len < beforeMeasureLen) return;
			beforeMeasureLen = len;
			if (width > beforeWidth) beforeWidth = width;
		} else if (kind === 'symbol') {
			if (len < symbolMeasureLen) return;
			symbolMeasureLen = len;
			if (width > symbolWidth) symbolWidth = width;
		} else {
			if (len < afterMeasureLen) return;
			afterMeasureLen = len;
			if (width > afterWidth) afterWidth = width;
		}
	};

	$effect.pre(() => {
		structureKey;
		labelWidth = 0;
		beforeWidth = 0;
		symbolWidth = 0;
		afterWidth = 0;
		labelMeasureLen = -1;
		beforeMeasureLen = -1;
		symbolMeasureLen = -1;
		afterMeasureLen = -1;
	});
</script>

<!-- Hidden measure row — remount only on structureKey, not every amount frame -->
{#key structureKey}
	<Container visible={false}>
		{#if hasLabel}
			<LocaleGlyph
				text={labelText}
				fallbackFill={LOCALE_TEXT_FILL_GOLD}
				style={{ ...layoutStyle, fontFamily: labelFont }}
				onresize={(s) => {
					commitWidth('label', labelText, s.width);
				}}
			/>
		{/if}
		{#if parts.before}
			<BitmapText
				text={parts.before}
				style={{ ...layoutStyle, fontFamily: digitFont }}
				onresize={(s) => {
					commitWidth('before', parts.before, s.width);
				}}
			/>
		{/if}
		{#if parts.symbol}
			<BitmapText
				text={parts.symbol}
				style={{ ...layoutStyle, fontFamily: symbolFont }}
				onresize={(s) => {
					commitWidth('symbol', parts.symbol, s.width);
				}}
			/>
		{/if}
		{#if parts.after}
			<BitmapText
				text={parts.after}
				style={{ ...layoutStyle, fontFamily: digitFont }}
				onresize={(s) => {
					commitWidth('after', parts.after, s.width);
				}}
			/>
		{/if}
	</Container>
{/key}

{#if isLayoutReady}
	<Container
		x={props.x}
		y={props.y}
		eventMode={props.eventMode}
		zIndex={props.zIndex}
	>
		<Container scale={responsiveScale} pivot={{ x: pivotX, y: 0 }}>
			{#if hasLabel}
				<LocaleGlyph
					x={0}
					y={0}
					anchor={{ x: 0, y: anchorY }}
					text={labelText}
					fallbackFill={LOCALE_TEXT_FILL_GOLD}
					style={{ ...layoutStyle, fontFamily: labelFont }}
				/>
			{/if}
			{#if parts.before}
				<BitmapText
					x={beforeX}
					y={0}
					anchor={{ x: 0, y: anchorY }}
					text={parts.before}
					style={{ ...layoutStyle, fontFamily: digitFont }}
				/>
			{/if}
			{#if parts.symbol}
				<BitmapText
					x={symbolX}
					y={0}
					anchor={{ x: 0, y: anchorY }}
					text={parts.symbol}
					style={{ ...layoutStyle, fontFamily: symbolFont }}
				/>
			{/if}
			{#if parts.after}
				<BitmapText
					x={afterX}
					y={0}
					anchor={{ x: 0, y: anchorY }}
					text={parts.after}
					style={{ ...layoutStyle, fontFamily: digitFont }}
				/>
			{/if}
		</Container>
	</Container>
{/if}
