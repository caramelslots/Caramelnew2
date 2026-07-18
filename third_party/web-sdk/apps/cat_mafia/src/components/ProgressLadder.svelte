<!--
	ProgressLadder.svelte — Bonus collection bar for Free Spins.

	Desktop (PC)  → bar_v.png  (vertical, right side of screen)
	Other layouts → bar_h.png  (horizontal, bottom of screen)

	As the player collects Bonus (kitty) symbols, slots fill top→bottom / left→right
	with the colored Bonus cat (cat_static.png, already includes the raised paw +
	BONUS medallion), placed to sit exactly on top of the grey cat silhouettes baked
	into the bar texture.
	Every BONUSES_PER_TIER collected = tier-up.

	All geometry below is expressed as a percentage of the FULL bar PNG (the element
	uses background-size:100% 100%), derived by measuring the silhouettes / counter
	rectangle directly from bar_v.png (247×592) and bar_h.png (657×217).
-->
<script lang="ts" module>
	export type EmitterEventProgressLadder =
		| { type: 'ladderShow' }
		| { type: 'ladderHide' }
		| { type: 'ladderPulse' };

	type Box = { left: number; top: number; width: number; height: number };

	type Layout = {
		/** cat box (% of bar) — the cat sprite already includes the raised paw */
		catW: number;
		catH: number;
		/** per-slot cat-center coordinates (% of bar) */
		slots: { cx: number; cy: number }[];
		/** progress counter rectangle (% of bar) */
		counter: Box;
		/** corner radius of the counter fill, in CSS px (≈30% of its rendered height) */
		counterRadius: number;
	};

	// Vertical bar — bar_v.png (247 × 592). 4 cats stacked, counter at bottom.
	const LAYOUT_V: Layout = {
		catW: 30.3,
		catH: 15.2,
		slots: [
			{ cx: 46.5, cy: 18.6 },
			{ cx: 46.5, cy: 35.1 },
			{ cx: 46.5, cy: 51.6 },
			{ cx: 46.5, cy: 68.2 },
		],
		counter: { left: 29.15, top: 80.07, width: 35.4, height: 5.57 },
		counterRadius: 5.3,
	};

	// Horizontal bar — bar_h.png (657 × 217). 4 cats in a row, counter on the right.
	const LAYOUT_H: Layout = {
		catW: 11.5,
		catH: 40.5,
		slots: [
			{ cx: 18.04, cy: 58 },
			{ cx: 32.88, cy: 58 },
			{ cx: 47.95, cy: 58 },
			{ cx: 63.32, cy: 58 },
		],
		counter: { left: 72.9, top: 49.2, width: 15.6, height: 20.2 },
		counterRadius: 5.7,
	};
</script>

