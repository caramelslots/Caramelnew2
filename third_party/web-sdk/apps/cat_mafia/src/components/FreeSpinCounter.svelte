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
	} from '../game/constants';
	import { DESKTOP_FS_COUNTER_LAYOUT } from '../game/fsCounterLayout';
	import LocaleGlyph from './LocaleGlyph.svelte';
	import { anchorToPivot, BitmapText, Container, Sprite, type Sizes } from 'pixi-svelte';
	import { stateI18n } from 'state-shared';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const {
		PANEL_RATIO: DESKTOP_PANEL_RATIO,
		TEXT_X_FRAC: DESKTOP_TEXT_X_FRAC,
		TEXT_Y_FRAC: DESKTOP_TEXT_Y_FRAC,
		MOUNT_OVERLAP: DESKTOP_MOUNT_OVERLAP,
		CHROME_CENTER_Y_FRAC: DESKTOP_CHROME_CENTER_Y_FRAC,
		PANEL_WIDTH_FRAC: DESKTOP_PANEL_WIDTH_FRAC,
	} = DESKTOP_FS_COUNTER_LAYOUT;

	const isPortrait = $derived(stateLayoutDerived.layoutType() === 'portrait');
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

	const panelSizes = $derived(desktopPanelSizes);
	const position = $derived(desktopPosition);
	const textAnchor = $derived({
		x: panelSizes.width * DESKTOP_TEXT_X_FRAC,
		y: panelSizes.height * DESKTOP_TEXT_Y_FRAC,
	});
	const scale = 1;

	const fontSize = $derived(desktopPanelWidth * (0.24 / 1.75) * BITMAP_FONT_SCALE);
	const maxTextWidth = $derived(panelSizes.width * 0.72);
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
	/** Instant under the cloud / during congrats — no pop-in after steam clears. */
	const fadeMs = 0;

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
	<FadeContainer show={visible} duration={fadeMs} {...position} {scale}>
		<Sprite key="fsLeftCounterSpinboard" {...panelSizes} />
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
