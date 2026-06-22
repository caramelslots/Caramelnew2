<script lang="ts">
	import { BitmapText, Text, type BitmapTextProps } from 'pixi-svelte';
	import { stateI18n } from 'state-shared';

	import {
		LOCALE_TEXT_FILL_WHITE,
		SYSTEM_TEXT_FONT_FAMILY,
		supportsBitmapFont,
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

	const resolvedStyle = $derived(
		useBitmap
			? props.style
			: {
					...props.style,
					fontFamily: SYSTEM_TEXT_FONT_FAMILY,
					fill: props.fallbackFill ?? props.style.fill ?? LOCALE_TEXT_FILL_WHITE,
				},
	);
</script>

{#if useBitmap}
	<BitmapText {...props} style={resolvedStyle} />
{:else}
	<Text {...props} style={resolvedStyle} />
{/if}
