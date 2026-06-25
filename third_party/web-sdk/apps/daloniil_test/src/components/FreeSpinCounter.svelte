<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';

	import { getContext } from '../game/context';
	import { getContextLayout } from 'utils-layout';
	import { computePortraitHudCanvas } from '../game/portraitHudLayout';
	import {
		BITMAP_FONT_SCALE,
		FONT_PROSTOI,
		FONT_PROSTOI_RU,
		FONT_PROSTOI_HI,
		FONT_PROSTOI_VI,
		FONT_PROSTOI_CJK,
		fontForLocale,
		isArabicLocale,
		LOCALE_TEXT_FILL_GOLD,
		SYMBOL_SIZE,
	} from '../game/constants';
	import LocaleGlyph from './LocaleGlyph.svelte';
	import { anchorToPivot, BitmapText, Container, Sprite, type Sizes } from 'pixi-svelte';
	import { stateI18n } from 'state-shared';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const PANEL_RATIO = 1233 / 613;

	const isPortrait = $derived(stateLayoutDerived.layoutType() === 'portrait');
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const ml = $derived(stateLayoutDerived.mainLayout());

	// Desktop/landscape: panel to the left of the board
	const desktopPanelWidth = SYMBOL_SIZE * 2;
	const desktopPanelSizes = { width: desktopPanelWidth, height: desktopPanelWidth / PANEL_RATIO };
	const desktopPosition = $derived({
		x: boardLayout.x - boardLayout.width * 0.5 - desktopPanelSizes.width - SYMBOL_SIZE * 0.7,
		y: boardLayout.y - boardLayout.height * 0.5,
	});

	// Portrait: panel centered at the same Y as where "− Spin +" normally appears.
	// spinCenterY from computePortraitHudCanvas is in canvas CSS px; invert
	// portraitLocalToCanvasY → localY = ml.height/2 + (canvasY − ml.y) / ml.scale
	const portraitPanelWidth = $derived(boardLayout.visualWidth * 0.55);
	const portraitPanelSizes = $derived({
		width: portraitPanelWidth,
		height: portraitPanelWidth / PANEL_RATIO,
	});
	const portraitPosition = $derived(() => {
		const hud = computePortraitHudCanvas(stateLayoutDerived, { hideAutoplay: true });
		// spinCenterY is in canvas CSS px — invert portraitLocalToCanvasY to get local layout Y
		const spinLocalCenterY = ml.height / 2 + (hud.spin.centerY - ml.y) / ml.scale;
		// spinClusterCenterX = canvas.width * 0.5 = ml.width / 2 in local coords (spinClusterShiftX = 0)
		return {
			x: ml.width / 2 - portraitPanelWidth * 0.5,
			y: spinLocalCenterY - portraitPanelSizes.height / 2 - 100,
		};
	});

	const panelSizes = $derived(isPortrait ? portraitPanelSizes : desktopPanelSizes);
	const position = $derived(isPortrait ? portraitPosition() : desktopPosition);
	const scale = 1;

	const fontSize = $derived(
		isPortrait
			? (portraitPanelWidth / desktopPanelWidth) * SYMBOL_SIZE * 0.28 * BITMAP_FONT_SCALE
			: SYMBOL_SIZE * 0.28 * BITMAP_FONT_SCALE,
	);
	const maxTextWidth = $derived(panelSizes.width * 0.88);
	const minTextScale = 0.55;
	const counterText = $derived(context.i18nDerived.fsCounterText(current, total));
	const titleText = $derived(context.i18nDerived.fsCounterLabel());
	const labelFont = $derived(
		fontForLocale(
			FONT_PROSTOI,
			FONT_PROSTOI_RU,
			stateI18n.i18n.locale,
			FONT_PROSTOI_HI,
			FONT_PROSTOI_VI,
			FONT_PROSTOI_CJK,
		),
	);
	/** Digits/separators always use prostoi bitmap — not Arabic TTF. */
	const counterBitmapFont = $derived(
		isArabicLocale(stateI18n.i18n.locale)
			? FONT_PROSTOI
			: labelFont,
	);

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let titleSizes: Sizes = $state({ width: 0, height: 0 });
	let counterSizes: Sizes = $state({ width: 0, height: 0 });

	const contentWidth = $derived(Math.max(titleSizes.width, counterSizes.width, 1));
	const textScale = $derived(Math.min(Math.max(maxTextWidth / contentWidth, minTextScale), 1));

	const textContainerSizes = $derived({
		width: titleSizes.width,
		height: titleSizes.height + counterSizes.height,
	});
	const counterPosition = $derived({ x: titleSizes.width / 2, y: titleSizes.height });

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

<MainContainer>
	<FadeContainer {show} {...position} {scale}>
		<Sprite key="fsLeftCounter" {...panelSizes} />
		<Container
			x={panelSizes.width * 0.5}
			y={panelSizes.height * 0.45}
			scale={textScale}
			pivot={anchorToPivot({
				sizes: textContainerSizes,
				anchor: { x: 0.5, y: 0.5 },
			})}
		>
			<LocaleGlyph
				text={titleText}
				fallbackFill={LOCALE_TEXT_FILL_GOLD}
				style={{
					fontFamily: labelFont,
					fontSize,
					wordWrap: false,
				}}
				onresize={(sizes) => (titleSizes = sizes)}
			/>
			<BitmapText
				text={counterText}
				{...counterPosition}
				anchor={{ x: 0.5, y: 0 }}
				style={{
					fontFamily: counterBitmapFont,
					fontSize,
				}}
				onresize={(sizes) => (counterSizes = sizes)}
			/>
		</Container>
	</FadeContainer>
</MainContainer>
