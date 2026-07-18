<script lang="ts" module>
	export type EmitterEventFreeSpinTargetPick = {
		type: 'freeSpinTargetPick';
		targets: number[];
		chosenIndex: number;
		awardedFs: number;
	};
</script>

<script lang="ts">
	/**
	 * Stage C: 6 targets → player taps one → flip reveal FS count (8/10/12).
	 * Awarded value is predetermined; click only drives UX.
	 */
	import { fade } from 'svelte/transition';
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';

	const context = getContext();

	let show = $state(false);
	let phase = $state<'pick' | 'shoot' | 'reveal'>('pick');
	let targets = $state<number[]>([8, 10, 12, 8, 10, 12]);
	let chosenIndex = $state(0);
	let awardedFs = $state(10);
	let clickedIndex = $state<number | null>(null);
	let faceValues = $state<number[]>([8, 10, 12, 8, 10, 12]);
	let oncomplete = $state(() => {});

	const buildFaceValues = (clicked: number) => {
		const faces = [...targets];
		// Put awardedFs on the clicked target; put original chosen value into chosenIndex slot if needed.
		const others = targets.filter((_, i) => i !== chosenIndex);
		const result = faces.map((_, i) => {
			if (i === clicked) return awardedFs;
			return others.shift() ?? 10;
		});
		return result;
	};

	const onTargetClick = async (index: number) => {
		if (phase !== 'pick') return;
		clickedIndex = index;
		phase = 'shoot';
		faceValues = buildFaceValues(index);
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await new Promise((r) => setTimeout(r, 350));
		phase = 'reveal';
		await new Promise((r) => setTimeout(r, 1200));
		oncomplete();
	};

	context.eventEmitter.subscribeOnMount({
		freeSpinTargetPick: async (event) => {
			targets = event.targets.length === 6 ? [...event.targets] : [8, 10, 12, 8, 10, 12];
			chosenIndex = event.chosenIndex;
			awardedFs = event.awardedFs;
			clickedIndex = null;
			faceValues = [...targets];
			phase = 'pick';
			show = true;
			await waitForResolve((resolve) => {
				oncomplete = () => {
					show = false;
					resolve();
				};
			});
		},
	});
</script>

{#if show}
	<div class="overlay" transition:fade={{ duration: 180 }} data-test="target-pick-overlay">
		<div class="panel">
			<h2 class="title">{context.i18nDerived.targetPickTitle()}</h2>
			<p class="hint">
				{#if phase === 'pick'}
					{context.i18nDerived.targetPickHintPick()}
				{:else if phase === 'shoot'}
					{context.i18nDerived.targetPickHintShoot()}
				{:else}
					{context.i18nDerived.targetPickHintWon(awardedFs)}
				{/if}
			</p>
			<div class="grid" class:locked={phase !== 'pick'}>
				{#each faceValues as value, i (i)}
					<button
						type="button"
						class="target"
						class:flipped={phase === 'reveal'}
						class:winner={phase === 'reveal' && i === clickedIndex}
						class:shooting={phase === 'shoot' && i === clickedIndex}
						disabled={phase !== 'pick'}
						onclick={() => onTargetClick(i)}
						aria-label={`Target ${i + 1}`}
					>
						<span class="face front">
							<span class="ring ring-1"></span>
							<span class="ring ring-2"></span>
							<span class="ring ring-3"></span>
							<span class="bull"></span>
						</span>
						<span class="face back">
							<span class="fs-num">{value}</span>
							<span class="fs-label">FS</span>
						</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.72);
		pointer-events: auto;
	}

	.panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem 1.5rem;
		border-radius: 16px;
		background: rgba(18, 14, 10, 0.94);
		border: 1px solid rgba(201, 162, 74, 0.55);
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
		max-width: min(560px, 94vw);
	}

	.title {
		margin: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: 1.35rem;
		letter-spacing: 0.14em;
		color: #f0d78c;
	}

	.hint {
		margin: 0 0 0.35rem;
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.75);
		text-align: center;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(88px, 1fr));
		gap: 0.85rem;
	}

	.grid.locked {
		pointer-events: none;
	}

	.target {
		position: relative;
		width: 100px;
		height: 100px;
		border: none;
		background: transparent;
		cursor: pointer;
		perspective: 600px;
		padding: 0;
	}

	.target:disabled {
		cursor: default;
	}

	.face {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		backface-visibility: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		transition: transform 0.55s ease;
	}

	.front {
		background: radial-gradient(circle at 40% 35%, #fff 0 12%, #e23 12% 28%, #fff 28% 44%, #e23 44% 60%, #fff 60% 76%, #e23 76% 100%);
		border: 3px solid #222;
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
	}

	.ring {
		position: absolute;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.08);
		pointer-events: none;
	}

	.ring-1 {
		inset: 18%;
	}
	.ring-2 {
		inset: 34%;
	}
	.ring-3 {
		inset: 48%;
	}

	.bull {
		width: 14%;
		height: 14%;
		border-radius: 50%;
		background: #111;
		z-index: 1;
	}

	.back {
		background: radial-gradient(circle at 35% 30%, #3a2a12, #1a1208);
		border: 3px solid #c9a24a;
		transform: rotateY(180deg);
		color: #f0d78c;
	}

	.target.flipped .front {
		transform: rotateY(180deg);
	}

	.target.flipped .back {
		transform: rotateY(360deg);
	}

	.target.shooting .front {
		animation: hit-flash 0.35s ease-out;
	}

	.target.winner .back {
		box-shadow: 0 0 0 3px #f0d78c, 0 8px 20px rgba(240, 215, 140, 0.45);
	}

	.fs-num {
		font-family: 'proxima-nova', sans-serif;
		font-size: 2rem;
		font-weight: 800;
		line-height: 1;
	}

	.fs-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.7rem;
		letter-spacing: 0.12em;
	}

	@keyframes hit-flash {
		0% {
			transform: scale(1);
			filter: brightness(1);
		}
		40% {
			transform: scale(1.08);
			filter: brightness(1.6);
		}
		100% {
			transform: scale(1);
			filter: brightness(1);
		}
	}
</style>
