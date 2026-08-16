<script lang="ts">
	/**
	 * Paw → coins: designer clip on the row, then one continuous fly into the hat.
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
	const flyDurationMs = $derived(MASCOT_COIN_FLY_DURATION_MS / speedMult);
	const flyStaggerMs = $derived(MASCOT_COIN_FLY_STAGGER_MS / speedMult);

	let flyNow = $state(0);
	let flyOrigin = $state<number | null>(null);

	$effect(() => {
		if (!flying) {
			flyOrigin = null;
			return;
		}
		const origin = performance.now();
		flyOrigin = origin;
		flyNow = origin;
		let raf = 0;
		const tick = (now: number) => {
			flyNow = now;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

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

	const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
	const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
	const easeIn = (t: number) => t * t;

	const flyProgress = (index: number) => {
		if (flyOrigin === null) return 0;
		return clamp01((flyNow - flyOrigin - index * flyStaggerMs) / flyDurationMs);
	};

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

		const parts = [
			`left:${left}px`,
			`top:${top}px`,
			`width:${size}px`,
			`height:${size}px`,
		];

		if (!flying) return parts.join(';');

		const t = flyProgress(index);
		const p = easeInOut(t);
		const u = 1 - p;
		const x = 2 * u * p * arcX + p * p * dx;
		const y = 2 * u * p * arcY + p * p * dy;
		const scale = 1 - easeIn(t) * 0.88;
		const rotate = t * 360;
		const opacity = t < 0.82 ? 1 : 1 - (t - 0.82) / 0.18;
		parts.push(
			`z-index:49`,
			`opacity:${opacity}`,
			`transform:translate(${x}px,${y}px) scale(${scale}) rotate(${rotate}deg)`,
		);
		return parts.join(';');
	};
</script>

{#if show && showMascotLayout && cells.length > 0}
	{#each cells as c, i (`${c.reel}:${c.row}:${c.tier}:${previewNonce}`)}
		<div class="coin-cell" style={cellStyle(c.reel, c.row, i)}>
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
		transform-origin: center center;
		will-change: transform, opacity;
	}
</style>
