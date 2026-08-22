<script lang="ts">
	/**
	 * Revolver-drum progress (max 6 chambers). Visible during free spins.
	 * Layers: bullets → barrel art (rotating rotor) → fixed shadow overlay.
	 * Next empty chamber is always brought to the top via CW cylinder rotation.
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
		getDrumBoxScreenPos,
		getDrumLoadChamberIndex,
		getDrumRotationDeg,
		getDrumSize,
		isDrumChamberFilled,
	} from '../game/revolverDrumLayout';

	const BASE = import.meta.env.BASE_URL;
	const BARREL_IMG = `${BASE}assets/sprites/revolverDrum/barrel.png`;
	const BULLET_1_IMG = `${BASE}assets/sprites/revolverDrum/bullet_1.png`;
	const BULLET_2_IMG = `${BASE}assets/sprites/revolverDrum/bullet_2.png`;
	const OVERLAY_IMG = `${BASE}assets/sprites/revolverDrum/overlay.png`;

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
	const shootActive = $derived(context.stateGame.drumShootActive);
	const elevate = $derived(firingChamber !== null || shootActive);
	const rotationDeg = $derived(getDrumRotationDeg(filled));
	const loadChamber = $derived(getDrumLoadChamberIndex(filled));

	const show = $derived.by(() => {
		if (!gameEntrance.showContent) return false;
		if (props.forceShow) return true;
		return context.stateGame.gameType === 'freegame';
	});

	const isDesktop = $derived(context.stateLayoutDerived.layoutType() === 'desktop');

	const style = $derived.by(() => {
		const box = getDrumBoxScreenPos({
			mainLayout: context.stateLayoutDerived.mainLayout(),
			layoutType: context.stateLayoutDerived.layoutType(),
			board: context.stateGameDerived.boardLayout(),
			isDesktop,
		});
		const z = elevate ? 65 : 42;
		return `left:${box.left}px;top:${box.top}px;width:${box.size}px;z-index:${z};`;
	});

	const drumSize = $derived(getDrumSize(isDesktop));
	const holePx = $derived(CHAMBER_HOLE_AT_DESKTOP * (drumSize / getDrumSize(true)));

	const chambers = $derived(
		Array.from({ length: DRUM_MAX }, (_, i) => {
			const pos = CHAMBER_POS_FRAC[i];
			const orients = context.stateGame.drumBulletOrientDeg;
			return {
				i,
				leftPct: pos.x * 100,
				topPct: pos.y * 100,
				orientDeg: orients[i] ?? 0,
				filled: isDrumChamberFilled(i, filled),
				firing: firingChamber === i,
				isLoad: loadChamber === i,
				useFiredArt: shootActive || firingChamber === i,
			};
		}),
	);
</script>

{#if show && isDesktop}
	<div class="drum" style={style} aria-hidden="true" title="Revolver drum">
		<div class="cylinder">
			<div class="rotor" style:transform="rotate({rotationDeg}deg)">
				{#each chambers as c (c.i)}
					<span
						class="chamber"
						class:filled={c.filled}
						class:firing={c.firing}
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
							<img
								class="bullet"
								src={c.useFiredArt ? BULLET_2_IMG : BULLET_1_IMG}
								alt=""
								draggable="false"
								style:transform="rotate({c.orientDeg}deg)"
							/>
						{/if}
					</span>
				{/each}
				<div class="barrel" style:background-image="url('{BARREL_IMG}')"></div>
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

	.cylinder {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		flex: 0 0 auto;
	}

	.rotor {
		position: absolute;
		inset: 0;
		transition: transform 0.38s cubic-bezier(0.33, 0.1, 0.2, 1);
	}

	.chamber {
		position: absolute;
		z-index: 1;
		border-radius: 50%;
		overflow: hidden;
	}

	.bullet {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
		user-select: none;
	}

	.chamber.firing .bullet {
		animation: bullet-fire 0.28s ease-out;
	}

	.barrel {
		position: absolute;
		inset: 0;
		z-index: 2;
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
