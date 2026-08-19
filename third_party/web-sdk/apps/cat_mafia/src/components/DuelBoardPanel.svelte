<!--
	One Duel board: desk frame + playfield grid + bank in the gold nameplate slot.
	When `pixiDriven`, desk/grid hide so the shared Pixi board paints underneath chrome.
-->
<script lang="ts">
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { DUEL_BOARD_CONTOUR_SRC, DUEL_BOARD_DESK_SRC, duelSymbolSrc } from '../game/duelAssets';
	import { DUEL_NAMEPLATE, DUEL_PLAYFIELD } from '../game/duelLayout';
	import type { DuelBoardCell, DuelSide } from '../game/stateDuel.svelte';

	type Props = {
		side: DuelSide;
		board: DuelBoardCell[][];
		spinIndex: number;
		totalSpins: number;
		bankTotal: number;
		spinWin: number;
		spinning: boolean;
		active: boolean;
		flowAmount: number;
		label: string;
		/** Desk panel width in CSS px. */
		width: number;
		/** Desk panel height in CSS px (Pixi desk aspect). */
		height: number;
		/** Hide HTML desk/grid — Pixi Board+Frame is showing this side. */
		pixiDriven?: boolean;
	};

	const {
		side,
		board,
		spinIndex,
		totalSpins,
		bankTotal,
		spinWin,
		spinning,
		active,
		flowAmount,
		label,
		width,
		height,
		pixiDriven = false,
	}: Props = $props();

	const money = (bookCents: number) => bookEventAmountToCurrencyString(bookCents);

	const playfieldStyle = [
		`left:${DUEL_PLAYFIELD.left * 100}%`,
		`top:${DUEL_PLAYFIELD.top * 100}%`,
		`width:${DUEL_PLAYFIELD.width * 100}%`,
		`height:${DUEL_PLAYFIELD.height * 100}%`,
	].join(';');

	const nameplateStyle = [
		`left:${DUEL_NAMEPLATE.left * 100}%`,
		`top:${DUEL_NAMEPLATE.top * 100}%`,
		`width:${DUEL_NAMEPLATE.width * 100}%`,
		`height:${DUEL_NAMEPLATE.height * 100}%`,
	].join(';');
</script>

<article
	class="duel-board"
	class:side-cat={side === 'cat'}
	class:side-dog={side === 'dog'}
	class:is-active={active}
	class:is-spinning={spinning}
	class:pixi-driven={pixiDriven}
	style:width="{width}px"
	style:height="{height}px"
	data-test="duel-board-{side}"
>
	<div class="counter" data-test="duel-counter-{side}">
		<span class="counter-label">{label}</span>
		<span class="counter-value">{spinIndex}/{totalSpins}</span>
	</div>

	{#if !pixiDriven}
		<div class="frame">
			<img class="desk" src={DUEL_BOARD_DESK_SRC} alt="" draggable="false" />
			<div class="grid" style={playfieldStyle} aria-hidden="true">
				{#each board as reel}
					<div class="reel">
						{#each reel as cell}
							<div class="cell">
								<img src={duelSymbolSrc(cell.name)} alt="" draggable="false" />
							</div>
						{/each}
					</div>
				{/each}
			</div>
			<img class="contour" src={DUEL_BOARD_CONTOUR_SRC} alt="" draggable="false" />

			<div class="nameplate" style={nameplateStyle} data-test="duel-bank-{side}">
				{#if spinWin > 0 && !spinning && flowAmount > 0}
					<span class="flow-chip">+{money(flowAmount)}</span>
				{:else if spinWin > 0 && !spinning}
					<span class="spin-win">{money(spinWin)}</span>
				{/if}
				<span class="bank-value">{money(bankTotal)}</span>
			</div>
		</div>
	{:else}
		<!-- Desk/grid hidden: Pixi Board+Frame underneath paints this side.
		     Keep counter + bank chrome above the transparent hole. -->
		<div class="nameplate chrome" style={nameplateStyle} data-test="duel-bank-{side}">
			{#if spinWin > 0 && !spinning && flowAmount > 0}
				<span class="flow-chip">+{money(flowAmount)}</span>
			{:else if spinWin > 0 && !spinning}
				<span class="spin-win">{money(spinWin)}</span>
			{/if}
			<span class="bank-value">{money(bankTotal)}</span>
		</div>
	{/if}
</article>

<style lang="scss">
	.duel-board {
		position: relative;
		flex: 0 0 auto;
		transition:
			filter 0.25s ease,
			transform 0.25s ease;
		filter: brightness(0.88);
	}

	.duel-board.is-active {
		filter: brightness(1.06);
		transform: translateY(-2px);
	}

	.duel-board.pixi-driven {
		filter: none;
		transform: none;
	}

	.counter {
		position: absolute;
		left: 2%;
		top: -1.55rem;
		z-index: 5;
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: rgba(18, 10, 28, 0.82);
		border: 1px solid rgba(255, 220, 140, 0.35);
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		color: #f6e6c2;
		line-height: 1.1;
		pointer-events: none;
	}

	.counter-label {
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		opacity: 0.85;
		text-transform: uppercase;
	}

	.counter-value {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.frame {
		position: relative;
		width: 100%;
		height: 100%;
		container-type: size;
	}

	.desk,
	.contour {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
	}

	.contour {
		z-index: 3;
	}

	.grid {
		position: absolute;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 1.2%;
		z-index: 2;
		overflow: hidden;
		box-sizing: border-box;
		padding: 1%;
	}

	.reel {
		display: grid;
		grid-template-rows: repeat(4, 1fr);
		gap: 1.2%;
		min-width: 0;
	}

	.cell {
		min-height: 0;
		display: grid;
		place-items: center;
	}

	.cell img {
		width: 92%;
		height: 92%;
		object-fit: contain;
	}

	.nameplate {
		position: absolute;
		z-index: 4;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		pointer-events: none;
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		color: #f6e6c2;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
		box-sizing: border-box;
		padding: 0 2%;
		overflow: visible;
		container-type: size;
	}

	/* When Pixi owns the desk, keep bank chrome in the chrome layer (parent z). */
	.nameplate.chrome {
		z-index: 1;
	}

	.bank-value {
		font-size: clamp(0.7rem, 2.4cqw, 1rem);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
		line-height: 1;
		white-space: nowrap;
	}

	.spin-win {
		position: absolute;
		top: -120%;
		left: 50%;
		transform: translateX(-50%);
		font-size: clamp(0.8rem, 2vw, 1.05rem);
		color: #ffe7a0;
		animation: duel-win-pop 0.35s ease-out;
		white-space: nowrap;
	}

	.flow-chip {
		position: absolute;
		top: -110%;
		left: 50%;
		transform: translateX(-50%);
		font-size: clamp(0.7rem, 1.8vw, 0.9rem);
		color: #9dffb0;
		animation: duel-flow-chip 0.7s ease-out forwards;
		white-space: nowrap;
	}

	@keyframes duel-win-pop {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(0.85);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) scale(1);
		}
	}

	@keyframes duel-flow-chip {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(6px);
		}
		30% {
			opacity: 1;
		}
		to {
			opacity: 0;
			transform: translateX(-50%) translateY(-8px);
		}
	}
</style>
