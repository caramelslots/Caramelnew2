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

	/**
	 * WebKit applies `background-clip` + `filter` inconsistently across wrapped
	 * lines (first line flat, second line beveled). Split into balanced word
	 * lines so each fragment gets the same gold face. CJK / Arabic stay one line.
	 */
	const lines = $derived.by(() => {
		const value = text.trim();
		if (!value || isCjkLocale(locale) || isArabicLocale(locale)) return [value];
		const words = value.split(/\s+/).filter(Boolean);
		if (words.length <= 1) return [value];
		const mid = Math.ceil(words.length / 2);
		return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
	});

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
	{#each lines as line, i (i)}
		<span class="press-label__line">{line}</span>
	{/each}
</p>

<style lang="scss">
	.press-label {
		z-index: 46;
		transform: translateX(-50%);
		pointer-events: none;
		user-select: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.05em;
		text-align: center;
		/* Same face as FreeSpinIntro CONGRATULATIONS (proxima-nova + gold). */
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		letter-spacing: 0.04em;
		line-height: 1.15;
		text-transform: uppercase;
		/* Bevel on the wrapper — fill lives on each line (WebKit multiline fix). */
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 3px 0 #5a3a0e)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}

	.press-label__line {
		display: block;
		width: max-content;
		max-width: 100%;
		white-space: nowrap;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
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

		.press-label__line {
			white-space: normal;
		}
	}

	.press-label--arabic {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 800;

		.press-label__line {
			white-space: normal;
		}
	}
</style>
