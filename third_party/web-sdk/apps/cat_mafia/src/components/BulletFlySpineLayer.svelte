<!--
	FS bullet fly as Spine slot objects on `finger_cartridge`.

	That slot draws after the body and immediately before `hand_cartrige`, so
	cartridges sit above the cat silhouette but under the catching hand.
	Multiple BTs fly to the hand at the same time.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { getContextApp, getContextSpine } from 'pixi-svelte';

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

	/** Slot just before `hand_cartrige` in gun_start draw order (~catch frame). */
	const BULLET_DRAW_SLOT = 'finger_cartridge';

	/** Slight palm fan so stacked flies stay readable. */
	const CATCH_FAN_PX = 14;

	const context = getContext();
	const appContext = getContextApp();
	const spine = getContextSpine();

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
	const flies = $derived(context.stateGame.bulletFly);

	type FlyPose = {
		key: number;
		x: number;
		y: number;
		size: number;
		scale: number;
		rotation: number;
	};

	type Path = {
		key: number;
		startX: number;
		startY: number;
		dx: number;
		dy: number;
		cx: number;
		cy: number;
		size: number;
		seatRot: number;
	};

	let poses = $state<FlyPose[]>([]);
	/** Imperative spine hook reads this (avoids stale $state capture). */
	let currentPoses: FlyPose[] = [];

	const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

	const buildPaths = (batch: NonNullable<typeof flies>): Path[] => {
		const ml = context.stateLayoutDerived.mainLayout();
		const layout = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layout] ?? { x: 0, y: 0 };
		const board = context.stateGameDerived.boardLayout();
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;
		const cell = SYMBOL_SIZE * ml.scale * board.scale;

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
		const n = batch.length;

		return batch.map((active, i) => {
			const visibleRow = active.row - 1;
			const startX = centerX - halfW + active.reel * cell + cell * 0.5;
			const startY = centerY - halfH + visibleRow * cell + cell * 0.5;
			const fan = (i - (n - 1) / 2) * CATCH_FAN_PX;
			const endX = hand.x + fan;
			const endY = hand.y + fan * 0.25;
			const dx = endX - startX;
			const dy = endY - startY;
			const lift = Math.max(48, cell * 0.55);
			const cx = dx * 0.5;
			const cy = dy * 0.5 - lift;
			const approachAngleDeg = (Math.atan2(dy - cy * 0.35, dx - cx * 0.35) * 180) / Math.PI;
			const seatRot = ((TIP_LOCAL_ANGLE_DEG - approachAngleDeg) * Math.PI) / 180;
			return {
				key: active.key,
				startX,
				startY,
				dx,
				dy,
				cx,
				cy,
				size,
				seatRot,
			};
		});
	};

	$effect(() => {
		currentPoses = poses;
	});

	$effect(() => {
		const batch = flies;
		if (!batch?.length || !show || !showOnLayout) {
			poses = [];
			return;
		}

		const paths = buildPaths(batch);
		const origin = performance.now();
		const duration = BULLET_FLY_MS;
		let raf = 0;

		const tick = () => {
			const elapsed = performance.now() - origin;
			const t = clamp01(elapsed / duration);
			const u = 1 - t;
			const arriveScale = 0.72;
			const scale = 1 + (arriveScale - 1) * t;
			poses = paths.map((path) => {
				const xOff = 2 * u * t * path.cx + t * t * path.dx;
				const yOff = 2 * u * t * path.cy + t * t * path.dy;
				return {
					key: path.key,
					x: path.startX + xOff,
					y: path.startY + yOff,
					size: path.size,
					scale,
					rotation: path.seatRot * t,
				};
			});
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(raf);
	});

	$effect(() => {
		if (!flies?.length) poses = [];
	});

	onMount(() => {
		const slotContainer = new PIXI.Container();
		slotContainer.visible = false;
		const sprites = new Map<number, PIXI.Sprite>();

		const texture = appContext.stateApp.loadedAssets?.['BTImg'] as PIXI.Texture | undefined;

		const ensureSprite = (key: number) => {
			let sprite = sprites.get(key);
			if (sprite) return sprite;
			sprite = new PIXI.Sprite(texture ?? PIXI.Texture.EMPTY);
			sprite.anchor.set(TIP_ANCHOR_X, TIP_ANCHOR_Y);
			slotContainer.addChild(sprite);
			sprites.set(key, sprite);
			return sprite;
		};

		spine.addSlotObject(BULLET_DRAW_SLOT, slotContainer, {
			followAttachmentTimeline: false,
		});

		const stagePoint = new PIXI.Point();
		const spineInternal = spine as typeof spine & {
			updateSlotObjects: () => void;
		};
		const previousUpdateSlots = spineInternal.updateSlotObjects.bind(spine);

		const applyPoses = () => {
			const active = currentPoses;
			if (!active.length || !gameEntrance.showContent) {
				slotContainer.visible = false;
				for (const sprite of sprites.values()) sprite.visible = false;
				return;
			}

			const layout = context.stateLayoutDerived.layoutType();
			const canvas = context.stateLayoutDerived.canvasSizes();
			const onLayout =
				layout === 'desktop' ||
				layout === 'portrait' ||
				layout === 'tablet' ||
				isPopoutViewport(canvas);
			if (!onLayout) {
				slotContainer.visible = false;
				return;
			}

			const coordSpace = spine.parent?.parent?.parent;
			if (!coordSpace || !texture || texture === PIXI.Texture.EMPTY) {
				slotContainer.visible = false;
				return;
			}

			// Free-fly in spine space; draw order still comes from this slot.
			slotContainer.position.set(0, 0);
			slotContainer.rotation = 0;
			slotContainer.scale.set(1, 1);
			slotContainer.visible = true;
			slotContainer.alpha = 1;

			const worldSx =
				Math.hypot(spine.worldTransform.a, spine.worldTransform.b) || 1;
			const live = new Set<number>();

			for (const pose of active) {
				live.add(pose.key);
				const sprite = ensureSprite(pose.key);
				if (sprite.texture !== texture) sprite.texture = texture;
				stagePoint.set(pose.x, pose.y);
				const local = spine.toLocal(stagePoint, coordSpace);
				sprite.position.copyFrom(local);
				sprite.rotation = pose.rotation;
				const localSize = (pose.size * pose.scale) / worldSx;
				sprite.width = localSize;
				sprite.height = localSize;
				sprite.visible = true;
				sprite.alpha = 1;
			}

			for (const [key, sprite] of sprites) {
				if (!live.has(key)) sprite.visible = false;
			}
		};

		spineInternal.updateSlotObjects = () => {
			previousUpdateSlots();
			applyPoses();
		};

		return () => {
			spineInternal.updateSlotObjects = previousUpdateSlots;
			try {
				spine.removeSlotObject(slotContainer);
			} catch {
				/* spine may already be destroyed */
			}
			slotContainer.destroy({ children: true });
			sprites.clear();
		};
	});
</script>
