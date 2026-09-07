<script lang="ts">
	/**
	 * Paw → coins: designer clip on the row, then one continuous fly into the hat.
	 * The paw symbol itself (PB/PS/PG) is a board symbol and never pays / never
	 * flies — its cells are filtered out upstream in the pawCoinResolve handler.
	 */
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
		portraitBuyPanelLayoutHeightCanvas,
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

	// Wave clock: each coin mounts (and plays appear_flash) when its ring
	// delay elapses, so the conversion spreads outward from the paw cell.
	// Restarts on `cells` identity — every resolve / preview bump reassigns it.
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
		// Unscaled bound — speedMult ≥ 1 only ever shrinks the real wave window.
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
					buyPanelHeight: portraitBuyPanelLayoutHeightCanvas(context.stateLayoutDerived),
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
	const easeIn = (t: number) => t * t;

	const flyElapsed = (index: number) => {
		if (flyOrigin === null) return -1;
		return flyNow - flyOrigin - index * flyStaggerMs;
	};

	const flyProgress = (index: number) =>
		clamp01((flyElapsed(index) - anticipateMs) / flyDurationMs);

	/**
	 * Per-frame coin styles, split into two layers:
	 * - outer: position + translate + brim clip (axis-aligned — must NOT rotate,
	 *   so the clip line stays horizontal while the coin spins inside);
	 * - inner: scale / rotate / opacity.
	 * The hat spine is layered (slot `purple_back` = bowl interior, `purple` =
	 * front brim), but SpinePlayer can't render slot subsets and a second
	 * player would desync (random idle variants, reverse/hold timing). So the
	 * "into the hat" occlusion is emulated: whatever sank below the brim line
	 * is clipped away — the coin reads as dropping into the bowl.
	 */
	const flyState = (reel: number, paddedRow: number, index: number) => {
		const o = layout;
		const visibleRow = paddedRow - 1;
		const size = o.cell * COIN_PAW_BOX_SCALE;
		const left = o.left + reel * o.cell + (o.cell - size) / 2;
		const top = o.top + visibleRow * o.cell + (o.cell - size) / 2;
		const startCx = left + size / 2;
		const startCy = top + size / 2;
		const dx = o.hatX - startCx;
		const dy = o.hatY - startCy;
		// True parabola: with arcX = dx/2 the horizontal motion is linear, so the
		// bezier is a parabola in x. Control height is chosen so the apex sits
		// `lift` px ABOVE the higher of the two endpoints — the coin always
		// rises first, then drops into the hat.
		const lift = Math.min(200, Math.max(110, Math.abs(dx) * 0.3));
		const arcX = dx * 0.5;
		const arcY = 2 * (Math.min(0, dy) - lift) - dy * 0.5;
		// Front rim of the bowl opening (screen Y) — measured from the
		// rendered hold pose, comes with the catch point.
		const brimY = o.hatBrimY;

		const base = `left:${left}px;top:${top}px;width:${size}px;height:${size}px;`;
		const idle = { outer: base, inner: '' };

		if (!flying) return idle;

		const elapsed = flyElapsed(index);
		if (elapsed < 0) return idle;

		// Squash press: coil down, then the arc launch itself is the hop.
		if (elapsed < anticipateMs) {
			const a = clamp01(elapsed / anticipateMs);
			const press = a * a;
			const scaleX = 1 + 0.16 * press;
			const scaleY = 1 - 0.26 * press;
			const yOff = size * 0.05 * press;
			return {
				outer: `${base}transform:translate(0px,${yOff}px);`,
				inner: `transform:scale(${scaleX},${scaleY});`,
			};
		}

		const t = flyProgress(index);
		// Linear parameterization + high control point = ballistic lob: fast
		// upward launch, slow apex, accelerating drop into the hat.
		const p = t;
		const u = 1 - p;
		const x = 2 * u * p * arcX + p * p * dx;
		// Deep final dive — the brim clip submerges the coin into the bowl.
		const sinkT = clamp01((t - 0.85) / 0.15);
		const y = 2 * u * p * arcY + p * p * dy + sinkT * sinkT * size * 0.55;
		// Spring stretch right after the press release, relaxing early in flight.
		const spring = 1 - clamp01(t / 0.22);
		const scale = 1 - easeIn(t) * 0.45;
		const scaleX = scale * (1 - 0.07 * spring);
		const scaleY = scale * (1 + 0.14 * spring);
		const rotate = t * 360;
		// Insurance fade — normally the brim clip has already hidden the coin.
		const opacity = t < 0.97 ? 1 : 1 - (t - 0.97) / 0.03;
		// Clip whatever sank below the brim. Measured from the div's bottom
		// edge so the visible region ends exactly at brimY (the disc is
		// centered, so the clip bites it precisely when it touches the brim).
		const clipPx = t > 0.8 ? clamp(top + y + size - brimY, 0, size) : 0;

		return {
			outer:
				`${base}transform:translate(${x}px,${y}px);` +
				(clipPx > 0 ? `clip-path:inset(0px 0px ${clipPx}px 0px);` : ''),
			inner: `opacity:${opacity};transform:scale(${scaleX},${scaleY}) rotate(${rotate}deg);`,
		};
	};

	const clamp = (value: number, min: number, max: number) =>
		Math.max(min, Math.min(max, value));
</script>

{#if show && showMascotLayout && cells.length > 0}
	{#each cells as c, i (`${c.reel}:${c.row}:${c.tier}:${previewNonce}:${playId}`)}
		{@const s = flyState(c.reel, c.row, i)}
		<div class="coin-cell" style={s.outer}>
			{#if coinAppeared(i)}
				<div class="coin-spin" style={s.inner}>
					<CoinPawSprite tier={c.tier > 0 ? c.tier : 1} speed={speedMult} />
				</div>
			{/if}
		</div>
	{/each}
{/if}

<style lang="scss">
	.coin-cell {
		position: fixed;
		/* Inside .html-mascot-layer (z42): below the mascot (z0) so the hat
		   and hand paint over coins on the right reels. Overlay is still
		   above the Pixi board because the layer itself is z42. */
		z-index: -1;
		pointer-events: none;
		overflow: visible;
		will-change: transform;
	}

	.coin-spin {
		width: 100%;
		height: 100%;
		transform-origin: center center;
		will-change: transform, opacity;
	}
</style>
