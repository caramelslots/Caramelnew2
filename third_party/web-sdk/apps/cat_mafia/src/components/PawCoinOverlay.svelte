<script lang="ts">
	/**
	 * Paw → coins: designer Spine clip (baked) on the row, then fly into the hat.
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
		getMascotHatCatchPoint,
		getMascotPortraitScreenBox,
		getMascotScreenBox,
		MASCOT_COIN_FLY_DURATION_MS,
		MASCOT_COIN_FLY_STAGGER_MS,
	} from '../game/mascotHtmlSpine';
	import { gameSpeedMultFor } from '../game/gameSpeed';
	import { COIN_PAW_BOX_SCALE } from '../game/coinSpriteSheet';
	import { devPreview } from '../game/devPreview.svelte';
	import CoinPawSprite from './CoinPawSprite.svelte';

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

	const previewCells = $derived.by(() => {
		const preview = devPreview.pawCoins;
		if (!preview) return [];
		const row = 2;
		if (preview.tiers.length >= 3) {
			return preview.tiers.map((tier, i) => ({
				reel: 1 + i,
				row,
				tier,
				win: 0,
			}));
		}
		const tier = preview.tiers[0] ?? 1;
		return [0, 1, 2, 3, 4].map((reel) => ({ reel, row, tier, win: 0 }));
	});
	const cells = $derived(
		previewCells.length > 0 ? previewCells : context.stateGame.pawCoinCells,
	);
	const flying = $derived(previewCells.length > 0 ? false : context.stateGame.pawCoinFlying);
	const previewNonce = $derived(devPreview.pawCoins?.nonce ?? 0);
	const speedMult = $derived(gameSpeedMultFor(context.stateGame.gameSpeed));
	const flyDurationS = $derived(MASCOT_COIN_FLY_DURATION_MS / 1000 / speedMult);
	const flyStaggerS = $derived(MASCOT_COIN_FLY_STAGGER_MS / 1000 / speedMult);

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

		const hat = getMascotHatCatchPoint(mascot);

		return {
			left: centerX - halfW,
			top: centerY - halfH,
			cell,
			hatX: hat.x,
			hatY: hat.y,
		};
	});

	const cellStyle = (reel: number, paddedRow: number, index: number) => {
		const o = layout;
		const visibleRow = paddedRow - 1;
		const size = o.cell * COIN_PAW_BOX_SCALE;
		const left = o.left + reel * o.cell + (o.cell - size) / 2;
		const top = o.top + visibleRow * o.cell + (o.cell - size) / 2;
		const startCx = left + size / 2;
		const startCy = top + size / 2;
		const dx = o.hatX - startCx;
		const dy = o.hatY - startCy;
		const arcX = dx * 0.55;
		const arcY = dy * 0.4 - Math.min(72, Math.abs(dy) * 0.18);
		const delay = index * flyStaggerS;
		return [
			`left:${left}px`,
			`top:${top}px`,
			`width:${size}px`,
			`height:${size}px`,
			`--dx:${dx}px`,
			`--dy:${dy}px`,
			`--arc-x:${arcX}px`,
			`--arc-y:${arcY}px`,
			`--fly-delay:${delay}s`,
			`--fly-duration:${flyDurationS}s`,
		].join(';');
	};
</script>

{#if show && showMascotLayout && cells.length > 0}
	{#each cells as c, i (`${c.reel}:${c.row}:${c.tier}:${previewNonce}`)}
		{@const shouldFly = flying && c.tier > 0}
		<div
			class="coin-cell"
			class:flying={shouldFly}
			class:fade-out={flying && c.tier === 0}
			style={cellStyle(c.reel, c.row, i)}
		>
			<CoinPawSprite tier={c.tier > 0 ? c.tier : 1} speed={speedMult} />
		</div>
	{/each}
{/if}

<style lang="scss">
	.coin-cell {
		position: fixed;
		/* Above Buy Bonus (45) and mascot (47). */
		z-index: 48;
		pointer-events: none;
		overflow: visible;
	}

	.coin-cell.flying {
		animation: coin-fly-to-hat var(--fly-duration, 0.55s) cubic-bezier(0.33, 0.1, 0.25, 1)
			var(--fly-delay, 0s) both;
		z-index: 49;
	}

	.coin-cell.fade-out {
		animation: coin-fade 0.35s ease-out forwards;
	}

	@keyframes coin-fly-to-hat {
		0% {
			transform: translate(0, 0) scale(1) rotate(0deg);
			opacity: 1;
		}
		55% {
			transform: translate(var(--arc-x), var(--arc-y)) scale(0.62) rotate(120deg);
			opacity: 1;
		}
		88% {
			opacity: 1;
		}
		100% {
			transform: translate(var(--dx), var(--dy)) scale(0.14) rotate(240deg);
			opacity: 0;
		}
	}

	@keyframes coin-fade {
		to {
			opacity: 0;
			transform: scale(0.6);
		}
	}
</style>
