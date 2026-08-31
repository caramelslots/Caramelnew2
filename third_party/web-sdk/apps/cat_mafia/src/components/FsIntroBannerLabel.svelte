<script lang="ts">
	import * as PIXI from 'pixi.js';

	import { stateI18n } from 'state-shared';

	import { ensureLocaleFontsLoaded, needsLocaleFontLoad } from '../game/localeFonts';
	import { arabicLocaleTextStyle } from '../game/arabicTextStyle';
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
		/** Horizontal offset from centre as a fraction of panel width (positive = right). */
		xOffsetRatio?: number;
		/** Max text width as a fraction of panel width. */
		maxWidthRatio?: number;
		/** Minimum horizontal scale when fitting long strings. */
		minScale?: number;
	/**
	 * When set, lay letters along an upward arc (degrees left→right).
	 * Circle centre sits below the peak so the bow matches the plaque crest.
	 */
		archAngleDeg?: number;
		panelWidth: number;
		panelHeight: number;
		layoutScale: number;
		fallbackFill?: string | number;
	};

	const props: Props = $props();

	let imgEl = $state<HTMLImageElement | undefined>();
	let systemEl = $state<HTMLParagraphElement | undefined>();
	let fitScale = $state(1);

	const archAngleDeg = $derived(props.archAngleDeg ?? 0);
	const useArch = $derived(archAngleDeg > 0);
	const archChars = $derived(Array.from(props.text));

	const context = getContext();
	const locale = $derived(stateI18n.i18n.locale);
	const useBitmap = $derived(supportsBitmapFont(locale));
	const usePixiRender = $derived(useBitmap || isArabicLocale(locale));
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

	const basePanelWidth = $derived(props.panelWidth / props.layoutScale);
	const fontSize = $derived(basePanelWidth * props.sizeRatio * BITMAP_FONT_SCALE);
	const maxWidth = $derived(basePanelWidth * (props.maxWidthRatio ?? 0.88));
	const minFitScale = $derived(props.minScale ?? 0.45);
	const systemFontSize = $derived(fontSize * props.layoutScale);
	const systemFill = $derived(String(props.fallbackFill ?? '#fff8e8'));

	const positionStyle = $derived(
		[
			`left:calc(50% + ${props.panelWidth * (props.xOffsetRatio ?? 0)}px)`,
			`top:${props.panelHeight * props.yRatio}px`,
			useArch ? '' : `max-width:${maxWidth * props.layoutScale}px`,
		]
			.filter(Boolean)
			.join(';'),
	);

	const systemTransformStyle = $derived(
		`transform:translate(-50%, -50%) scale(${fitScale});`,
	);

	/** Per-glyph layout on an upward arc; circle centre below the peak (Y down). */
	const archGlyphLayout = $derived.by(() => {
		const chars = archChars;
		const n = chars.length;
		if (!useArch || n === 0) return [] as { char: string; x: number; y: number; rot: number }[];

		const chord = maxWidth * props.layoutScale;
		const halfRad = (archAngleDeg * Math.PI) / 360;
		// Larger radius → shallower bow; peak at (0,0), ends lower (+Y).
		const radius = halfRad > 0.001 ? chord / (2 * Math.sin(halfRad)) : chord;
		const step = n > 1 ? (2 * halfRad) / (n - 1) : 0;

		return chars.map((char, i) => {
			const phi = n > 1 ? -halfRad + i * step : 0;
			return {
				char,
				x: radius * Math.sin(phi),
				// Peak highest (y=0); ends drop — centre of curvature below text.
				y: radius * (1 - Math.cos(phi)),
				// Tilt toward circle centre below (CSS clockwise = +).
				rot: (phi * 180) / Math.PI,
			};
		});
	});

	const fitScaleToWidth = (naturalWidth: number, limitWidth: number) => {
		if (naturalWidth <= 0 || limitWidth <= 0) return 1;
		return Math.min(Math.max(limitWidth / naturalWidth, minFitScale), 1);
	};

	const refitSystemLabel = () => {
		const el = systemEl;
		if (!el || useArch) return;

		fitScale = 1;
		el.style.transform = 'translate(-50%, -50%) scale(1)';

		const limitWidth = maxWidth * props.layoutScale;
		const naturalWidth = el.scrollWidth;
		fitScale = fitScaleToWidth(naturalWidth, limitWidth);
	};

	$effect(() => {
		if (useBitmap || useArch) return;

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
		if (useBitmap || useArch || !systemEl) return;

		const observer = new ResizeObserver(() => refitSystemLabel());
		observer.observe(systemEl);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (!usePixiRender || !canRender) return;

		const renderer = context.stateApp.pixiApplication?.renderer;
		if (!renderer || !imgEl) return;

		const renderFontSize = basePanelWidth * props.sizeRatio * BITMAP_FONT_SCALE;
		const renderMaxWidth = basePanelWidth * (props.maxWidthRatio ?? 0.88);
		const container = new PIXI.Container();

		if (useArch && archChars.length > 0) {
			const halfRad = (archAngleDeg * Math.PI) / 360;
			const radius = halfRad > 0.001 ? renderMaxWidth / (2 * Math.sin(halfRad)) : renderMaxWidth;
			const n = archChars.length;
			const step = n > 1 ? (2 * halfRad) / (n - 1) : 0;
			let minX = Infinity;
			let maxX = -Infinity;
			let minY = Infinity;
			let maxY = -Infinity;

			for (let i = 0; i < n; i++) {
				const phi = n > 1 ? -halfRad + i * step : 0;
				const glyph = useBitmap
					? new PIXI.BitmapText({
							text: archChars[i]!,
							style: {
								fontFamily,
								fontSize: renderFontSize,
								align: 'center',
								fontWeight: 'bold',
								letterSpacing: 0,
							},
						})
					: new PIXI.Text({
							text: archChars[i]!,
							style: arabicLocaleTextStyle(
								{
									fontFamily,
									fontSize: renderFontSize,
									align: 'center',
								},
								props.fallbackFill,
							),
						});
				glyph.anchor.set(0.5, 0.5);
				glyph.rotation = phi;
				const gx = radius * Math.sin(phi);
				const gy = radius * (1 - Math.cos(phi));
				glyph.position.set(gx, gy);
				container.addChild(glyph);

				const half = renderFontSize * 0.65;
				minX = Math.min(minX, gx - half);
				maxX = Math.max(maxX, gx + half);
				minY = Math.min(minY, gy - half);
				maxY = Math.max(maxY, gy + half);
			}

			const pad = Math.ceil(renderFontSize * 0.4);
			const w = Math.max(1, Math.ceil(maxX - minX) + pad * 2);
			const h = Math.max(1, Math.ceil(maxY - minY) + pad * 2);
			container.position.set(-minX + pad, -minY + pad);

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
		}

		const textNode = useBitmap
			? new PIXI.BitmapText({
					text: props.text,
					style: {
						fontFamily,
						fontSize: renderFontSize,
						align: 'center',
						fontWeight: 'bold',
						letterSpacing: 0,
					},
				})
			: new PIXI.Text({
					text: props.text,
					style: arabicLocaleTextStyle(
						{
							fontFamily,
							fontSize: renderFontSize,
							align: 'center',
						},
						props.fallbackFill,
					),
				});

		const naturalWidth = textNode.getLocalBounds().width;
		const scale = fitScaleToWidth(naturalWidth, renderMaxWidth);
		textNode.scale.set(scale);
		textNode.anchor.set(0.5, 0.5);

		const w = Math.max(1, Math.ceil(textNode.width));
		const h = Math.max(1, Math.ceil(textNode.height));
		textNode.position.set(w / 2, h / 2);
		container.addChild(textNode);

		const rt = PIXI.RenderTexture.create({ width: w, height: h });
		renderer.render({ container, target: rt });

		const canvas = renderer.extract.canvas(rt);
		imgEl.src = canvas.toDataURL('image/png');
		imgEl.style.width = `${w * props.layoutScale}px`;
		imgEl.style.height = `${h * props.layoutScale}px`;

		return () => {
			rt.destroy(true);
			container.destroy({ children: true });
			textNode.destroy();
		};
	});
