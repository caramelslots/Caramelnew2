<script lang="ts">
	/**
	 * Paw → coins: flip on the row, then fly into the BAG above the mascot.
	 */
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		BOARD_LAYOUT_OFFSETS,
		isPopoutViewport,
		SYMBOL_SIZE,
	} from '../game/constants';
	import {
		portraitBuyPanelCanvasTop,
		portraitBuyPanelHeightCanvas,
	} from '../game/portraitHudLayout';
	import {
		getMascotPortraitScreenBox,
		getMascotScreenBox,
		MASCOT_BASE_SIZE,
	} from '../game/mascotHtmlSpine';
	import { numberToCurrencyString } from 'utils-shared/amount';

	const BAG_W_BASE = 118;
	const BAG_H_BASE = 96;

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const isPortrait = $derived(layoutType === 'portrait');
	const showMascotLayout = $derived(
		layoutType === 'desktop' ||
			layoutType === 'tablet' ||
			isPopout ||
			isPortrait,
	);

	const cells = $derived(context.stateGame.pawCoinCells);
	const bagVisible = $derived(context.stateGame.pawCoinBagVisible);
	const flying = $derived(context.stateGame.pawCoinFlying);
	const total = $derived(context.stateGame.pawCoinTotal);

	const layout = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const board = context.stateGameDerived.boardLayout();
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;
		const cell = SYMBOL_SIZE * ml.scale * board.scale;

		const mascot = isPortrait
			? getMascotPortraitScreenBox({
					canvasWidth: canvasSizes.width,
					boardCenterY: centerY,
					halfH,
					buyPanelTop: portraitBuyPanelCanvasTop(context.stateLayoutDerived),
					buyPanelHeight: portraitBuyPanelHeightCanvas(context.stateLayoutDerived),
				})
			: getMascotScreenBox({
					centerX,
					centerY,
					halfW,
					halfH,
				});
		const sizeScale = mascot.height / MASCOT_BASE_SIZE.height;
		const bagW = Math.round(BAG_W_BASE * sizeScale);
		const bagH = Math.round(BAG_H_BASE * sizeScale);

		// Bag above the body column (ignore idle3 left overscan).
		const bagLeft = mascot.bodyLeft + (mascot.bodyWidth - bagW) / 2;
		const bagTop = mascot.top - bagH - 6;
		const bagCenterX = bagLeft + bagW / 2;
		const bagCenterY = bagTop + bagH * 0.55;

		return {
			left: centerX - halfW,
			top: centerY - halfH,
			cell,
			bagLeft,
			bagTop,
			bagW,
			bagH,
			bagCenterX,
			bagCenterY,
		};
	});

	const bagStyle = $derived(
		`left:${layout.bagLeft}px;top:${layout.bagTop}px;width:${layout.bagW}px;height:${layout.bagH}px;`,
	);

	const cellStyle = (reel: number, paddedRow: number, tier: number, index: number) => {
		const o = layout;
		const visibleRow = paddedRow - 1;
		const size = o.cell * 0.8;
		const left = o.left + reel * o.cell + o.cell * 0.1;
		const top = o.top + visibleRow * o.cell + o.cell * 0.1;
		const startCx = left + size / 2;
		const startCy = top + size / 2;
		const dx = o.bagCenterX - startCx;
		const dy = o.bagCenterY - startCy;
		const delay = index * 0.06;
		const tint =
			tier === 3 ? '#e8c46a' : tier === 2 ? '#c0c4cc' : tier === 1 ? '#cd7f32' : '#666';
		return [
			`left:${left}px`,
			`top:${top}px`,
			`width:${size}px`,
			`height:${size}px`,
			`--coin:${tint}`,
			`--dx:${dx}px`,
			`--dy:${dy}px`,
			`--fly-delay:${delay}s`,
		].join(';');
	};
</script>

