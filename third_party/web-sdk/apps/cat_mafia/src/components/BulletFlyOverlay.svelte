<script lang="ts">
	/**
	 * FS bullet collect: fly → open palm → hide before the fist closes.
	 */
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		BOARD_LAYOUT_OFFSETS,
		BULLET_FLY_MS,
		BULLET_FLY_TOTAL_MS,
		BULLET_INSERT_MS,
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

	const CARTRIDGE_IMG = `${import.meta.env.BASE_URL}assets/sprites/symbolsNew/Cartridge.webp`;

	/** Tip anchor in Cartridge.webp (196²), from silver-region centroid. */
	const TIP_ANCHOR_X = 0.78;
	const TIP_ANCHOR_Y = 0.15;
	/** Tip direction in the asset (screen Y-down), content centre → silver tip. */
	const TIP_LOCAL_ANGLE_DEG = (Math.atan2(29 - 96, 153 - 98) * 180) / Math.PI;

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isDesktop = $derived(layoutType === 'desktop');
	const isPortrait = $derived(layoutType === 'portrait');
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const showOnLayout = $derived(
		isDesktop || isPortrait || layoutType === 'tablet' || isPopout,
	);
	const flyBatch = $derived(context.stateGame.bulletFly);
	/** Legacy HTML overlay — first bullet only (unused; Spine layer owns multi-fly). */
	const fly = $derived(flyBatch?.[0] ?? null);

	/** Snapshot of CSS for the active fly — never rebuilt after launch. */
	let frozenStyle = $state('');
	let frozenFlyKey = $state<number | null>(null);

	const buildFlyStyle = (active: NonNullable<typeof fly>) => {
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

		const startLeft = centerX - halfW + active.reel * cell + cell * 0.5;
		const startTop = centerY - halfH + visibleRow * cell + cell * 0.5;

		// Same framing as MascotPixi so the hand target sits on the real cat.
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
		const dx = hand.x - startLeft;
		const dy = hand.y - startTop;
		const lift = Math.max(48, cell * 0.55);
		const cx = dx * 0.5;
		const cy = dy * 0.5 - lift;
		const flyPath = `path('M 0 0 Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}')`;

		// Tip points roughly along the final approach into the palm.
		const approachAngleDeg = (Math.atan2(dy - cy * 0.35, dx - cx * 0.35) * 180) / Math.PI;
		const seatRot = TIP_LOCAL_ANGLE_DEG - approachAngleDeg;

		const arriveScale = 0.72;
		const endScale = 0.28;

		const ax = `${(TIP_ANCHOR_X * 100).toFixed(1)}%`;
		const ay = `${(TIP_ANCHOR_Y * 100).toFixed(1)}%`;

		return [
			`left:${startLeft}px`,
			`top:${startTop}px`,
			`width:${size}px`,
			`height:${size}px`,
			`offset-path:${flyPath}`,
			`offset-anchor:${ax} ${ay}`,
			`--tip-x:${ax}`,
			`--tip-y:${ay}`,
			`--approach-ms:${BULLET_FLY_MS}ms`,
			`--insert-ms:${BULLET_INSERT_MS}ms`,
			`--total-ms:${BULLET_FLY_TOTAL_MS}ms`,
			`--seat-rot:${seatRot.toFixed(1)}deg`,
			`--arrive-scale:${arriveScale.toFixed(3)}`,
			`--end-scale:${endScale.toFixed(3)}`,
		].join(';');
	};

	$effect(() => {
		const active = fly;
		if (!active) {
			frozenFlyKey = null;
			frozenStyle = '';
			return;
		}
		if (frozenFlyKey === active.key && frozenStyle) return;
		frozenFlyKey = active.key;
		frozenStyle = buildFlyStyle(active);
	});
</script>

{#if show && showOnLayout && fly && frozenStyle}
	{#key fly.key}
		<div class="bullet-fly" style={frozenStyle} aria-hidden="true">
			<img class="bullet-fly__img" src={CARTRIDGE_IMG} alt="" draggable="false" />
		</div>
	{/key}
{/if}

<style lang="scss">
	.bullet-fly {
		position: fixed;
		z-index: 55;
		pointer-events: none;
		offset-rotate: 0deg;
		display: grid;
		place-items: center;
		animation: fly-along var(--approach-ms, 630ms) linear forwards;
	}

	.bullet-fly__img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transform-origin: var(--tip-x, 78%) var(--tip-y, 15%);
		filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.55));
		/* Pose on approach; unmount clears before fist closes. */
		animation:
			fly-pose var(--approach-ms, 630ms) linear forwards,
			fly-sink var(--insert-ms, 50ms) var(--approach-ms, 630ms) cubic-bezier(0.4, 0, 0.7, 0.3)
				forwards;
	}

	@keyframes fly-along {
		from {
			offset-distance: 0%;
		}
		to {
			offset-distance: 100%;
		}
	}

	/* In flight: ease into seat rotation + arrive size. */
	@keyframes fly-pose {
		from {
			transform: scale(1) rotate(0deg);
			opacity: 1;
			filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.55));
		}
		to {
			transform: scale(var(--arrive-scale)) rotate(var(--seat-rot));
			opacity: 1;
			filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
		}
	}

	/* On arrival: sink + fade — must finish before the fist closes. */
	@keyframes fly-sink {
		from {
			transform: scale(var(--arrive-scale)) rotate(var(--seat-rot));
			opacity: 1;
			filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
		}
		to {
			transform: scale(var(--end-scale)) rotate(var(--seat-rot));
			opacity: 0;
			filter: drop-shadow(0 0 0 transparent);
		}
	}
</style>
