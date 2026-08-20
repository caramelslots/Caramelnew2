<script lang="ts">
	/**
	 * Stage B: CSS curtain wipe for Super Wild column expand (base + duel desks).
	 */
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { BOARD_LAYOUT_OFFSETS, SYMBOL_SIZE } from '../game/constants';
	import { computeDuelScreenLayout, getDuelPixiBoardLayout } from '../game/duelLayout';
	import { stateDuel } from '../game/stateDuel.svelte';

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const isDesktop = $derived(context.stateLayoutDerived.layoutType() === 'desktop');
	const baseCurtain = $derived(context.stateGame.superWildCurtain);
	const duelCurtain = $derived(stateDuel.superWildCurtain);
	const curtain = $derived(duelCurtain ?? baseCurtain);

	const style = $derived.by(() => {
		if (!curtain) return '';

		if (duelCurtain && stateDuel.active) {
			const ml = context.stateLayoutDerived.mainLayout();
			const canvas = context.stateLayoutDerived.canvasSizes();
			const base = context.stateGameDerived.baseBoardLayout();
			const duel = computeDuelScreenLayout({
				canvasWidth: canvas.width,
				canvasHeight: canvas.height,
				layoutType: context.stateLayoutDerived.layoutType(),
				mainLayout: ml,
				boardLayout: base,
			});
			const layout = getDuelPixiBoardLayout({
				duel,
				side: duelCurtain.side,
				mainLayout: ml,
				base,
			});
			const centerX = ml.x + (layout.x - ml.width * 0.5) * ml.scale;
			const centerY = ml.y + (layout.y - ml.height * 0.5) * ml.scale;
			const halfW = (layout.visualWidth / 2) * ml.scale;
			const halfH = (layout.visualHeight / 2) * ml.scale;
			const cell = SYMBOL_SIZE * ml.scale * layout.scale;
			const left = centerX - halfW + duelCurtain.reel * cell;
			const top = centerY - halfH;
			const height = layout.visualHeight * ml.scale;
			return `left:${left}px;top:${top}px;width:${cell}px;height:${height}px;`;
		}

		const ml = context.stateLayoutDerived.mainLayout();
		const layoutType = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const board = context.stateGameDerived.boardLayout();
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;
		const cell = SYMBOL_SIZE * ml.scale * board.scale;
		const left = centerX - halfW + curtain.reel * cell;
		const top = centerY - halfH;
		const height = board.visualHeight * ml.scale;
		return `left:${left}px;top:${top}px;width:${cell}px;height:${height}px;`;
	});
</script>

{#if show && isDesktop && curtain}
	<div
		class="curtain"
		class:expanding={curtain.phase === 'expanding'}
		class:done={curtain.phase === 'done'}
		style={style}
		aria-hidden="true"
	>
		<span class="badge">×{curtain.mult}</span>
	</div>
{/if}

<style lang="scss">
	.curtain {
		position: fixed;
		z-index: 45;
		pointer-events: none;
		background: linear-gradient(
			180deg,
			rgba(240, 215, 140, 0.55),
			rgba(201, 162, 74, 0.35) 40%,
			rgba(80, 60, 20, 0.25)
		);
		border: 2px solid rgba(240, 215, 140, 0.7);
		box-shadow: inset 0 0 24px rgba(255, 220, 120, 0.35);
		transform-origin: top center;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 0.4rem;
	}

	.curtain.expanding {
		animation: curtain-down 0.45s ease-out both;
	}

	.curtain.done {
		opacity: 0.35;
	}

	.badge {
		font-family: 'proxima-nova', sans-serif;
		font-size: 1.1rem;
		font-weight: 800;
		color: #1a1208;
		background: #f0d78c;
		border-radius: 6px;
		padding: 0.1rem 0.4rem;
	}

	@keyframes curtain-down {
		from {
			transform: scaleY(0.08);
			opacity: 0.2;
		}
		to {
			transform: scaleY(1);
			opacity: 1;
		}
	}
</style>