{#if show && showMascotLayout && bagVisible}
	<div class="coin-bag" class:catching={flying} style={bagStyle} aria-hidden="true">
		<div class="bag-body">
			<div class="bag-mouth"></div>
			<div class="bag-label">BAG</div>
			<div class="bag-amount">{numberToCurrencyString(total)}</div>
		</div>
	</div>
{/if}

{#if show && showMascotLayout && cells.length > 0}
	{#each cells as c, i (`${c.reel}:${c.row}`)}
		{@const shouldFly = flying && c.tier > 0}
		<div
			class="coin-cell"
			class:zero={c.tier === 0}
			class:flying={shouldFly}
			class:fade-out={flying && c.tier === 0}
			style={cellStyle(c.reel, c.row, c.tier, i)}
		>
			<span class="glyph">🪙</span>
			{#if c.tier > 0}
				<span class="mult">×{c.tier}</span>
			{:else}
				<span class="mult">0</span>
			{/if}
		</div>
	{/each}
{/if}

<style lang="scss">
	.coin-cell {
		position: fixed;
		z-index: 46;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, var(--coin), #222 85%);
		border: 2px solid rgba(255, 255, 255, 0.35);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
		animation: coin-flip 0.55s ease-out both;
	}

	.coin-cell.flying {
		animation: coin-fly-to-bag 0.55s cubic-bezier(0.33, 0.1, 0.25, 1) var(--fly-delay, 0s) both;
		z-index: 48;
	}

	.coin-cell.zero {
		opacity: 0.45;
		filter: grayscale(0.6);
	}

	.coin-cell.fade-out {
		animation: coin-fade 0.35s ease-out forwards;
	}

	.glyph {
		font-size: 1.1rem;
		line-height: 1;
	}

	.mult {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.7rem;
		font-weight: 700;
		color: #fff;
		text-shadow: 0 1px 2px #000;
	}

	.coin-bag {
		position: fixed;
		z-index: 47;
		pointer-events: none;
		animation: bag-in 0.35s ease-out both;
	}

	.coin-bag.catching .bag-body {
		animation: bag-catch 0.35s ease-out;
	}

	.bag-body {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding: 0.55rem 0.4rem 0.45rem;
		box-sizing: border-box;
		/* Sack silhouette */
		background:
			radial-gradient(ellipse 90% 40% at 50% 12%, rgba(90, 62, 28, 0.95), transparent 55%),
			linear-gradient(180deg, #6b4a24 0%, #3d2812 55%, #2a1a0c 100%);
		border: 2px solid #c9a24a;
		border-radius: 48% 48% 38% 38% / 28% 28% 62% 62%;
		box-shadow:
			inset 0 8px 14px rgba(255, 220, 140, 0.12),
			0 10px 22px rgba(0, 0, 0, 0.5);
	}

	.bag-mouth {
		position: absolute;
		top: 8%;
		left: 18%;
		right: 18%;
		height: 10%;
		border-radius: 50%;
		background: rgba(12, 8, 4, 0.85);
		border: 1px solid rgba(201, 162, 74, 0.55);
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.65);
	}

	.bag-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		color: #f0d78c;
		text-shadow: 0 1px 2px #000;
		margin-bottom: 0.1rem;
	}

	.bag-amount {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.95rem;
		font-weight: 700;
		color: #fff;
		line-height: 1.1;
		text-shadow: 0 1px 3px #000;
	}

	@keyframes coin-flip {
		from {
			transform: rotateY(90deg) scale(0.4);
			opacity: 0;
		}
		to {
			transform: rotateY(0) scale(1);
			opacity: 1;
		}
	}

	@keyframes coin-fly-to-bag {
		0% {
			transform: translate(0, 0) scale(1) rotate(0deg);
			opacity: 1;
		}
		70% {
			opacity: 1;
		}
		100% {
			transform: translate(var(--dx), var(--dy)) scale(0.28) rotate(220deg);
			opacity: 0;
		}
	}

	@keyframes coin-fade {
		to {
			opacity: 0;
			transform: scale(0.6);
		}
	}

	@keyframes bag-in {
		from {
			transform: translateY(10px) scale(0.88);
			opacity: 0;
		}
		to {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
	}

	@keyframes bag-catch {
		0%,
		100% {
			transform: scale(1);
		}
		40% {
			transform: scale(1.08);
		}
	}
</style>
