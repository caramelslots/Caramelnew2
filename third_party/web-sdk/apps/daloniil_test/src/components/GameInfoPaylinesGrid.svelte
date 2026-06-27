<script lang="ts">
	import { getGameInfoPaylines } from '../game/gameInfoPaylines';

	const paylines = getGameInfoPaylines();

	const GRID = 5;
	const CELL = 11;
	const GAP = 2;
	const size = GRID * CELL + (GRID - 1) * GAP;

	const cellCenter = (reel: number, row: number) => ({
		x: reel * (CELL + GAP) + CELL / 2,
		y: row * (CELL + GAP) + CELL / 2,
	});

	const linePath = (rows: readonly number[]) =>
		rows
			.map((row, reel) => {
				const { x, y } = cellCenter(reel, row);
				return `${reel === 0 ? 'M' : 'L'} ${x} ${y}`;
			})
			.join(' ');
</script>

<div class="paylines-grid" data-test="game-info-paylines">
	{#each paylines as payline (payline.lineIndex)}
		<article class="payline-card">
			<span class="payline-num">{payline.lineIndex}</span>
			<div class="payline-board" style:width="{size}px" style:height="{size}px">
				<svg
					class="payline-svg"
					viewBox="0 0 {size} {size}"
					width={size}
					height={size}
					aria-hidden="true"
				>
					<path class="payline-glow" d={linePath(payline.rows)} />
					<path class="payline-path" d={linePath(payline.rows)} />
					{#each payline.rows as row, reel (payline.lineIndex + '-' + reel)}
						{@const center = cellCenter(reel, row)}
						<circle class="payline-node" cx={center.x} cy={center.y} r="3.2" />
					{/each}
				</svg>
				<div class="payline-cells">
					{#each payline.grid as rowCells, row (payline.lineIndex + '-r' + row)}
						{#each rowCells as cell, reel (payline.lineIndex + '-c' + row + '-' + reel)}
							<div
								class="payline-cell"
								class:payline-cell--on={cell.active}
							></div>
						{/each}
					{/each}
				</div>
			</div>
		</article>
	{/each}
</div>

<style lang="scss">
	.paylines-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.55rem;
	}

	.payline-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 0.35rem 0.55rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(185, 54, 255, 0.18);
	}

	.payline-num {
		font-size: 0.72rem;
		font-weight: 800;
		line-height: 1;
		color: #ffd51a;
		letter-spacing: 0.04em;
	}

	.payline-board {
		position: relative;
		flex-shrink: 0;
	}

	.payline-cells {
		display: grid;
		grid-template-columns: repeat(5, 11px);
		grid-template-rows: repeat(5, 11px);
		gap: 2px;
	}

	.payline-cell {
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.07);
	}

	.payline-cell--on {
		background: rgba(185, 54, 255, 0.22);
		box-shadow: inset 0 0 0 1px rgba(185, 54, 255, 0.35);
	}

	.payline-svg {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: visible;
	}

	.payline-glow {
		fill: none;
		stroke: #b936ff;
		stroke-width: 6;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0.22;
	}

	.payline-path {
		fill: none;
		stroke: #b936ff;
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.payline-node {
		fill: #ffd51a;
		stroke: #fff;
		stroke-width: 0.6;
	}

	@media (max-width: 680px) {
		.paylines-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 560px) {
		.payline-num {
			font-size: 0.9rem;
		}
	}

	@media (max-width: 420px) {
		.paylines-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.payline-card:last-child:nth-child(odd) {
			grid-column: 1 / -1;
		}
	}
</style>
