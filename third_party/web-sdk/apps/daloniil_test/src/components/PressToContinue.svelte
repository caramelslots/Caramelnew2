<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';

	import { stateI18n } from 'state-shared';

	import {
		BITMAP_FONT_SCALE,
		FONT_PROSTOI_WHITE,
		FONT_PROSTOI_WHITE_RU,
		fontForLocale,
		LOCALE_TEXT_FILL_WHITE,
		PRESS_TO_CONTINUE_BOTTOM_OFFSET,
		PRESS_TO_CONTINUE_FONT_SIZE,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import ResponsiveLocaleText from './ResponsiveLocaleText.svelte';

	type Props = {
		onpress?: () => void;
		/** When false, only renders the label (no fullscreen / hotkey handlers). */
		interactive?: boolean;
	};

	const props: Props = $props();
	const interactive = $derived(props.interactive !== false);
	const context = getContext();
	const layout = $derived(context.stateLayoutDerived.mainLayout());
	const pressText = $derived(context.i18nDerived.pressToContinue());
</script>

<MainContainer alignVertical="bottom">
	<ResponsiveLocaleText
		anchor={{ x: 0.5, y: 1 }}
		x={layout.width * 0.5}
		y={layout.height - PRESS_TO_CONTINUE_BOTTOM_OFFSET}
		maxWidth={layout.width * 0.95}
		text={pressText}
		fallbackFill={LOCALE_TEXT_FILL_WHITE}
		style={{
			fontFamily: fontForLocale(FONT_PROSTOI_WHITE, FONT_PROSTOI_WHITE_RU, stateI18n.i18n.locale),
			fontSize: PRESS_TO_CONTINUE_FONT_SIZE * BITMAP_FONT_SCALE,
			align: 'center',
			letterSpacing: 2,
		}}
	/>
</MainContainer>
{#if interactive}
	<OnHotkey hotkey="Space" onpress={() => props.onpress?.()} />
	<OnPressFullScreen onpress={() => props.onpress?.()} />
{/if}
