<script lang="ts">
	import { BitmapText, Text, type BitmapTextProps } from 'pixi-svelte';
	import { stateI18n } from 'state-shared';

	import {
		isArabicLocale,
		LOCALE_TEXT_FILL_WHITE,
		supportsBitmapFont,
		systemTextFontFamily,
	} from '../game/constants';
	import { ensureLocaleFontsLoaded, needsLocaleFontLoad } from '../game/localeFonts';

	type Style = NonNullable<BitmapTextProps['style']>;

	type Props = Omit<BitmapTextProps, 'style'> & {
		style: Style;
		/** PIXI Text fill when falling back off bitmap fonts. */
		fallbackFill?: string | number;
	};

	const props: Props = $props();

	const locale = $derived(stateI18n.i18n.locale);
	const useBitmap = $derived(supportsBitmapFont(locale));
	const needsCustomFont = $derived(needsLocaleFontLoad(locale));

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

	const resolvedStyle = $derived(
		useBitmap
			? props.style
			: {
					...props.style,
					fontFamily: isArabicLocale(locale)
						? props.style.fontFamily
						: systemTextFontFamily(locale),
					fill: props.fallbackFill ?? props.style.fill ?? LOCALE_TEXT_FILL_WHITE,
				},
	);
</script>

{#if useBitmap}
	<BitmapText {...props} style={resolvedStyle} />
{:else if localeFontReady}
	<Text {...props} style={resolvedStyle} />
{/if}
