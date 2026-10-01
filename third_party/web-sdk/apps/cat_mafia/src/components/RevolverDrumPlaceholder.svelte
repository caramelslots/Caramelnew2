<script lang="ts">
	/**
	 * Revolver-drum progress (max 6 chambers). Visible during free spins.
	 * Layers: barrel art → bullets on top → fixed shadow overlay.
	 * Load: CW so the next empty sits at position 1 (12 o'clock).
	 * Shoot: CCW from that port — fire only at position 1, then step.
	 */
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		CHAMBER_HOLE_AT_DESKTOP,
		CHAMBER_POS_FRAC,
		DRUM_CHAMBER_ATTR,
		DRUM_HUB_ATTR,
		DRUM_LOAD_ATTR,
		DRUM_MAX,
		getChamberAtFirePosition,
		getDrumBoxScreenPos,
		getDrumLoadChamberIndex,
		getDrumSize,
		isDrumChamberFilled,
	} from '../game/revolverDrumLayout';

	const BASE = import.meta.env.BASE_URL;
	const BARREL_IMG = `${BASE}assets/sprites/fsExtraCounter/barrel.webp`;
	const BARREL_RIM_IMG = `${BASE}assets/sprites/fsExtraCounter/barrel_rim.webp`;
	const BULLET_1_IMG = `${BASE}assets/sprites/fsExtraCounter/bullet_1.webp`;
	const BULLET_2_IMG = `${BASE}assets/sprites/fsExtraCounter/bullet_2.webp`;
	const OVERLAY_IMG = `${BASE}assets/sprites/fsExtraCounter/overlay.webp`;

	type Props = {
		/** Force-show for layout QA. */
		forceShow?: boolean;
		filled?: number;
	};

	const props: Props = $props();
	const context = getContext();

	const filled = $derived(
		Math.max(0, Math.min(DRUM_MAX, props.filled ?? context.stateGame.drumCount)),
	);
	const firingChamber = $derived(context.stateGame.drumFiringChamber);
	const spentChambers = $derived(context.stateGame.drumSpentChambers);
	const shootActive = $derived(context.stateGame.drumShootActive);
	const shakeKey = $derived(context.stateGame.drumShakeKey);
	// HTML only while Stage E shoot overlay covers the Pixi canvas.
	const elevate = $derived(firingChamber !== null || shootActive);
	const rotationDeg = $derived(context.stateGame.drumRotationDeg);
	const loadChamber = $derived(
		shootActive ? getChamberAtFirePosition(rotationDeg) : getDrumLoadChamberIndex(filled),
	);

	const show = $derived.by(() => {
		if (!gameEntrance.showContent) return false;
		if (props.forceShow) return true;
		if (!shootActive && firingChamber === null) return false;
		return context.stateGame.gameType === 'freegame';
	});

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const showOnLayout = $derived(true);

	const box = $derived(
		getDrumBoxScreenPos({
			mainLayout: context.stateLayoutDerived.mainLayout(),
			layoutType,
			board: context.stateGameDerived.boardLayout(),
			isDesktop: layoutType !== 'portrait',
			layoutDerived: context.stateLayoutDerived,
		}),
	);

	const style = $derived.by(() => {
		const z = elevate ? 65 : 42;
		const rim = box.rim;
		if (rim) {
			// Expand the fixed box to the rim so mounts stay aligned; cylinder stays centred on the hole.
			const padL = box.left - rim.left;
			const padT = box.top - rim.top;
			const angle = rim.angle ?? 0;
			return `left:${rim.left}px;top:${rim.top}px;width:${rim.width}px;height:${rim.height}px;z-index:${z};--drum-size:${box.size}px;--drum-pad-l:${padL}px;--drum-pad-t:${padT}px;--rim-angle:${angle}deg;`;
		}
		return `left:${box.left}px;top:${box.top}px;width:${box.size}px;z-index:${z};`;
	});
	const withRim = $derived(!!box.rim);

	const holePx = $derived(CHAMBER_HOLE_AT_DESKTOP * (box.size / getDrumSize(true)));

	const chambers = $derived(
		Array.from({ length: DRUM_MAX }, (_, i) => {
			const pos = CHAMBER_POS_FRAC[i];
			const orients = context.stateGame.drumBulletOrientDeg;
			const firing = firingChamber === i;
			const spent = !!spentChambers[i];
			return {
				i,
				leftPct: pos.x * 100,
				topPct: pos.y * 100,
				orientDeg: orients[i] ?? 0,
				filled: isDrumChamberFilled(i, filled),
				firing,
				isLoad: loadChamber === i,
				seatKey: context.stateGame.drumSeatAnimKey[i] ?? 0,
				// Spent/firing keep the same orient — only the sprite swaps to bullet_2.
				useFiredArt: spent || firing,
			};
		}),
	);

	let cylinderEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		const key = shakeKey;
		const el = cylinderEl;
		if (key <= 0 || !el) return;
		el.classList.remove('shake');
		// Force reflow so the shake animation can replay without remounting bullets.
		void el.offsetWidth;
		el.classList.add('shake');
	});
