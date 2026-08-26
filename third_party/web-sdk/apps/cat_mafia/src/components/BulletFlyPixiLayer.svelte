<!--
	FS bullet fly in Pixi under MascotPixi (zIndex 5) so the catching hand
	occludes the cartridge on arrival — same stacking as PawCoinPixiLayer.
	(HTML overlay always sat above the whole canvas, including the fist.)
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		BOARD_LAYOUT_OFFSETS,
		BULLET_FLY_MS,
		isPopoutViewport,
		SYMBOL_SIZE,
	} from '../game/constants';
	import {
		portraitBuyPanelCanvasTop,
		portraitBuyPanelHeightCanvas,
	} from '../game/portraitHudLayout';
	import {
		getMascotBulletCatchPoint,
		getMascotPortraitScreenBox,
		getMascotScreenBox,
	} from '../game/mascotHtmlSpine';

	/** Tip anchor in Cartridge.webp (196²). */
	const TIP_ANCHOR_X = 0.78;
	const TIP_ANCHOR_Y = 0.15;
	const TIP_LOCAL_ANGLE_DEG = (Math.atan2(29 - 96, 153 - 98) * 180) / Math.PI;

	type Props = { zIndex?: number };

	const props: Props = $props();
	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const showOnLayout = $derived(
		layoutType === 'desktop' ||
			layoutType === 'portrait' ||
			layoutType === 'tablet' ||
			isPopout,
	);
	const flyBatch = $derived(context.stateGame.bulletFly);
	/** Legacy Pixi under-mascot layer — first bullet only (unused). */
	const fly = $derived(flyBatch?.[0] ?? null);

	type FlyPose = {
		x: number;
		y: number;
		size: number;
		scale: number;
		rotation: number;
		alpha: number;
	};

	let pose = $state<FlyPose | null>(null);
	let flyKey = $state<number | null>(null);

	const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

	const buildPath = (active: NonNullable<typeof fly>) => {
		const ml = context.stateLayoutDerived.mainLayout();
		const layout = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layout] ?? { x: 0, y: 0 };
		const board = context.stateGameDerived.boardLayout();
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;
		const cell = SYMBOL_SIZE * ml.scale * board.scale;
		const visibleRow = active.row - 1;

		const startX = centerX - halfW + active.reel * cell + cell * 0.5;
		const startY = centerY - halfH + visibleRow * cell + cell * 0.5;

		const mascotCenterX = ml.x + (board.x - ml.width * 0.5) * ml.scale;
		const mascotCenterY = ml.y + (board.y - ml.height * 0.5) * ml.scale;
		const canvas = context.stateLayoutDerived.canvasSizes();
		const mascot =
			layout === 'portrait'
				? getMascotPortraitScreenBox({
						canvasWidth: canvas.width,
						boardCenterY: mascotCenterY,
						halfH,
						buyPanelTop: portraitBuyPanelCanvasTop(context.stateLayoutDerived),
						buyPanelHeight: portraitBuyPanelHeightCanvas(context.stateLayoutDerived),
					})
				: getMascotScreenBox({
						centerX: mascotCenterX,
						centerY: mascotCenterY,
						halfW,
						halfH,
					});
		const hand = getMascotBulletCatchPoint(mascot);

		const size = Math.max(28, cell * 0.72);
		const dx = hand.x - startX;
		const dy = hand.y - startY;
		const lift = Math.max(48, cell * 0.55);
		const cx = dx * 0.5;
		const cy = dy * 0.5 - lift;
		const approachAngleDeg = (Math.atan2(dy - cy * 0.35, dx - cx * 0.35) * 180) / Math.PI;
		const seatRot = ((TIP_LOCAL_ANGLE_DEG - approachAngleDeg) * Math.PI) / 180;

		return { startX, startY, dx, dy, cx, cy, size, seatRot };
	};

	$effect(() => {
		const active = fly;
		if (!active || !show || !showOnLayout) {
			pose = null;
			flyKey = null;
			return;
		}

		const path = buildPath(active);
		flyKey = active.key;
		const origin = performance.now();
		const duration = BULLET_FLY_MS;
		let raf = 0;

		const tick = () => {
			const elapsed = performance.now() - origin;
			const t = clamp01(elapsed / duration);
			// Linear along the quadratic bezier (same as CSS offset-path).
			const u = 1 - t;
			const xOff = 2 * u * t * path.cx + t * t * path.dx;
			const yOff = 2 * u * t * path.cy + t * t * path.dy;
			const arriveScale = 0.72;
			const scale = 1 + (arriveScale - 1) * t;
			pose = {
				x: path.startX + xOff,
				y: path.startY + yOff,
				size: path.size,
				scale,
				rotation: path.seatRot * t,
				alpha: 1,
			};
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(raf);
		};
	});

	// When handler clears bulletFly, drop immediately (before fist closes).
	$effect(() => {
		if (!fly) pose = null;
	});
</script>

{#if show && showOnLayout && pose && flyKey !== null}
	<Container
		x={pose.x}
		y={pose.y}
		zIndex={props.zIndex ?? 5}
		sortableChildren={true}
	>
		<Sprite
			key="BTImg"
			anchor={{ x: TIP_ANCHOR_X, y: TIP_ANCHOR_Y }}
			width={pose.size * pose.scale}
			height={pose.size * pose.scale}
			x={0}
			y={0}
			rotation={pose.rotation}
			alpha={pose.alpha}
			zIndex={0}
		/>
	</Container>
{/if}