</script>

{#if usePixiRender && canRender}
	<img bind:this={imgEl} class="label" style={positionStyle} alt="" />
{:else if !usePixiRender && localeFontReady && useArch}
	<div
		class="label label--arch"
		class:label--cjk={isCjkLocale(locale)}
		class:label--arabic={isArabicLocale(locale)}
		class:label--krutoi={isArabicLocale(locale) && props.useKrutoi}
		style={positionStyle}
		dir={textDirection}
		lang={locale}
		aria-label={props.text}
	>
		{#each archGlyphLayout as glyph, i (i)}
			<span
				class="arch-char"
				style="transform:translate(-50%, -50%) translate({glyph.x}px, {glyph.y}px) rotate({glyph.rot}deg)"
				>{glyph.char === ' ' ? '\u00a0' : glyph.char}</span
			>
		{/each}
	</div>
{:else if !usePixiRender && localeFontReady}
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

	.label--arch {
		margin: 0;
		padding: 0;
		width: 0;
		height: 0;
		font-family: v-bind(fontFamily);
		font-size: v-bind('`${systemFontSize}px`');
		font-weight: 700;
		letter-spacing: 0;
		color: v-bind(systemFill);
		text-transform: uppercase;
		line-height: 1;
	}

	.arch-char {
		position: absolute;
		left: 0;
		top: 0;
		display: block;
		white-space: pre;
		transform-origin: center center;
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
