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
	import { devPreview } from '../game/devPreview.svelte';
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
	/**
	 * Side plaques on Desktop / Laptop / Popout / tablet. Phone portrait uses
	 * the duel-style HTML pill (FreeSpinCounterPortraitHtml) instead.
	 */
	const useSideChrome = $derived(!isPortrait);
	const boardLayout = $derived(context.stateGameDerived.boardLayout());

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

	const panelSizes = $derived(useSideChrome ? desktopPanelSizes : landscapePanelSizes);
	const position = $derived(useSideChrome ? desktopPosition : landscapePosition);
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
	const visible = $derived((show || forceShow) && !isPortrait);

	$effect(() => {
		if (!forceShow) return;
		if (total <= 0) {
			current = 3;
			total = 10;
		}
	});

	const contentWidth = $derived(Math.max(titleSizes.width, counterSizes.width, 1));
	const textCenterX = $derived(contentWidth / 2);
	const textScale = $derived(Math.min(Math.max(maxTextWidth / contentWidth, minTextScale), 1));

	const textContainerSizes = $derived({
		width: contentWidth,
		height: titleSizes.height + counterSizes.height,
	});
	const counterPosition = $derived({ x: textCenterX, y: titleSizes.height });

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
				x={textCenterX}
				anchor={{ x: 0.5, y: 0 }}
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
