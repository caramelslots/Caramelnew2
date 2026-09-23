<!--
	Duel scale plaque total — HTML text above the scale art (z-index).
	proxima-nova like under-board WIN / FS intro; no filter:drop-shadow
	(that blur + clips at plaque scale). Never reads WebGL pixels.
-->
<script lang="ts">
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	type Props = {
		amount: number;
		prefix: string;
		maxWidth: number;
		maxHeight: number;
	};

	const props: Props = $props();

	const labelText = $derived(
		`${props.prefix} ${bookEventAmountToCurrencyString(props.amount)}`,
	);
	const fitW = $derived(Math.max(0, Math.floor(props.maxWidth)));
	const fitH = $derived(Math.max(0, Math.floor(props.maxHeight)));
	/** Leave headroom for ascent/descenders + tracking — 0.85 clipped the glyphs. */
	const fontSize = $derived(Math.max(10, Math.floor(fitH * 0.62)));
	const labelStyle = $derived(`max-width:${fitW}px;font-size:${fontSize}px;`);
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
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		line-height: 1;
		/* Solid gold + stroke stays sharp at plaque size; filter+clip blurred. */
		color: #ffd56a;
		paint-order: stroke fill;
		-webkit-font-smoothing: antialiased;
		-webkit-text-stroke: 0.045em rgba(48, 22, 6, 0.92);
		text-shadow:
			0 0.04em 0 rgba(255, 243, 176, 0.55),
			0 0.08em 0 rgba(90, 58, 14, 0.85),
			0 0.12em 0.2em rgba(0, 0, 0, 0.45);
	}
</style>
