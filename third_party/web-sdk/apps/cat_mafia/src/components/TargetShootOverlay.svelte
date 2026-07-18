<script lang="ts" module>
	export type EmitterEventTargetShootRound = {
		type: 'targetShootRound';
		shots: { targetIndex: number; reward: 0 | 1 | 2 | 3 }[];
		extraFs: number;
	};
</script>

<script lang="ts">
	/**
	 * Stage E: auto shooting round after main FS — no player input.
	 * Each shot hits a predetermined target; rewards are empty / +1/+2/+3 FS.
	 */
	import { fade } from 'svelte/transition';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';

	const TARGET_COUNT = 9;
	const context = getContext();

	let show = $state(false);
	let shots = $state<{ targetIndex: number; reward: 0 | 1 | 2 | 3 }[]>([]);
	let extraFs = $state(0);
	let hitSet = $state(new Set<number>());
	let revealed = $state<Record<number, 0 | 1 | 2 | 3>>({});
	let activeShot = $state<number | null>(null);
	let phase = $state<'intro' | 'shooting' | 'summary'>('intro');

	const rewardLabel = (r: 0 | 1 | 2 | 3) => (r === 0 ? '—' : `+${r}`);

	context.eventEmitter.subscribeOnMount({
		targetShootRound: async (event) => {
			shots = event.shots.map((s) => ({
				targetIndex: s.targetIndex,
				reward: s.reward as 0 | 1 | 2 | 3,
			}));
			extraFs = event.extraFs;
			hitSet = new Set();
			revealed = {};
			activeShot = null;
			phase = 'intro';
			show = true;
			stateGame.mascotPose = 'aim';

			await new Promise((r) => setTimeout(r, 600));
			phase = 'shooting';

			for (let i = 0; i < shots.length; i++) {
				const shot = shots[i];
				activeShot = shot.targetIndex;
				stateGame.mascotPose = 'shoot';
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
				stateGame.drumCount = Math.max(0, stateGame.drumCount - 1);
				await new Promise((r) => setTimeout(r, 280));

				hitSet = new Set([...hitSet, shot.targetIndex]);
				revealed = { ...revealed, [shot.targetIndex]: shot.reward };
				await new Promise((r) => setTimeout(r, 420));
				activeShot = null;
				stateGame.mascotPose = 'aim';
				await new Promise((r) => setTimeout(r, 180));
			}

			phase = 'summary';
			stateGame.mascotPose = 'idle';
			await new Promise((r) => setTimeout(r, extraFs > 0 ? 1400 : 900));
			show = false;
		},
	});
</script>

{#if show}
	<div class="overlay" transition:fade={{ duration: 180 }} data-test="target-shoot-overlay">
		<div class="panel">
			<h2 class="title">{context.i18nDerived.targetShootTitle()}</h2>
			<p class="hint">
				{#if phase === 'intro'}
					{context.i18nDerived.targetShootHintIntro()}
				{:else if phase === 'shooting'}
					{context.i18nDerived.targetShootHintFiring()}
				{:else if extraFs > 0}
					{context.i18nDerived.targetShootHintExtra(extraFs)}
				{:else}
					{context.i18nDerived.targetShootHintNone()}
				{/if}
			</p>
			<div class="grid">
				{#each Array.from({ length: TARGET_COUNT }, (_, i) => i) as i (i)}
					{@const flipped = hitSet.has(i)}
					{@const reward = revealed[i]}
					<div
						class="target"
						class:flipped
						class:shooting={activeShot === i}
						class:prize={flipped && reward !== undefined && reward > 0}
						aria-hidden="true"
					>
						<span class="face front">
							<span class="ring ring-1"></span>
							<span class="ring ring-2"></span>
							<span class="ring ring-3"></span>
							<span class="bull"></span>
						</span>
						<span class="face back">
							{#if reward !== undefined}
								<span class="fs-num">{rewardLabel(reward)}</span>
								{#if reward > 0}
									<span class="fs-label">FS</span>
								{/if}
							{/if}
						</span>
					</div>
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
		background: rgba(0, 0, 0, 0.78);
		pointer-events: none;
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
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.78);
		text-align: center;
		min-height: 1.4em;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(84px, 1fr));
		gap: 0.75rem;
	}

	.target {
		position: relative;
		width: 96px;
		height: 96px;
		perspective: 600px;
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
		transition: transform 0.45s ease;
	}

	.front {
		background: radial-gradient(
			circle at 40% 35%,
			#fff 0 12%,
			#e23 12% 28%,
			#fff 28% 44%,
			#e23 44% 60%,
			#fff 60% 76%,
			#e23 76% 100%
		);
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
		animation: hit-flash 0.28s ease-out;
	}

	.target.prize .back {
		box-shadow: 0 0 0 3px #f0d78c, 0 8px 20px rgba(240, 215, 140, 0.45);
	}

	.fs-num {
		font-family: 'proxima-nova', sans-serif;
		font-size: 1.75rem;
		font-weight: 800;
		line-height: 1;
	}

	.fs-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.65rem;
		letter-spacing: 0.12em;
	}

	@keyframes hit-flash {
		0% {
			transform: scale(1);
			filter: brightness(1);
		}
		40% {
			transform: scale(1.1);
			filter: brightness(1.7);
		}
		100% {
			transform: scale(1);
			filter: brightness(1);
		}
	}
</style>
