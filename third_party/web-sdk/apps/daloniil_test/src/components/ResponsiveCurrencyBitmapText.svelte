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
		}),
	);

	const labelText = $derived(parts.label.trimEnd());
	const hasLabel = $derived(labelText.length > 0);

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
			parts.symbol,
			hasLabel ? '1' : '0',
			parts.before ? '1' : '0',
			parts.after ? '1' : '0',
		].join('|'),
	);

	const isLayoutReady = $derived(
		totalWidth > 0 &&
			(!hasLabel || labelWidth > 0) &&
			(!parts.before || beforeWidth > 0) &&
			(!parts.symbol || symbolWidth > 0) &&
			(!parts.after || afterWidth > 0),
	);

	$effect.pre(() => {
		structureKey;
		labelWidth = 0;
		beforeWidth = 0;
		symbolWidth = 0;
		afterWidth = 0;
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
					labelWidth = s.width;
				}}
			/>
		{/if}
		{#if parts.before}
			<BitmapText
				text={parts.before}
				style={{ ...layoutStyle, fontFamily: digitFont }}
				onresize={(s) => {
					beforeWidth = s.width;
				}}
			/>
		{/if}
		{#if parts.symbol}
			<BitmapText
				text={parts.symbol}
				style={{ ...layoutStyle, fontFamily: FONT_BABLO }}
				onresize={(s) => {
					symbolWidth = s.width;
				}}
			/>
		{/if}
		{#if parts.after}
			<BitmapText
				text={parts.after}
				style={{ ...layoutStyle, fontFamily: digitFont }}
				onresize={(s) => {
					afterWidth = s.width;
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
					style={{ ...layoutStyle, fontFamily: FONT_BABLO }}
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
