<script lang="ts">
	import { stateI18n } from 'state-shared';

	import {
		isArabicLocale,
		isCjkLocale,
		localeTextDirection,
		PRESS_TO_CONTINUE_BOTTOM_OFFSET,
		PRESS_TO_CONTINUE_FONT_SIZE,
	} from '../game/constants';
	import { getContext } from '../game/context';

	type Props = {
		/** Position inside the intro panel so the label moves with the lift. */
		contained?: boolean;
	};

	const props: Props = $props();

	const context = getContext();
	const text = $derived(context.i18nDerived.pressToContinue());
	const locale = $derived(stateI18n.i18n.locale);
	const textDirection = $derived(localeTextDirection(locale));

	const labelStyle = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const bottom = PRESS_TO_CONTINUE_BOTTOM_OFFSET * ml.scale;
		const fontSize = Math.round(PRESS_TO_CONTINUE_FONT_SIZE * ml.scale);
		return [
			`left:${ml.x}px`,
			`bottom:${bottom}px`,
			`max-width:${ml.width * ml.scale * 0.95}px`,
			`font-size:${fontSize}px`,
		].join(';');
	});
</script>

<p
	class="press-label"
	class:press-label--contained={props.contained}
	class:press-label--cjk={isCjkLocale(locale)}
	class:press-label--arabic={isArabicLocale(locale)}
	style={labelStyle}
	dir={textDirection}
	lang={locale}
>
	{text}
</p>

<style lang="scss">
	.press-label {
		z-index: 46;
		transform: translateX(-50%);
		pointer-events: none;
		user-select: none;
		margin: 0;
		padding: 0;
		text-align: center;
		/* Same face as FreeSpinIntro CONGRATULATIONS (proxima-nova + gold gradient). */
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		letter-spacing: 0.04em;
		line-height: 1.2;
		text-transform: uppercase;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 3px 0 #5a3a0e)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}

	.press-label--contained {
		position: absolute;
	}

	.press-label:not(.press-label--contained) {
		position: fixed;
	}

	.press-label--cjk {
		text-transform: none;
		letter-spacing: 0;
	}

	.press-label--arabic {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 800;
	}
</style>
