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
	import {
		BITMAP_FONT_SCALE,
		FONT_PROSTOI,
		FONT_PROSTOI_RU,
		FONT_PROSTOI_HI,
		FONT_PROSTOI_VI,
		FONT_PROSTOI_CJK,
		fontForLocale,
		LOCALE_TEXT_FILL_WHITE,
		SYMBOL_SIZE,
	} from '../game/constants';
	import LocaleGlyph from './LocaleGlyph.svelte';
	import { anchorToPivot, BitmapText, Container, Sprite, type Sizes } from 'pixi-svelte';
	import { stateI18n } from 'state-shared';

	const context = getContext();
	const PANEL_RATIO = 1233 / 613;
	const panelWidth = $derived(SYMBOL_SIZE * 2);
	const panelSizes = $derived({
		width: panelWidth,
		height: panelWidth / PANEL_RATIO,
	});
	const scale = 1;
	const position = $derived({
		x:
			context.stateGameDerived.boardLayout().x -
			context.stateGameDerived.boardLayout().width * 0.5 -
			panelSizes.width -
			SYMBOL_SIZE * 0.7,
		y:
			context.stateGameDerived.boardLayout().y -
			context.stateGameDerived.boardLayout().height * 0.5,
	});

	const fontSize = SYMBOL_SIZE * 0.28 * BITMAP_FONT_SCALE;
	const counterText = $derived(context.i18nDerived.fsCounterText(current, total));
	const titleText = $derived(context.i18nDerived.fsCounterLabel());

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let titleSizes: Sizes = $state({ width: 0, height: 0 });
	let counterSizes: Sizes = $state({ width: 0, height: 0 });

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
			pivot={anchorToPivot({
				sizes: textContainerSizes,
				anchor: { x: 0.5, y: 0.5 },
			})}
		>
			<LocaleGlyph
				text={titleText}
				fallbackFill={LOCALE_TEXT_FILL_WHITE}
				style={{
					fontFamily: fontForLocale(FONT_PROSTOI, FONT_PROSTOI_RU, stateI18n.i18n.locale, FONT_PROSTOI_HI, FONT_PROSTOI_VI, FONT_PROSTOI_CJK),
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
					fontFamily: fontForLocale(FONT_PROSTOI, FONT_PROSTOI_RU, stateI18n.i18n.locale, FONT_PROSTOI_HI, FONT_PROSTOI_VI, FONT_PROSTOI_CJK),
					fontSize,
				}}
				onresize={(sizes) => (counterSizes = sizes)}
			/>
		</Container>
	</FadeContainer>
</MainContainer>
