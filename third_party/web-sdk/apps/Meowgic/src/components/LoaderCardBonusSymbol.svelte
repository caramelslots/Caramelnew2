<script lang="ts">
	import { GAME_INFO_SYMBOL_IMAGES } from '../game/gameInfoSymbols';
</script>

<div class="card-bonus-symbol">
	<img class="card-bonus-symbol-img" src={GAME_INFO_SYMBOL_IMAGES.B} alt="" draggable="false" />
</div>

<style lang="scss">
	.card-bonus-symbol {
		position: absolute;
		left: 50%;
		top: calc(var(--card-height) * 0.33);
		transform: translate(-50%, -50%);
		width: calc(var(--card-width) * 0.7);
		height: calc(var(--card-height) * 0.36);
		z-index: 2;
		overflow: hidden;
		pointer-events: none;
	}

	.card-bonus-symbol-img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		user-select: none;
		pointer-events: none;
	}
</style>
