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
	import { devPreview } from '../game/devPreview.svelte';
	import { isPhoneCanvasSizeType } from '../game/streetOffscreenCull';
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
		PORTRAIT_FS_COUNTER_PHONE_SCALE,
		PORTRAIT_FS_COUNTER_WIDTH_FRAC,
		PORTRAIT_FS_COUNTER_Y_GAP,
		SYMBOL_SIZE,
		getPortraitMobileTier,
	} from '../game/constants';
	import LocaleGlyph from './LocaleGlyph.svelte';
	import { anchorToPivot, BitmapText, Container, Sprite, type Sizes } from 'pixi-svelte';
	import { stateI18n } from 'state-shared';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	/** Portrait neon plaque art (`fs_left_counter.webp`). */
	const PORTRAIT_PANEL_RATIO = 1233 / 613;
	/** Desktop spinboard art (`spinboard.webp`) — brackets on the right. */
	const DESKTOP_PANEL_RATIO = 582 / 334;
	/**
	 * Dark panel centre inside spinboard (brackets pull geometric centre right).
	 * Measured from art: panel to gold edge ≈ x 0.05–0.82, y 0.07–0.91.
	 */
	const DESKTOP_TEXT_X_FRAC = 0.436;
	const DESKTOP_TEXT_Y_FRAC = 0.488;
	/** How far the right mounts overlap the board frame (unscaled board units). More positive = further right. */
	const DESKTOP_MOUNT_OVERLAP = SYMBOL_SIZE * -0.13;
	/**
	 * Vertical centre as a fraction of board visual height from the top
	 * (PC-tuned; Popout inherits the same ratio).
	 */
	const DESKTOP_CHROME_CENTER_Y_FRAC = 0.2;
	/** Spinboard width as a fraction of board visual width (PC: 1.75×SYMBOL / 500). */
	const DESKTOP_PANEL_WIDTH_FRAC = (SYMBOL_SIZE * 1.75) / 500;

	const isPortrait = $derived(stateLayoutDerived.layoutType() === 'portrait');
	const canvasSizeType = $derived(stateLayoutDerived.canvasSizeType());
	/**
	 * Side plaques on Desktop / Laptop / Popout / tablet — only phone portrait
	 * (Mobile L/M/S) keeps the neon counter. Popout S/L are landscape with a
	 * short side ≤480, so canvasSizeType looks "phone" — do NOT use that here.
	 */
	const useSideChrome = $derived(!isPortrait);
	const isPortraitPhone = $derived(isPortrait && isPhoneCanvasSizeType(canvasSizeType));
	const portraitPhoneScale = $derived.by(() => {
		if (!isPortraitPhone) return 1;
		const { width, height } = stateLayoutDerived.canvasSizes();
		const tier = getPortraitMobileTier(canvasSizeType, Math.min(width, height));
		return PORTRAIT_FS_COUNTER_PHONE_SCALE[tier];
	});
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const ml = $derived(stateLayoutDerived.mainLayout());

	// Side chrome: size + mount against visual board so Popout scales like PC.
	const desktopPanelWidth = $derived(boardLayout.visualWidth * DESKTOP_PANEL_WIDTH_FRAC);
	const desktopPanelSizes = $derived({
		width: desktopPanelWidth,
		height: desktopPanelWidth / DESKTOP_PANEL_RATIO,
	});
	const desktopMountOverlap = $derived(DESKTOP_MOUNT_OVERLAP * boardLayout.scale);
	const desktopPosition = $derived({
		x:
			boardLayout.x - boardLayout.visualWidth * 0.5 - desktopPanelSizes.width + desktopMountOverlap,
		y:
			boardLayout.y -
			boardLayout.visualHeight * 0.5 +
			boardLayout.visualHeight * DESKTOP_CHROME_CENTER_Y_FRAC -
			desktopPanelSizes.height * 0.5,
	});

	// Phone landscape: neon plaque left of board (no spinboard mounts).
	const landscapePanelWidth = SYMBOL_SIZE * 2;
	const landscapePanelSizes = {
		width: landscapePanelWidth,
		height: landscapePanelWidth / PORTRAIT_PANEL_RATIO,
	};
	const landscapePosition = $derived({
		x: boardLayout.x - boardLayout.width * 0.5 - landscapePanelSizes.width - SYMBOL_SIZE * 0.7,
		y: boardLayout.y - boardLayout.height * 0.5,
	});

	// Phone portrait: panel centered at the same Y as where "− Spin +" normally appears.
	// spinCenterY from computePortraitHudCanvas is in canvas CSS px; invert
	// portraitLocalToCanvasY → localY = ml.height/2 + (canvasY − ml.y) / ml.scale
	const portraitPanelWidth = $derived(
		boardLayout.visualWidth * PORTRAIT_FS_COUNTER_WIDTH_FRAC * portraitPhoneScale,
	);
	const portraitPanelSizes = $derived({
		width: portraitPanelWidth,
		height: portraitPanelWidth / PORTRAIT_PANEL_RATIO,
	});
	const portraitPosition = $derived(() => {
		const hud = computePortraitHudCanvas(stateLayoutDerived, { hideAutoplay: true });
		// spinCenterY is in canvas CSS px — invert portraitLocalToCanvasY to get local layout Y
		const spinLocalCenterY = ml.height / 2 + (hud.spin.centerY - ml.y) / ml.scale;
		// spinClusterCenterX = canvas.width * 0.5 = ml.width / 2 in local coords (spinClusterShiftX = 0)
		return {
			x: ml.width / 2 - portraitPanelWidth * 0.5,
			y:
				spinLocalCenterY -
				portraitPanelSizes.height / 2 -
				PORTRAIT_FS_COUNTER_Y_GAP * portraitPhoneScale,
		};
	});

	const panelSizes = $derived(
		useSideChrome ? desktopPanelSizes : isPortrait ? portraitPanelSizes : landscapePanelSizes,
	);
	const position = $derived(
		useSideChrome ? desktopPosition : isPortrait ? portraitPosition() : landscapePosition,
	);
	const panelSpriteKey = $derived(useSideChrome ? 'fsLeftCounterSpinboard' : 'fsLeftCounter');
	const textAnchor = $derived(
		useSideChrome
			? {
					x: panelSizes.width * DESKTOP_TEXT_X_FRAC,
					y: panelSizes.height * DESKTOP_TEXT_Y_FRAC,
				}
			: {
					x: panelSizes.width * 0.5,
					y: panelSizes.height * 0.45,
				},
	);
	const scale = 1;

	const fontSize = $derived(
		useSideChrome
			? desktopPanelWidth * (0.24 / 1.75) * BITMAP_FONT_SCALE
			: isPortrait
				? (portraitPanelWidth / landscapePanelWidth) * SYMBOL_SIZE * 0.28 * BITMAP_FONT_SCALE
				: SYMBOL_SIZE * 0.28 * BITMAP_FONT_SCALE,
	);
	const maxTextWidth = $derived(useSideChrome ? panelSizes.width * 0.72 : panelSizes.width * 0.88);
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
		isArabicLocale(stateI18n.i18n.locale) ? FONT_PROSTOI : labelFont,
	);

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let titleSizes: Sizes = $state({ width: 0, height: 0 });
	let counterSizes: Sizes = $state({ width: 0, height: 0 });

	const forceShow = $derived(devPreview.forceShowFsBoardChrome);
	const visible = $derived(show || forceShow);

	$effect(() => {
		if (!forceShow) return;
		if (total <= 0) {
			current = 3;
			total = 10;
		}
	});

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
	<FadeContainer show={visible} {...position} {scale}>
		<Sprite key={panelSpriteKey} {...panelSizes} />
		<Container
			x={textAnchor.x}
			y={textAnchor.y}
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
