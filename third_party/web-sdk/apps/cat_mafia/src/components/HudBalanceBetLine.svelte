<script lang="ts">
	import { HUD_BALANCE_BET_FONT_FAMILY } from '../game/constants';

	type Props = {
		label: string;
		value: string;
	};

	const props: Props = $props();

	const fontFamily = HUD_BALANCE_BET_FONT_FAMILY;
</script>

<span class="hud-balance-bet-line">
	<span class="hud-balance-bet-line__label">{props.label}</span>
	<span class="hud-balance-bet-line__value">{props.value}</span>
</span>

<style lang="scss">
	@import url('https://fonts.googleapis.com/css2?family=Philosopher:wght@700&family=Reggae+One&display=swap');

	.hud-balance-bet-line {
		display: inline-flex;
		align-items: baseline;
		gap: 0.42em;
		font-family: v-bind(fontFamily);
		white-space: nowrap;
		line-height: 1.1;
	}

	.hud-balance-bet-line__label {
		color: #ffd54a;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-shadow:
			0 0 8px rgba(255, 196, 48, 0.45),
			0 1px 0 rgba(92, 58, 8, 0.75),
			0 2px 6px rgba(0, 0, 0, 0.7);
	}

	.hud-balance-bet-line__value {
		color: #fff8ec;
		font-weight: 900;
		letter-spacing: 0.02em;
		text-shadow:
			0 0 8px rgba(255, 196, 96, 0.28),
			0 1px 5px rgba(0, 0, 0, 0.85);
	}
</style>
