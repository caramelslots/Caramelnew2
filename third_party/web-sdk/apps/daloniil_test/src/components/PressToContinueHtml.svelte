<script lang="ts">
	import * as PIXI from 'pixi.js';

	import { stateI18n } from 'state-shared';

	import { ensureCjkFontLoaded } from '../game/cjkFont';
	import {
		BITMAP_FONT_SCALE,
		FONT_PROSTOI_WHITE,
		FONT_PROSTOI_WHITE_RU,
		FONT_PROSTOI_WHITE_HI,
		fontForLocale,
		isCjkLocale,
		localeTextDirection,
		LOCALE_TEXT_FILL_WHITE,
		PRESS_TO_CONTINUE_BOTTOM_OFFSET,
		PRESS_TO_CONTINUE_FONT_SIZE,
		supportsBitmapFont,
		systemTextFontFamily,
	} from '../game/constants';
	import { getContext } from '../game/context';

	let imgEl = $state<HTMLImageElement | undefined>();

	const context = getContext();
	const text = $derived(context.i18nDerived.pressToContinue());
	const locale = $derived(stateI18n.i18n.locale);
	const useBitmap = $derived(supportsBitmapFont(locale));
	const textDirection = $derived(localeTextDirection(locale));
	const systemFontFamily = $derived(systemTextFontFamily(locale));
	const needsCjkFont = $derived(!useBitmap && isCjkLocale(locale));

	let cjkFontReady = $state(!needsCjkFont);

	$effect(() => {
		if (!needsCjkFont) {
			cjkFontReady = true;
			return;
		}
		cjkFontReady = false;
		let cancelled = false;
		ensureCjkFontLoaded().then(() => {
			if (!cancelled) cjkFontReady = true;
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
		if (!useBitmap) return;

		const renderer = context.stateApp.pixiApplication?.renderer;
		if (!renderer || !imgEl) return;

		const ml = context.stateLayoutDerived.mainLayout();
		const fontSize = PRESS_TO_CONTINUE_FONT_SIZE * BITMAP_FONT_SCALE;
		const maxWidth = ml.width * 0.95;

		const container = new PIXI.Container();
		const bitmapText = new PIXI.BitmapText({
			text,
			style: {
				fontFamily: fontForLocale(FONT_PROSTOI_WHITE, FONT_PROSTOI_WHITE_RU, locale, FONT_PROSTOI_WHITE_HI),
				fontSize,
				align: 'center',
				letterSpacing: 2,
			},
		});

		const scale = Math.min(maxWidth / (bitmapText.width || 1), 1);
		bitmapText.scale.set(scale);
		bitmapText.anchor.set(0.5, 1);

		const w = Math.max(1, Math.ceil(bitmapText.width));
		const h = Math.max(1, Math.ceil(bitmapText.height));
		bitmapText.position.set(w / 2, h);
		container.addChild(bitmapText);

		const rt = PIXI.RenderTexture.create({ width: w, height: h });
		renderer.render({ container, target: rt });

		const canvas = renderer.extract.canvas(rt);
		imgEl.src = canvas.toDataURL('image/png');
		imgEl.style.width = `${w * ml.scale}px`;
		imgEl.style.height = `${h * ml.scale}px`;

		return () => {
			rt.destroy(true);
			container.destroy({ children: true });
		};
	});
</script>

{#if useBitmap}
	<img bind:this={imgEl} class="press-label" style={positionStyle} alt="" />
{:else if cjkFontReady}
	<p
		class="press-label press-label--system"
		class:press-label--cjk={isCjkLocale(locale)}
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
		font-family: v-bind(systemFontFamily);
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
</style>
