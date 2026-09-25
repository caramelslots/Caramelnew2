<script lang="ts">
	import { BitmapText, type BitmapTextProps } from 'pixi-svelte';
	import TightCanvasText from './TightCanvasText.svelte';
	import { stateI18n } from 'state-shared';

	import {
		isArabicLocale,
		LOCALE_TEXT_FILL_WHITE,
		supportsBitmapFont,
		systemTextFontFamily,
	} from '../game/constants';
	import { arabicLocaleTextStyle } from '../game/arabicTextStyle';
	import { ensureLocaleFontsLoaded, needsLocaleFontLoad } from '../game/localeFonts';

	type Style = NonNullable<BitmapTextProps['style']>;

	type Props = Omit<BitmapTextProps, 'style'> & {
		style: Style;
		/** PIXI Text fill when falling back off bitmap fonts. */
		fallbackFill?: string | number;
		/**
		 * Use bitmap atlas even when the locale normally falls back to TTF
		 * (e.g. Arabic Big/Epic titles — Latin words drawn with krutoi).
		 */
		forceBitmap?: boolean;
	};

	const props: Props = $props();
	const { forceBitmap, fallbackFill: fallbackFillProp, style, ...bitmapProps } = $derived(props);

	const locale = $derived(stateI18n.i18n.locale);
	const useBitmap = $derived(Boolean(forceBitmap) || supportsBitmapFont(locale));
	const needsCustomFont = $derived(needsLocaleFontLoad(locale) && !forceBitmap);

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

	const fallbackFill = $derived(
		fallbackFillProp ?? style.fill ?? LOCALE_TEXT_FILL_WHITE,
	);

	const resolvedStyle = $derived(
		useBitmap
			? style
			: isArabicLocale(locale)
				? arabicLocaleTextStyle(
						{ ...style, fontFamily: style.fontFamily },
						fallbackFill,
					)
				: {
						...style,
						fontFamily: systemTextFontFamily(locale),
						fill: fallbackFill,
					},
	);
</script>

{#if useBitmap}
	<BitmapText {...bitmapProps} style={resolvedStyle} />
{:else if localeFontReady}
	<TightCanvasText {...bitmapProps} style={resolvedStyle} />
{/if}
