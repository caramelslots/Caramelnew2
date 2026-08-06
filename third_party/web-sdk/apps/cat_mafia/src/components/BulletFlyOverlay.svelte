<script lang="ts">
	/**
	 * FS bullet collect: arc so the tip lands on the chamber centre, then a
	 * short continuous sink (no stepped mid-keyframes — those felt jerky).
	 */
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		BOARD_LAYOUT_OFFSETS,
		BULLET_FLY_MS,
		BULLET_FLY_TOTAL_MS,
		BULLET_INSERT_MS,
		SYMBOL_SIZE,
	} from '../game/constants';
	import {
		DRUM_MAX,
		getDrumChamberScreenPos,
		queryDrumChamberScreenPos,
	} from '../game/revolverDrumLayout';

	const CARTRIDGE_IMG = `${import.meta.env.BASE_URL}assets/sprites/symbolsNew/Cartridge.webp`;

	/** Tip anchor in Cartridge.webp (196²), from silver-region centroid. */
	const TIP_ANCHOR_X = 0.78;
	const TIP_ANCHOR_Y = 0.15;
	/** Tip direction in the asset (screen Y-down), content centre → silver tip. */
	const TIP_LOCAL_ANGLE_DEG = (Math.atan2(29 - 96, 153 - 98) * 180) / Math.PI;

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const isDesktop = $derived(context.stateLayoutDerived.layoutType() === 'desktop');
	const fly = $derived(context.stateGame.bulletFly);

	const style = $derived.by(() => {
		if (!fly) return '';
		const ml = context.stateLayoutDerived.mainLayout();
		const layoutType = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const board = context.stateGameDerived.boardLayout();
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;
		const cell = SYMBOL_SIZE * ml.scale * board.scale;
		const visibleRow = fly.row - 1;

		const startLeft = centerX - halfW + fly.reel * cell + cell * 0.5;
		const startTop = centerY - halfH + visibleRow * cell + cell * 0.5;

		const chamber = Math.max(0, Math.min(DRUM_MAX - 1, fly.chamber));
		const live = queryDrumChamberScreenPos(chamber);
		const fallback = getDrumChamberScreenPos({
			mainLayout: ml,
			layoutType,
			board,
			isDesktop,
			chamberIndex: chamber,
		});
		const hole = live ?? fallback;

		const size = Math.max(28, cell * 0.72);
		const dx = hole.x - startLeft;
		const dy = hole.y - startTop;
		const lift = Math.max(48, cell * 0.55);
		const cx = dx * 0.5;
		const cy = dy * 0.5 - lift;
		const flyPath = `path('M 0 0 Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}')`;

		const toHubX = hole.box.centerX - hole.x;
		const toHubY = hole.box.centerY - hole.y;
		const hubAngleDeg = (Math.atan2(toHubY, toHubX) * 180) / Math.PI;
		const seatRot = TIP_LOCAL_ANGLE_DEG - hubAngleDeg;

		const holePx = live?.holePx ?? 14 * (hole.box.size / 88);
		const endScale = Math.min(0.22, (holePx * 1.2) / size);
		const arriveScale = Math.max(endScale * 2.2, 0.36);

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
	});
</script>

{#if show && isDesktop && fly}
	{#key fly.key}
		<div class="bullet-fly" style={style} aria-hidden="true">
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
		animation: fly-along var(--approach-ms, 700ms) cubic-bezier(0.33, 0.1, 0.2, 1) forwards;
	}

	.bullet-fly__img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transform-origin: var(--tip-x, 78%) var(--tip-y, 15%);
		filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.55));
		/* Two continuous segments — no mid-stop scale steps. */
		animation:
			fly-pose var(--approach-ms, 700ms) cubic-bezier(0.33, 0.1, 0.25, 1) forwards,
			fly-sink var(--insert-ms, 180ms) var(--approach-ms, 700ms) cubic-bezier(0.4, 0, 0.7, 0.3)
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

	/* At the hole: one smooth ease-in shrink + fade (no pause). */
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