</script>

{#if show && showOnLayout}
	<div class="drum" class:with-rim={withRim} style={style} aria-hidden="true" title="Revolver drum">
		{#if withRim}
			<img class="rim" src={BARREL_RIM_IMG} alt="" draggable="false" />
		{/if}
		<div class="cylinder" bind:this={cylinderEl}>
			<div class="rotor" style:transform="rotate({rotationDeg}deg)">
				<div class="barrel" style:background-image="url('{BARREL_IMG}')"></div>
				{#each chambers as c (c.i)}
					<span
						class="chamber"
						class:filled={c.filled}
						{...{
							[DRUM_CHAMBER_ATTR]: String(c.i),
							...(c.isLoad ? { [DRUM_LOAD_ATTR]: '' } : {}),
						}}
						style:left="{c.leftPct}%"
						style:top="{c.topPct}%"
						style:width="{holePx}px"
						style:height="{holePx}px"
						style:margin="{-holePx * 0.5}px 0 0 {-holePx * 0.5}px"
					>
						{#if c.filled}
							{#key c.seatKey}
								<span class="bullet-seat" class:animate={c.seatKey > 0} style:--orient="{c.orientDeg}deg">
									<img
										class="bullet"
										class:firing={c.firing}
										src={c.useFiredArt ? BULLET_2_IMG : BULLET_1_IMG}
										alt=""
										draggable="false"
									/>
								</span>
							{/key}
						{/if}
					</span>
				{/each}
			</div>
			<img class="shadow" src={OVERLAY_IMG} alt="" draggable="false" />
			<span class="hub" {...{ [DRUM_HUB_ATTR]: '' }}></span>
		</div>
	</div>
{/if}

<style lang="scss">
	.drum {
		position: fixed;
		z-index: 42;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		height: auto;
	}

	.drum.with-rim {
		display: block;
	}

	.rim {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
		z-index: 4;
		transform: rotate(var(--rim-angle, 0deg));
		transform-origin: center;
	}

	.cylinder {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		flex: 0 0 auto;
	}

	.drum.with-rim .cylinder {
		position: absolute;
		left: var(--drum-pad-l, 0);
		top: var(--drum-pad-t, 0);
		width: var(--drum-size, 100%);
		height: var(--drum-size, 100%);
		aspect-ratio: auto;
		z-index: 1;
	}

	.cylinder.shake {
		animation: drum-shake 0.28s ease-out;
	}

	.rotor {
		position: absolute;
		inset: 0;
		transition: transform 0.38s cubic-bezier(0.33, 0.1, 0.2, 1);
	}

	.chamber {
		position: absolute;
		z-index: 2;
		border-radius: 50%;
		overflow: hidden;
	}

	.bullet-seat {
		display: block;
		width: 100%;
		height: 100%;
	}

	.bullet-seat.animate {
		animation: bullet-seat 0.26s cubic-bezier(0.33, 0.1, 0.2, 1) both;
	}

	.bullet {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
		user-select: none;
		transform: rotate(var(--orient, 0deg));
	}

	.bullet.firing {
		animation: bullet-fire 0.28s ease-out;
	}

	.barrel {
		position: absolute;
		inset: 0;
		z-index: 1;
		background-size: 100% 100%;
		background-position: center;
		background-repeat: no-repeat;
		pointer-events: none;
	}

	.shadow {
		position: absolute;
		inset: 0;
		z-index: 3;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
	}

	.hub {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 0;
		width: 1px;
		height: 1px;
		margin: -0.5px 0 0 -0.5px;
		pointer-events: none;
	}

	@keyframes bullet-seat {
		from {
			opacity: 0;
			transform: scale(0.55);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes drum-shake {
		0% {
			transform: rotate(0deg);
		}
		35% {
			transform: rotate(-9deg);
		}
		70% {
			transform: rotate(9deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}

	@keyframes bullet-fire {
		0% {
			scale: 1;
			filter: brightness(1);
		}
		40% {
			scale: 1.12;
			filter: brightness(1.35);
		}
		100% {
			scale: 1;
			filter: brightness(1);
		}
	}
</style>
