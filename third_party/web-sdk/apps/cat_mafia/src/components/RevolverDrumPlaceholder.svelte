<script lang="ts">
	/**
	 * Revolver-drum progress (max 6 chambers). Visible during free spins.
	 */
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		DRUM_CHAMBER_ATTR,
		DRUM_HUB_ATTR,
		DRUM_MAX,
		getDrumBoxScreenPos,
		getDrumChamberAngleDeg,
	} from '../game/revolverDrumLayout';

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

	const show = $derived.by(() => {
		if (!gameEntrance.showContent) return false;
		if (props.forceShow) return true;
		return context.stateGame.gameType === 'freegame';
	});

	const isDesktop = $derived(context.stateLayoutDerived.layoutType() === 'desktop');
	const spinKey = $derived(filled);

	const style = $derived.by(() => {
		const box = getDrumBoxScreenPos({
			mainLayout: context.stateLayoutDerived.mainLayout(),
			layoutType: context.stateLayoutDerived.layoutType(),
			board: context.stateGameDerived.boardLayout(),
			isDesktop,
		});
		// Only width — height comes from square cylinder + label (see `.drum`).
		return `left:${box.left}px;top:${box.top}px;width:${box.size}px;`;
	});

	const chambers = $derived(
		Array.from({ length: DRUM_MAX }, (_, i) => ({
			i,
			angle: getDrumChamberAngleDeg(i),
			filled: i < filled,
		})),
	);
</script>

{#if show && isDesktop}
	<div class="drum" style={style} aria-hidden="true" title="Revolver drum">
		{#key spinKey}
			<div class="cylinder" class:tick={spinKey > 0}>
				{#each chambers as c (c.i)}
					<span
						class="chamber"
						class:filled={c.filled}
						{...{ [DRUM_CHAMBER_ATTR]: String(c.i) }}
						style:transform="rotate({c.angle}deg) translateY(-28px)"
					></span>
				{/each}
				<span class="hub" {...{ [DRUM_HUB_ATTR]: '' }}></span>
			</div>
		{/key}
		<span class="label">×{filled}</span>
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
		/* Width from inline style; height grows with label so the cylinder
		   keeps a true square (fly targets used to miss when label stole height). */
		height: auto;
	}

	.cylinder {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		flex: 0 0 auto;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #8a8f98, #3a3d44 55%, #1c1e22 100%);
		border: 2px solid #c9a24a;
		box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.55);
	}

	.cylinder.tick {
		animation: drum-tick 0.35s ease-out;
	}

	.chamber {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 14px;
		height: 14px;
		margin: -7px 0 0 -7px;
		border-radius: 50%;
		background: #151618;
		border: 1px solid rgba(255, 255, 255, 0.15);
		transform-origin: center center;
	}

	.chamber.filled {
		background: radial-gradient(circle at 40% 35%, #e8c46a, #8a5a12);
		border-color: #f0d78c;
	}

	.hub {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 18px;
		height: 18px;
		margin: -9px 0 0 -9px;
		border-radius: 50%;
		background: #2c2f35;
		border: 1px solid #c9a24a;
	}

	.label {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.7rem;
		color: #f0d78c;
		letter-spacing: 0.04em;
	}

	@keyframes drum-tick {
		0% {
			transform: rotate(0deg);
		}
		40% {
			transform: rotate(18deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}
</style>
