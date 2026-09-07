<script lang="ts">
	import * as PIXI from 'pixi.js';

	import { stateI18n } from 'state-shared';

	import { ensureLocaleFontsLoaded, needsLocaleFontLoad } from '../game/localeFonts';
	import { arabicLocaleTextStyle } from '../game/arabicTextStyle';
	import {
		BITMAP_FONT_SCALE,
		FONT_PROSTOI_WHITE,
		FONT_PROSTOI_WHITE_RU,
		FONT_PROSTOI_WHITE_HI,
		FONT_PROSTOI_WHITE_VI,
		FONT_PROSTOI_WHITE_CJK,
		fontForLocale,
		isArabicLocale,
		isCjkLocale,
		localeTextDirection,
		LOCALE_TEXT_FILL_WHITE,
		PRESS_TO_CONTINUE_BOTTOM_OFFSET,
		PRESS_TO_CONTINUE_FONT_SIZE,
		supportsBitmapFont,
	} from '../game/constants';
	import { getContext } from '../game/context';

	let imgEl = $state<HTMLImageElement | undefined>();

	const context = getContext();
	const text = $derived(context.i18nDerived.pressToContinue());
	const locale = $derived(stateI18n.i18n.locale);
	const useBitmap = $derived(supportsBitmapFont(locale));
	const usePixiRender = $derived(useBitmap || isArabicLocale(locale));
	const textDirection = $derived(localeTextDirection(locale));
	const resolvedFontFamily = $derived(
		fontForLocale(FONT_PROSTOI_WHITE, FONT_PROSTOI_WHITE_RU, locale, FONT_PROSTOI_WHITE_HI, FONT_PROSTOI_WHITE_VI, FONT_PROSTOI_WHITE_CJK),
	);
	const needsCustomFont = $derived(needsLocaleFontLoad(locale));

	let localeFontReady = $state(!needsCustomFont);

	const canRender = $derived(useBitmap || (isArabicLocale(locale) && localeFontReady));

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
		if (!usePixiRender || !canRender) return;

		const renderer = context.stateApp.pixiApplication?.renderer;
		if (!renderer || !imgEl) return;

		const ml = context.stateLayoutDerived.mainLayout();
		const fontSize = PRESS_TO_CONTINUE_FONT_SIZE * BITMAP_FONT_SCALE;
		const maxWidth = ml.width * 0.95;

		const container = new PIXI.Container();
		const textNode = useBitmap
			? new PIXI.BitmapText({
					text,
					style: {
						fontFamily: fontForLocale(
							FONT_PROSTOI_WHITE,
							FONT_PROSTOI_WHITE_RU,
							locale,
							FONT_PROSTOI_WHITE_HI,
							FONT_PROSTOI_WHITE_VI,
							FONT_PROSTOI_WHITE_CJK,
						),
						fontSize,
						align: 'center',
						letterSpacing: 2,
					},
				})
			: new PIXI.Text({
					text,
					style: arabicLocaleTextStyle(
						{
							fontFamily: resolvedFontFamily,
							fontSize,
							align: 'center',
							letterSpacing: 0,
						},
						LOCALE_TEXT_FILL_WHITE,
					),
				});

		const scale = Math.min(maxWidth / (textNode.width || 1), 1);
		textNode.scale.set(scale);
		textNode.anchor.set(0.5, 1);

		const w = Math.max(1, Math.ceil(textNode.width));
		const h = Math.max(1, Math.ceil(textNode.height));
		textNode.position.set(w / 2, h);
		container.addChild(textNode);

		const rt = PIXI.RenderTexture.create({ width: w, height: h });
		renderer.render({ container, target: rt });

		const canvas = renderer.extract.canvas(rt);
		imgEl.src = canvas.toDataURL('image/png');
		imgEl.style.width = `${w * ml.scale}px`;
		imgEl.style.height = `${h * ml.scale}px`;

		return () => {
			rt.destroy(true);
			container.destroy({ children: true });
			textNode.destroy();
		};
	});
</script>

{#if usePixiRender && canRender}
	<img bind:this={imgEl} class="press-label" style={positionStyle} alt="" />
{:else if !usePixiRender && localeFontReady}
	<p
		class="press-label press-label--system"
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
		position: fixed;
		transform: translateX(-50%);
		pointer-events: none;
		user-select: none;
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
