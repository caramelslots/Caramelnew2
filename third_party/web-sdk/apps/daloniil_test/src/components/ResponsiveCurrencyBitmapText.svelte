<script lang="ts">
	import { Container, BitmapText, type BitmapTextProps } from 'pixi-svelte';
	import { stateBet, stateI18n } from 'state-shared';

	import { amountToLayoutParts } from '../game/currencyTextSegments';
	import {
		FONT_BABLO,
		FONT_KRUTOI,
		FONT_KRUTOI_RU,
		fontForLocale,
	} from '../game/constants';

	type Props = Omit<BitmapTextProps, 'text' | 'style' | 'scale' | 'onresize'> & {
		maxWidth: number;
		amount: number;
		bookEvent?: boolean;
		prefix?: string;
		style: Omit<NonNullable<BitmapTextProps['style']>, 'fontFamily'>;
	};

	const props: Props = $props();

	const parts = $derived(
		amountToLayoutParts(props.amount, {
			bookEvent: props.bookEvent,
			prefix: props.prefix,
		}),
	);

	const bodyFont = $derived(
		fontForLocale(FONT_KRUTOI, FONT_KRUTOI_RU, stateI18n.i18n.locale),
	);

	const layoutStyle = $derived({
		...props.style,
		align: 'left' as const,
	});

	const anchorX = $derived(typeof props.anchor === 'number' ? props.anchor : props.anchor?.x ?? 0);
	const anchorY = $derived(typeof props.anchor === 'number' ? props.anchor : props.anchor?.y ?? 0);

	let beforeWidth = $state(0);
	let symbolWidth = $state(0);
	let afterWidth = $state(0);

	const totalWidth = $derived(beforeWidth + symbolWidth + afterWidth);
	const responsiveScale = $derived(
		totalWidth > 0 ? Math.min(props.maxWidth / totalWidth, 1) : 1,
	);

	const symbolX = $derived(beforeWidth);
	const afterX = $derived(beforeWidth + symbolWidth);

	const structureKey = $derived(
		`${props.prefix ?? ''}|${stateBet.currency}|${stateI18n.i18n.locale}`,
	);

	$effect.pre(() => {
		structureKey;
		beforeWidth = 0;
		symbolWidth = 0;
		afterWidth = 0;
	});
</script>

<!-- Hidden measure row -->
<Container visible={false}>
	{#if parts.before}
		<BitmapText
			text={parts.before}
			style={{ ...layoutStyle, fontFamily: bodyFont }}
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
			style={{ ...layoutStyle, fontFamily: bodyFont }}
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
	{#if parts.before}
		<BitmapText
			x={-totalWidth * anchorX}
			y={0}
			anchor={{ x: 0, y: anchorY }}
			text={parts.before}
			style={{ ...layoutStyle, fontFamily: bodyFont }}
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
			style={{ ...layoutStyle, fontFamily: bodyFont }}
		/>
	{/if}
</Container>
