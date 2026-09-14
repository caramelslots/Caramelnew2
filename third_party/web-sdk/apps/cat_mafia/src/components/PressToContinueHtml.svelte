<script lang="ts">
	import { stateI18n } from 'state-shared';

	import { ensureLocaleFontsLoaded, needsLocaleFontLoad } from '../game/localeFonts';
	import { bakeBitmapLabel } from '../game/bakeBitmapLabel';
	import {
		BITMAP_FONT_SCALE,
		FONT_PROSTOI_WHITE,
		FONT_PROSTOI_WHITE_CJK,
		FONT_PROSTOI_WHITE_HI,
		FONT_PROSTOI_WHITE_RU,
		FONT_PROSTOI_WHITE_VI,
		fontForLocale,
		htmlLabelFontFamily,
		isArabicLocale,
		isCjkLocale,
		localeTextDirection,
		LOCALE_TEXT_FILL_WHITE,
		PRESS_TO_CONTINUE_BOTTOM_OFFSET,
		PRESS_TO_CONTINUE_FONT_SIZE,
		supportsBitmapFont,
	} from '../game/constants';
	import { getContext } from '../game/context';

	type Props = {
		/** Position inside the intro panel so the label moves with the lift. */
		contained?: boolean;
	};

	const props: Props = $props();

	const context = getContext();
	const text = $derived(context.i18nDerived.pressToContinue());
	const locale = $derived(stateI18n.i18n.locale);
	const textDirection = $derived(localeTextDirection(locale));
	const resolvedFontFamily = $derived(htmlLabelFontFamily(locale));
	const bitmapFontFamily = $derived(
		fontForLocale(
			FONT_PROSTOI_WHITE,
			FONT_PROSTOI_WHITE_RU,
			locale,
			FONT_PROSTOI_WHITE_HI,
			FONT_PROSTOI_WHITE_VI,
			FONT_PROSTOI_WHITE_CJK,
		),
	);
	const needsCustomFont = $derived(needsLocaleFontLoad(locale));
	const useBitmap = $derived(supportsBitmapFont(locale));

	let localeFontReady = $state(true);
	let canvasEl = $state<HTMLCanvasElement | undefined>();
	let bitmapReady = $state(false);
	let bakeAttempted = $state(false);

	$effect(() => {
		if (!needsCustomFont) {
			localeFontReady = true;
			return;
		}
		localeFontReady = false;
		let cancelled = false;
		ensureLocaleFontsLoaded(locale).then(() => {
			if (!cancelled) localeFontReady = true;
		});
		return () => {
			cancelled = true;
		};
	});

	const positionStyle = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const bottom = PRESS_TO_CONTINUE_BOTTOM_OFFSET * ml.scale;
		return `left:${ml.x}px;bottom:${bottom}px;max-width:${ml.width * ml.scale * 0.95}px;`;
	});

	const systemFontSize = $derived(
		PRESS_TO_CONTINUE_FONT_SIZE * BITMAP_FONT_SCALE * context.stateLayoutDerived.mainLayout().scale,
	);

	$effect(() => {
		if (!useBitmap) {
			bitmapReady = false;
			bakeAttempted = false;
			return;
		}
		if (!canvasEl) return;

		context.stateApp.loaded;
		const ml = context.stateLayoutDerived.mainLayout();
		const ok = bakeBitmapLabel(canvasEl, {
			text,
			fontFamily: bitmapFontFamily,
			fontSize: PRESS_TO_CONTINUE_FONT_SIZE * BITMAP_FONT_SCALE,
			letterSpacing: 2,
			maxWidth: ml.width * 0.95,
			displayScale: ml.scale,
		});
		bitmapReady = ok;
		bakeAttempted = true;
	});
</script>

{#if useBitmap}
	<canvas
		bind:this={canvasEl}
		class="press-label"
		class:press-label--contained={props.contained}
		class:press-label--ready={bitmapReady}
		style={positionStyle}
		aria-hidden="true"
	></canvas>
	{#if bakeAttempted && !bitmapReady && localeFontReady}
		<p
			class="press-label press-label--system"
			class:press-label--contained={props.contained}
			class:press-label--cjk={isCjkLocale(locale)}
			class:press-label--arabic={isArabicLocale(locale)}
			style={positionStyle}
			dir={textDirection}
			lang={locale}
		>
			{text}
		</p>
	{/if}
{:else if localeFontReady}
	<p
		class="press-label press-label--system"
		class:press-label--contained={props.contained}
		class:press-label--cjk={isCjkLocale(locale)}
		class:press-label--arabic={isArabicLocale(locale)}
		style={positionStyle}
		dir={textDirection}
		lang={locale}
	>
		{text}
	</p>
{/if}

<style lang="scss">
	.press-label {
		z-index: 46;
		transform: translateX(-50%);
		pointer-events: none;
		user-select: none;
	}

	.press-label--contained {
		position: absolute;
	}

	.press-label:not(.press-label--contained) {
		position: fixed;
	}

	canvas.press-label {
		display: block;
		opacity: 0;
	}

	canvas.press-label--ready {
		opacity: 1;
	}

	.press-label--system {
		margin: 0;
		padding: 0;
		text-align: center;
		font-family: v-bind(resolvedFontFamily);
		font-size: v-bind('`${systemFontSize}px`');
		font-weight: 700;
		letter-spacing: 0.08em;
		color: v-bind(LOCALE_TEXT_FILL_WHITE);
		text-transform: uppercase;
		line-height: 1.2;
	}

	.press-label--cjk {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 700;
	}

	.press-label--arabic {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 500;
	}
</style>
