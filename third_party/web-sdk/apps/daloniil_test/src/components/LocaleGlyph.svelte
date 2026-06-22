<script lang="ts">
	import { BitmapText, Text, type BitmapTextProps } from 'pixi-svelte';
	import { stateI18n } from 'state-shared';

	import { ensureCjkFontLoaded } from '../game/cjkFont';
	import {
		isCjkLocale,
		LOCALE_TEXT_FILL_WHITE,
		supportsBitmapFont,
		systemTextFontFamily,
	} from '../game/constants';

	type Style = NonNullable<BitmapTextProps['style']>;

	type Props = Omit<BitmapTextProps, 'style'> & {
		style: Style;
		/** PIXI Text fill when falling back off bitmap fonts. */
		fallbackFill?: string | number;
	};

	const props: Props = $props();

	const locale = $derived(stateI18n.i18n.locale);
	const useBitmap = $derived(supportsBitmapFont(locale));
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

	const resolvedStyle = $derived(
		useBitmap
			? props.style
			: {
					...props.style,
					fontFamily: systemTextFontFamily(locale),
					fill: props.fallbackFill ?? props.style.fill ?? LOCALE_TEXT_FILL_WHITE,
				},
	);
</script>

{#if useBitmap}
	<BitmapText {...props} style={resolvedStyle} />
{:else if cjkFontReady}
	<Text {...props} style={resolvedStyle} />
{/if}
