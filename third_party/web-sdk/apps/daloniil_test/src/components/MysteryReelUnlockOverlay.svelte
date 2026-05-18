<!--
	MysteryReelUnlockOverlay.svelte — full-screen celebration overlay,
	который показывается при разблокировке нового Sticky Mystery Reel
	через Progress Ladder (collect 4 B = +1 reel).

	REDESIGN_PLAN §2.5.2.

	Triggered by emitter event `mysteryReelUnlock` (см.
	bookEventHandlerMap.ts → mysteryReelUnlock handler).
	Длительность: ~2.4 сек (300ms intro + 1800ms hold + 300ms outro).
	Блокирует следующий FS-spin: emitter event возвращает Promise через
	broadcastAsync, который завершается ПОСЛЕ полного цикла анимации.
-->
<script lang="ts" module>
	export type EmitterEventMysteryReelUnlockOverlay = {
		type: 'mysteryReelUnlock';
		reels: number[];
		tierAfter: number;
		rewardSpins: number;
	};
</script>

<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut, backOut } from 'svelte/easing';
	import { getContext } from '../game/context';

	const context = getContext();

	const HOLD_MS = 1800;
	const FADE_MS = 300;

	let visible = $state(false);
	let reelsCount = $state(0);
	let rewardSpins = $state(0);

	context.eventEmitter.subscribeOnMount({
		mysteryReelUnlock: async (event) => {
			reelsCount = event.reels.length;
			rewardSpins = event.rewardSpins;
			visible = true;

			// Звук celebration. Используем существующий sfx_winlevel_substantial
			// (premium "you won" звон) — позже можно заменить на dedicated
			// sfx_mystery_unlock когда audio asset будет добавлен.
			context.eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_winlevel_substantial',
			});

			await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
			visible = false;
			// Ждём пока outro fade закончится — тогда event-handler в
			// bookEventHandlerMap получит resolve и продолжит цикл FS.
			await new Promise((resolve) => setTimeout(resolve, FADE_MS));
		},
	});
</script>

{#if visible}
	<div class="overlay" data-test="mystery-reel-unlock-overlay" transition:fade={{ duration: FADE_MS }}>
		<div
			class="card"
			in:scale={{ duration: 400, easing: backOut, start: 0.5 }}
			out:scale={{ duration: FADE_MS, easing: cubicOut, start: 1 }}
		>
			<div class="glow"></div>

			<div class="title">{context.i18nDerived.mysteryReelUnlocked()}</div>
			<div class="subtitle">
				{#if reelsCount > 1}+{reelsCount} {/if}{context.i18nDerived.mysteryReelUnlockedSubtitle()}
			</div>

			<div class="icon-row">
				{#each Array(reelsCount) as _, i (i)}
					<div class="icon-cell" style:animation-delay="{i * 80}ms">✦</div>
				{/each}
			</div>

			<div class="reward">
				{context.i18nDerived.freeSpinsAwarded(rewardSpins)}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		z-index: 60;
		pointer-events: none;
	}

	.card {
		position: relative;
		min-width: 380px;
		max-width: 540px;
		padding: 2rem 3rem;
		background: linear-gradient(180deg, rgba(40, 30, 20, 0.96), rgba(20, 15, 10, 0.96));
		border: 2px solid rgba(255, 208, 0, 0.6);
		border-radius: 18px;
		box-shadow:
			0 12px 64px rgba(0, 0, 0, 0.7),
			0 0 80px rgba(255, 208, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		text-align: center;
		font-family: 'proxima-nova', sans-serif;
		color: #fff;
	}

	.glow {
		position: absolute;
		inset: -40%;
		background: radial-gradient(circle, rgba(255, 208, 0, 0.25) 0%, transparent 60%);
		pointer-events: none;
		animation: pulse-glow 1.4s ease-in-out infinite;
	}

	.title {
		font-size: 1.6rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #ffd000;
		text-shadow: 0 2px 8px rgba(255, 154, 60, 0.5);
		margin-bottom: 0.35rem;
		position: relative;
	}

	.subtitle {
		font-size: 2.4rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #fff;
		text-shadow:
			0 2px 4px rgba(0, 0, 0, 0.6),
			0 0 20px rgba(255, 208, 0, 0.7);
		margin-bottom: 1.2rem;
		position: relative;
	}

	.icon-row {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		position: relative;
	}

	.icon-cell {
		font-size: 3rem;
		color: #ffd000;
		text-shadow:
			0 0 20px rgba(255, 154, 60, 0.9),
			0 0 40px rgba(255, 208, 0, 0.6);
		opacity: 0;
		animation: pop-in 0.5s ease-out forwards;
	}

	.reward {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.85);
		position: relative;
	}

	@keyframes pop-in {
		0% {
			opacity: 0;
			transform: scale(0.3) rotate(-180deg);
		}
		70% {
			opacity: 1;
			transform: scale(1.2) rotate(10deg);
		}
		100% {
			opacity: 1;
			transform: scale(1) rotate(0);
		}
	}

	@keyframes pulse-glow {
		0%,
		100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
		}
	}
</style>
