<script lang="ts">
	/**
	 * Stage D: brief CSS fly from bullet cell toward revolver drum.
	 */
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { BOARD_LAYOUT_OFFSETS, SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const isDesktop = $derived(context.stateLayoutDerived.layoutType() === 'desktop');
	const fly = $derived(context.stateGame.bulletFly);

	const style = $derived.by(() => {
		if (!fly) return '';
		const ml = context.stateLayoutDerived.mainLayout();
		const layoutType = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const board = context.stateGameDerived.boardLayout();
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;
		const cell = SYMBOL_SIZE * ml.scale * board.scale;
		const visibleRow = fly.row - 1;
		const startLeft = centerX - halfW + fly.reel * cell + cell * 0.25;
		const startTop = centerY - halfH + visibleRow * cell + cell * 0.25;
		const endLeft = centerX + halfW + 30;
		const endTop = centerY - halfH - 20;
		const dx = endLeft - startLeft;
		const dy = endTop - startTop;
		return `left:${startLeft}px;top:${startTop}px;--dx:${dx}px;--dy:${dy}px;`;
	});
</script>

{#if show && isDesktop && fly}
	<div class="bullet-fly" style={style} aria-hidden="true">BT</div>
{/if}

<style lang="scss">
	.bullet-fly {
		position: fixed;
		z-index: 55;
		pointer-events: none;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.65rem;
		font-weight: 700;
		color: #1a1208;
		background: radial-gradient(circle at 35% 30%, #f0c35a, #b33a2a 70%);
		border: 2px solid #f0d78c;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
		animation: fly-to-drum 0.38s ease-in forwards;
	}

	@keyframes fly-to-drum {
		0% {
			transform: translate(0, 0) scale(1);
			opacity: 1;
		}
		80% {
			opacity: 1;
		}
		100% {
			transform: translate(var(--dx), var(--dy)) scale(0.45);
			opacity: 0.15;
		}
	}
</style>
