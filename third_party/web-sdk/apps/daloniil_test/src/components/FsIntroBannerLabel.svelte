<script lang="ts">
	import * as PIXI from 'pixi.js';

	import { stateI18n } from 'state-shared';

	import { ensureLocaleFontsLoaded, needsLocaleFontLoad } from '../game/localeFonts';
	import {
		BITMAP_FONT_SCALE,
		fontForLocale,
		isArabicLocale,
		isCjkLocale,
		localeTextDirection,
		supportsBitmapFont,
	} from '../game/constants';
	import { getContext } from '../game/context';

	type Props = {
		text: string;
		fontKrutoi: string;
		fontKrutoiRu: string;
		fontProstoi: string;
		fontProstoiRu: string;
		fontProstoiHi: string;
		fontProstoiVi: string;
		fontLocaleCjk: string;
		useKrutoi?: boolean;
		/** Font size as a fraction of panel width. */
		sizeRatio: number;
		/** Vertical centre as a fraction of panel height. */
		yRatio: number;
		/** Max text width as a fraction of panel width. */
		maxWidthRatio?: number;
		/** Minimum horizontal scale when fitting long strings. */
		minScale?: number;
		panelWidth: number;
		panelHeight: number;
		layoutScale: number;
		fallbackFill?: string | number;
	};

	const props: Props = $props();

	let imgEl = $state<HTMLImageElement | undefined>();
	let systemEl = $state<HTMLParagraphElement | undefined>();
	let fitScale = $state(1);

	const context = getContext();
	const locale = $derived(stateI18n.i18n.locale);
	const useBitmap = $derived(supportsBitmapFont(locale));
	const textDirection = $derived(localeTextDirection(locale));
	const needsCustomFont = $derived(needsLocaleFontLoad(locale));
	const fontFamily = $derived(
		fontForLocale(
			props.useKrutoi ? props.fontKrutoi : props.fontProstoi,
			props.useKrutoi ? props.fontKrutoiRu : props.fontProstoiRu,
			locale,
			props.fontProstoiHi,
			props.fontProstoiVi,
			props.fontLocaleCjk,
		),
	);

	let localeFontReady = $state(!needsCustomFont);

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

	const basePanelWidth = $derived(props.panelWidth / props.layoutScale);
	const fontSize = $derived(basePanelWidth * props.sizeRatio * BITMAP_FONT_SCALE);
	const maxWidth = $derived(basePanelWidth * (props.maxWidthRatio ?? 0.88));
	const minFitScale = $derived(props.minScale ?? 0.45);
	const systemFontSize = $derived(fontSize * props.layoutScale);
	const systemFill = $derived(String(props.fallbackFill ?? '#fff8e8'));

	const positionStyle = $derived(
		[
			`left:50%`,
			`top:${props.panelHeight * props.yRatio}px`,
			`max-width:${maxWidth * props.layoutScale}px`,
		].join(';'),
	);

	const systemTransformStyle = $derived(
		`transform:translate(-50%, -50%) scale(${fitScale});`,
	);

	const fitScaleToWidth = (naturalWidth: number, limitWidth: number) => {
		if (naturalWidth <= 0 || limitWidth <= 0) return 1;
		return Math.min(Math.max(limitWidth / naturalWidth, minFitScale), 1);
	};

	const refitSystemLabel = () => {
		const el = systemEl;
		if (!el) return;

		fitScale = 1;
		el.style.transform = 'translate(-50%, -50%) scale(1)';

		const limitWidth = maxWidth * props.layoutScale;
		const naturalWidth = el.scrollWidth;
		fitScale = fitScaleToWidth(naturalWidth, limitWidth);
	};

	$effect(() => {
		if (useBitmap) return;

		props.text;
		locale;
		maxWidth;
		minFitScale;
		systemFontSize;
		fontFamily;
		localeFontReady;

		if (!localeFontReady) return;

		requestAnimationFrame(() => requestAnimationFrame(refitSystemLabel));
	});

	$effect(() => {
		if (useBitmap || !systemEl) return;

		const observer = new ResizeObserver(() => refitSystemLabel());
		observer.observe(systemEl);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (!useBitmap) return;

		const renderer = context.stateApp.pixiApplication?.renderer;
		if (!renderer || !imgEl) return;

		const renderFontSize = basePanelWidth * props.sizeRatio * BITMAP_FONT_SCALE;
		const renderMaxWidth = basePanelWidth * (props.maxWidthRatio ?? 0.88);

		const container = new PIXI.Container();
		const bitmapText = new PIXI.BitmapText({
			text: props.text,
			style: {
				fontFamily,
				fontSize: renderFontSize,
				align: 'center',
				fontWeight: 'bold',
				letterSpacing: 0,
			},
		});

		const naturalWidth = bitmapText.getLocalBounds().width;
		const scale = fitScaleToWidth(naturalWidth, renderMaxWidth);
		bitmapText.scale.set(scale);
		bitmapText.anchor.set(0.5, 0.5);

		const w = Math.max(1, Math.ceil(bitmapText.width));
		const h = Math.max(1, Math.ceil(bitmapText.height));
		bitmapText.position.set(w / 2, h / 2);
		container.addChild(bitmapText);

		const rt = PIXI.RenderTexture.create({ width: w, height: h });
		renderer.render({ container, target: rt });

		const canvas = renderer.extract.canvas(rt);
		imgEl.src = canvas.toDataURL('image/png');
		imgEl.style.width = `${w * props.layoutScale}px`;
		imgEl.style.height = `${h * props.layoutScale}px`;

		return () => {
			rt.destroy(true);
			container.destroy({ children: true });
		};
	});
</script>

{#if useBitmap}
	<img bind:this={imgEl} class="label" style={positionStyle} alt="" />
{:else if localeFontReady}
	<p
		bind:this={systemEl}
		class="label label--system"
		class:label--cjk={isCjkLocale(locale)}
		class:label--arabic={isArabicLocale(locale)}
		class:label--krutoi={isArabicLocale(locale) && props.useKrutoi}
		style="{positionStyle};{systemTransformStyle}"
		dir={textDirection}
		lang={locale}
	>
		{props.text}
	</p>
{/if}

<style lang="scss">
	.label {
		position: absolute;
		transform: translate(-50%, -50%);
		pointer-events: none;
		user-select: none;
		transform-origin: center center;
	}

	.label--system {
		margin: 0;
		padding: 0;
		width: max-content;
		max-width: 100%;
		text-align: center;
		white-space: nowrap;
		font-family: v-bind(fontFamily);
		font-size: v-bind('`${systemFontSize}px`');
		font-weight: 700;
		letter-spacing: 0.04em;
		color: v-bind(systemFill);
		text-transform: uppercase;
		line-height: 1.1;
	}

	.label--cjk {
		text-transform: none;
		letter-spacing: 0;
	}

	.label--arabic {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 500;
	}

	.label--arabic.label--krutoi {
		font-weight: 900;
	}
</style>