<script lang="ts">
	import { backOut, cubicOut } from 'svelte/easing';
	import type { TransitionConfig } from 'svelte/transition';
	import { getContext } from '../game/context';
	import { devPreview } from '../game/devPreview.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		BONUS_BAR_H_SHIFT_SCREEN_X,
		BONUS_BAR_H_SHIFT_SCREEN_Y,
		BOARD_LAYOUT_OFFSETS,
		getDesktopBonusBarVDims,
		getPortraitBonusBarHeightPx,
		getPortraitBonusBarWidthPx,
		getPopoutBonusBarVScale,
		getPortraitDeviceWidth,
		getPortraitPhoneScaleFactor,
		isPopoutViewport,
	} from '../game/constants';
	import assets from '../game/assets';

	const context = getContext();

	const barVUrl = assets.bonusBarV.src;
	const barHUrl = assets.bonusBarH.src;
	const catStaticUrl = assets.bonusBarCat.src;

	const BONUSES_PER_TIER = 4;
	const BAR_ENTER_MS = 650;
	const BAR_LEAVE_MS = 400;

	const barOffsets = (node: Element, compactScale: number) => {
		const vertical = node.classList.contains('bar-v');
		return vertical
			? { x: 72 * compactScale, y: 0 }
			: { x: 0, y: 48 * compactScale };
	};

	const barEnter = (node: Element, compactScale: number): TransitionConfig => {
		const { x, y } = barOffsets(node, compactScale);
		return {
			duration: BAR_ENTER_MS,
			easing: backOut,
			css: (t) => {
				const scale = 0.72 + 0.28 * t;
				return `opacity:${t};transform:translate(${(1 - t) * x}px,${(1 - t) * y}px) scale(${scale});`;
			},
		};
	};

	const barLeave = (node: Element, compactScale: number): TransitionConfig => {
		const { x, y } = barOffsets(node, compactScale);
		return {
			duration: BAR_LEAVE_MS,
			easing: cubicOut,
			css: (t) => {
				const scale = 0.82 + 0.18 * t;
				return `opacity:${t};transform:translate(${(1 - t) * x}px,${(1 - t) * y}px) scale(${scale});`;
			},
		};
	};

	let pulse = $state(false);

	context.eventEmitter.subscribeOnMount({
		ladderShow: () => {
			stateGame.ladderVisible = true;
		},
		ladderHide: () => {
			stateGame.ladderVisible = false;
		},
		ladderPulse: () => {
			pulse = true;
			setTimeout(() => (pulse = false), 700);
		},
	});

	const canvasSizeType = $derived(context.stateLayoutDerived.canvasSizeType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const portraitCompactScale = $derived(
		getPortraitPhoneScaleFactor(canvasSizeType, getPortraitDeviceWidth(canvasSizes)),
	);
	const popoutBarScale = $derived(getPopoutBonusBarVScale(canvasSizes));

	// devPreview.ladder toggled from the DEV panel (DevButtons.svelte).
	const isVisible = $derived(
		(devPreview.ladder || stateGame.ladderVisible) && !stateGame.freeSpinIntroActive,
	);
	// Desktop + popout L/S → vertical bar (bar_v) to the right of the board.
	const isDesktop = $derived(
		devPreview.ladder
			? !devPreview.ladderHorizontal
			: context.stateLayoutDerived.layoutType() === 'desktop' || isPopout,
	);

	// Rendered pixel sizes of the bar PNGs (inline style; .bar-v CSS is fallback only).
	const BAR_DIMS = $derived({
		v: getDesktopBonusBarVDims(canvasSizes),
		h: {
			w: getPortraitBonusBarWidthPx(canvasSizeType, getPortraitDeviceWidth(canvasSizes)),
			h: getPortraitBonusBarHeightPx(canvasSizeType, getPortraitDeviceWidth(canvasSizes)),
		},
	});
	const barCompactScale = $derived(isDesktop ? popoutBarScale : portraitCompactScale);
	const bonusBarMobileYShift = $derived(
		!isDesktop &&
		(canvasSizeType === 'smallMobile' || canvasSizeType === 'mobile')
			? BONUS_BAR_H_SHIFT_SCREEN_Y * portraitCompactScale
			: 0,
	);
	// Gap (px) between the board edge and the bar.
	const GAP = $derived(16 * barCompactScale);
	const bonusInCurrentTier = $derived(
		devPreview.ladder
			? devPreview.ladderFilled
			: context.stateGame.bonusCollected % BONUSES_PER_TIER,
	);
	// 0..1 fraction used by clip-path fill
	const progressScale = $derived(bonusInCurrentTier / BONUSES_PER_TIER);

	const layout = $derived(isDesktop ? LAYOUT_V : LAYOUT_H);

	// Pre-compute the absolute cat box (% of bar) for each of the 4 slots.
	const placements = $derived(
		layout.slots.map(({ cx, cy }) => ({
			cat: {
				left: cx - layout.catW / 2,
				top: cy - layout.catH / 2,
				width: layout.catW,
				height: layout.catH,
			} as Box,
		})),
	);

	const boxStyle = (b: Box) =>
		`left:${b.left}%;top:${b.top}%;width:${b.width}%;height:${b.height}%;`;

	// Fixed DOM overlay. Vertical bar follows the board; horizontal bar (portrait /
	// tablet / landscape) is centered on the screen — board may use BOARD_LAYOUT_OFFSETS.x.
	const barPos = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const layoutType = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const boardCenterX = ml.x + off.x * ml.scale;
		const boardCenterY = ml.y + off.y * ml.scale;
		const board = context.stateGameDerived.boardLayout();
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;

		if (isDesktop) {
			const d = BAR_DIMS.v;
			return {
				left: boardCenterX + halfW + GAP,
				top: boardCenterY - d.h / 2,
				width: d.w,
				height: d.h,
			};
		}
		const d = BAR_DIMS.h;
		return {
			left: ml.x - d.w / 2 + BONUS_BAR_H_SHIFT_SCREEN_X * portraitCompactScale,
			top: boardCenterY + halfH + GAP + bonusBarMobileYShift,
			width: d.w,
			height: d.h,
		};
	});

	const barBoxStyle = $derived.by(() => {
		const p = barPos;
		const bg = isDesktop ? barVUrl : barHUrl;
		return `left:${p.left}px;top:${p.top}px;width:${p.width}px;height:${p.height}px;background-image:url(${bg});`;
	});

	const counterRadiusPx = $derived(layout.counterRadius * barCompactScale);
