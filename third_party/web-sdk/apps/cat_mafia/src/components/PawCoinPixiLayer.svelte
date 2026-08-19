<!--
	Paw-coin appear + fly into the hat — Pixi, under MascotPixi (zIndex 5).
	Same screen-space math as HTML PawCoinOverlay. Outer = position + brim clip
	(axis-aligned); inner = scale / rotate / alpha — mirrors the CSS split that
	keeps the brim clip horizontal while the coin spins.
-->
<script lang="ts">
	import { Container, Graphics } from 'pixi-svelte';
	import type * as PIXI from 'pixi.js';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		BOARD_LAYOUT_OFFSETS,
		isPopoutViewport,
		PAW_COIN_WAVE_STEP_MS,
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
		MASCOT_COIN_ANTICIPATE_MS,
		MASCOT_COIN_FLY_DURATION_MS,
		MASCOT_COIN_FLY_STAGGER_MS,
	} from '../game/mascotHtmlSpine';
	import { gameSpeedMultFor } from '../game/gameSpeed';
	import { COIN_PAW_SPINE_SIZE_RATIOS } from '../game/coinSpriteSheet';
	import { coinPawSkinForTier } from '../game/coinHtmlSpine';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { devPreview } from '../game/devPreview.svelte';
	import CoinPawFlyCoin from './CoinPawFlyCoin.svelte';

	type Props = { zIndex?: number };

	const props: Props = $props();
	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const isPortrait = $derived(layoutType === 'portrait');
	const showMascotLayout = $derived(
		!stateDuel.active &&
			(layoutType === 'desktop' ||
				layoutType === 'tablet' ||
				layoutType === 'landscape' ||
				isPopout ||
				isPortrait),
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
				appearRing: i,
				appearDelayMs: i * PAW_COIN_WAVE_STEP_MS,
			}));
		}
		const tier = preview.tiers[0] ?? 1;
		return [0, 1, 2, 3, 4].map((reel, i) => ({
			reel,
			row,
			tier,
			win: 0,
			appearRing: i,
			appearDelayMs: i * PAW_COIN_WAVE_STEP_MS,
		}));
	});
	const cells = $derived(
		previewCells.length > 0 ? previewCells : context.stateGame.pawCoinCells,
	);
	const flying = $derived(previewCells.length > 0 ? false : context.stateGame.pawCoinFlying);
	const previewNonce = $derived(devPreview.pawCoins?.nonce ?? 0);
	const playId = $derived(context.stateGame.pawCoinPlayId);
	const speedMult = $derived(gameSpeedMultFor(context.stateGame.gameSpeed));
	const flyDurationMs = $derived(MASCOT_COIN_FLY_DURATION_MS / speedMult);
	const flyStaggerMs = $derived(MASCOT_COIN_FLY_STAGGER_MS / speedMult);
	const anticipateMs = $derived(MASCOT_COIN_ANTICIPATE_MS / speedMult);

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

	let appearNow = $state(0);
	let appearOrigin = $state<number | null>(null);

	$effect(() => {
		const list = cells;
		if (list.length === 0) {
			appearOrigin = null;
			return;
		}
		const origin = performance.now();
		appearOrigin = origin;
		appearNow = origin;
		const maxDelay = Math.max(...list.map((c) => c.appearDelayMs));
		let raf = 0;
		const tick = (now: number) => {
			appearNow = now;
			if (now - origin < maxDelay + 100) {
				raf = requestAnimationFrame(tick);
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	const coinAppeared = (index: number) => {
		if (flying) return true;
		if (appearOrigin === null) return false;
		return appearNow - appearOrigin >= cells[index].appearDelayMs / speedMult;
	};

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
			hatBrimY: hat.brimY,
		};
	});

	const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
	const clamp = (value: number, min: number, max: number) =>
		Math.max(min, Math.min(max, value));
	const easeIn = (t: number) => t * t;

	const flyElapsed = (index: number) => {
		if (flyOrigin === null) return -1;
		return flyNow - flyOrigin - index * flyStaggerMs;
	};

	const flyProgress = (index: number) =>
		clamp01((flyElapsed(index) - anticipateMs) / flyDurationMs);

	type CoinPose = {
		x: number;
		y: number;
		size: number;
		scaleX: number;
		scaleY: number;
		rotation: number;
		alpha: number;
		/** Visible height from top of coin box; size means no clip. */
		visibleH: number;
	};

	const flyState = (reel: number, paddedRow: number, index: number): CoinPose => {
		const o = layout;
		const visibleRow = paddedRow - 1;
		const size = o.cell * COIN_PAW_SPINE_SIZE_RATIOS.width;
		const left = o.left + reel * o.cell + (o.cell - size) / 2;
		const top = o.top + visibleRow * o.cell + (o.cell - size) / 2;
		const startCx = left + size / 2;
		const startCy = top + size / 2;
		const dx = o.hatX - startCx;
		const dy = o.hatY - startCy;
		const lift = Math.min(200, Math.max(110, Math.abs(dx) * 0.3));
		const arcX = dx * 0.5;
		const arcY = 2 * (Math.min(0, dy) - lift) - dy * 0.5;
		const brimY = o.hatBrimY;

		const idle: CoinPose = {
			x: startCx,
			y: startCy,
			size,
			scaleX: 1,
			scaleY: 1,
			rotation: 0,
			alpha: 1,
			visibleH: size,
		};

		if (!flying) return idle;

		const elapsed = flyElapsed(index);
		if (elapsed < 0) return idle;

		if (elapsed < anticipateMs) {
			const a = clamp01(elapsed / anticipateMs);
			const press = a * a;
			return {
				...idle,
				y: startCy + size * 0.05 * press,
				scaleX: 1 + 0.16 * press,
				scaleY: 1 - 0.26 * press,
			};
		}

		const t = flyProgress(index);
		const p = t;
		const u = 1 - p;
		const xOff = 2 * u * p * arcX + p * p * dx;
		const sinkT = clamp01((t - 0.85) / 0.15);
		const yOff = 2 * u * p * arcY + p * p * dy + sinkT * sinkT * size * 0.55;
		const spring = 1 - clamp01(t / 0.22);
		const scale = 1 - easeIn(t) * 0.45;
		const scaleX = scale * (1 - 0.07 * spring);
		const scaleY = scale * (1 + 0.14 * spring);
		const rotation = (t * 360 * Math.PI) / 180;
		const alpha = t < 0.97 ? 1 : 1 - (t - 0.97) / 0.03;
		// Same brim math as HTML: clip from bottom of the (unrotated) coin box.
		const clipPx = t > 0.8 ? clamp(top + yOff + size - brimY, 0, size) : 0;

		return {
			x: startCx + xOff,
			y: startCy + yOff,
			size,
			scaleX,
			scaleY,
			rotation,
			alpha,
			visibleH: size - clipPx,
		};
	};

	/** Axis-aligned brim window in outer (unrotated) local space. */
	const drawBrimMask = (size: number, visibleH: number) => (g: PIXI.Graphics) => {
		g.rect(-size / 2, -size / 2, size, Math.max(1, visibleH));
		g.fill(0xffffff);
	};
</script>

{#if show && showMascotLayout && cells.length > 0}
	<Container zIndex={props.zIndex ?? 5} sortableChildren>
		{#each cells as c, i (`${c.reel}:${c.row}:${c.tier}:${previewNonce}:${playId}`)}
			{#if coinAppeared(i)}
				{@const s = flyState(c.reel, c.row, i)}
				<!-- Outer: screen position + axis-aligned brim clip (must not rotate). -->
				<Container x={s.x} y={s.y}>
					<Graphics draw={drawBrimMask(s.size, s.visibleH)} isMask />
					<!-- Inner: squash / spin / fade — matches HTML .coin-spin. -->
					<Container
						scale={{ x: s.scaleX, y: s.scaleY }}
						rotation={s.rotation}
						alpha={s.alpha}
					>
						<CoinPawFlyCoin
							skin={coinPawSkinForTier(c.tier > 0 ? c.tier : 1)}
							size={s.size}
							timeScale={speedMult}
						/>
					</Container>
				</Container>
			{/if}
		{/each}
	</Container>
{/if}
