<!--
	Duel scale plaque total — HTML text above the scale art (z-index).
	Never reads pixels from the game WebGL renderer.
-->
<script lang="ts">
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { stateI18n } from 'state-shared';

	import { HUD_BALANCE_BET_FONT_FAMILY, htmlLabelFontFamily } from '../game/constants';

	type Props = {
		amount: number;
		prefix: string;
		maxWidth: number;
		maxHeight: number;
	};

	const props: Props = $props();

	const locale = $derived(stateI18n.i18n.locale);
	const labelText = $derived(
		`${props.prefix} ${bookEventAmountToCurrencyString(props.amount)}`,
	);
	const fitW = $derived(Math.max(0, Math.floor(props.maxWidth)));
	const fitH = $derived(Math.max(0, Math.floor(props.maxHeight)));
	const fontFamily = $derived(htmlLabelFontFamily(locale) || HUD_BALANCE_BET_FONT_FAMILY);
	const fontSize = $derived(Math.max(10, Math.floor(fitH * 0.72)));
	const labelStyle = $derived(
		`max-width:${fitW}px;max-height:${fitH}px;font-size:${fontSize}px;font-family:${fontFamily};`,
	);
</script>

<span class="duel-bank-total" style={labelStyle}>{labelText}</span>

<style lang="scss">
	.duel-bank-total {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		pointer-events: none;
		user-select: none;
		font-weight: 400;
		letter-spacing: 0.04em;
		line-height: 1;
		color: #ffcc44;
		text-shadow:
			0 0 8px rgba(255, 196, 48, 0.45),
			0 1px 0 rgba(92, 58, 8, 0.75),
			0 2px 6px rgba(0, 0, 0, 0.7);
	}
</style>