</script>

{#if isVisible}
	<div
		class="bonus-bar"
		class:bar-v={isDesktop}
		class:bar-h={!isDesktop}
		class:pulse
		class:under-smoke={stateGame.transitionActive}
		data-test="progress-ladder"
		in:barEnter={barCompactScale}
		out:barLeave={barCompactScale}
		style={barBoxStyle}
	>
		{#each placements as p, i (i)}
			{@const filled = i < bonusInCurrentTier}
			<!--
				Vertical bar fills top→bottom, horizontal fills left→right.
				cat_static already includes the
				raised paw + BONUS medallion, so it sits on the whole grey silhouette.
			-->
			<div class="cat-wrap" class:filled style={boxStyle(p.cat)}>
				<img class="kitty" src={catStaticUrl} alt="" />
			</div>
		{/each}

		<div class="progress-rect" style="{boxStyle(layout.counter)}--cr:{counterRadiusPx}px;">
			<div class="progress-fill" style:--pscale={progressScale}></div>
		</div>
	</div>
{/if}

<style lang="scss">
	/* ─── Wrapper ──────────────────────────────────────────────────── */
	.bonus-bar {
		position: fixed;
		z-index: 40;
		background-repeat: no-repeat;
		background-size: 100% 100%;
		transform-origin: center center;
		transition: filter 0.15s ease;
	}

	/* While cloud transition plays, Pixi canvas sits at z-index 50 — keep bar below it. */
	.bonus-bar.under-smoke {
		z-index: 30;
	}

	/* ─── Vertical bar (desktop / PC) — bar_v.png (247×592) ────────── */
	/* left/top are set inline (JS) to anchor the bar to the game board. */
	.bar-v {
		/* keep PNG aspect ratio 247:592 */
		width: 130px;
		height: 311.6px;
	}

	/* ─── Cat (overlay on silhouette) ─────────────────────────────── */
	.cat-wrap {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.kitty {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		opacity: 0;
		filter: drop-shadow(0 0 4px rgba(255, 210, 60, 0.9));
	}

	.cat-wrap.filled .kitty {
		animation: kitty-appear 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
	}

	@keyframes kitty-appear {
		0% {
			opacity: 0;
			transform: scale(0.2) rotate(-15deg);
		}
		55% {
			opacity: 1;
			transform: scale(1.15) rotate(4deg);
		}
		75% {
			transform: scale(0.92) rotate(-2deg);
		}
		90% {
			transform: scale(1.04) rotate(1deg);
		}
		100% {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
	}

	/* ─── Progress counter rectangle ──────────────────────────────── */
	/* pill-shaped to match the rounded counter window baked into the bar */
	.progress-rect {
		position: absolute;
		border-radius: var(--cr, 6px);
		overflow: hidden;
		padding: 0;
	}

	.progress-fill {
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, #ff9a2e 0%, #ffd84a 60%, #fff8a0 100%);
		border-radius: var(--cr, 6px);
		/* fill left → right */
		clip-path: inset(0 calc(100% * (1 - var(--pscale, 0))) 0 0 round var(--cr, 6px));
		transition: clip-path 0.45s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 0 6px rgba(255, 210, 60, 0.8);
	}

	/* ─── Tier-up pulse ───────────────────────────────────────────── */
	.pulse {
		filter: drop-shadow(0 0 14px rgba(255, 210, 60, 1));
		animation: bar-pulse 0.7s ease-out forwards;
	}

	@keyframes bar-pulse {
		0% {
			filter: drop-shadow(0 0 0px rgba(255, 210, 60, 0));
		}
		40% {
			filter: drop-shadow(0 0 18px rgba(255, 210, 60, 1));
		}
		100% {
			filter: drop-shadow(0 0 0px rgba(255, 210, 60, 0));
		}
	}
</style>
