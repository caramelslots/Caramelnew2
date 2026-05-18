<!--
	ProgressLadder.svelte — HTML-overlay прогресс-метра во Free Spins.

	REDESIGN_PLAN §2.5.1: переделан с focus на Mystery Reels.
	Каждые 4 собранных Bonus символа = +1 Sticky Mystery Reel + 3 фриспина.
	Отображается фикс. позицией СПРАВА сверху, видна только в gameType='freegame'.

	Подписывается на bonusCollect / ladderTierUp book-events через context.
-->
<script lang="ts" module>
	export type EmitterEventProgressLadder =
		| { type: 'ladderShow' }
		| { type: 'ladderHide' }
		| { type: 'ladderPulse' };
</script>

<script lang="ts">
	import { getContext } from '../game/context';

	const context = getContext();

	const BONUSES_PER_TIER = 4;
	const TOTAL_TIERS = 5;

	let pulse = $state(false);

	context.eventEmitter.subscribeOnMount({
		ladderShow: () => {},
		ladderHide: () => {},
		ladderPulse: () => {
			pulse = true;
			setTimeout(() => (pulse = false), 600);
		},
	});

	const isVisible = $derived(context.stateGame.gameType === 'freegame');
	const bonusInCurrentTier = $derived(context.stateGame.bonusCollected % BONUSES_PER_TIER);
	const bonusToNext = $derived(BONUSES_PER_TIER - bonusInCurrentTier);
	const progressPct = $derived((bonusInCurrentTier / BONUSES_PER_TIER) * 100);
	const isMaxTier = $derived(context.stateGame.ladderTier >= TOTAL_TIERS);
</script>

{#if isVisible}
	<div class="ladder" class:pulse data-test="progress-ladder">
		<div class="header">
			<span class="title">{context.i18nDerived.mysteryReelMeter()}</span>
		</div>

		<div class="bar">
			<div class="bar-fill" style:width="{progressPct}%"></div>
		</div>

		<div class="footer">
			<span class="collected">
				<strong>{bonusInCurrentTier}</strong>/{BONUSES_PER_TIER} ✦
			</span>
			{#if !isMaxTier}
				<span class="next-tier">
					{bonusToNext} {context.i18nDerived.bonusToNextReel()}
				</span>
			{:else}
				<span class="next-tier max-tier">{context.i18nDerived.maxTierReached()}</span>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	.ladder {
		position: fixed;
		top: 1rem;
		right: 1rem;
		width: 240px;
		padding: 0.85rem 1rem;
		background: rgba(20, 20, 30, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		color: #fff;
		font-family: 'proxima-nova', sans-serif;
		z-index: 40;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
		transition:
			transform 0.18s,
			box-shadow 0.18s;
	}

	.ladder.pulse {
		transform: scale(1.04);
		box-shadow: 0 6px 32px rgba(255, 208, 0, 0.55);
	}

	.header {
		display: flex;
		align-items: center;
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.title {
		color: rgba(255, 255, 255, 0.7);
	}

	.bar {
		height: 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #ff9a3c, #ffd000);
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.65);
	}

	.collected strong {
		color: #fff;
		font-weight: 700;
		font-size: 0.9rem;
	}

	.next-tier {
		color: rgba(255, 208, 0, 0.85);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.next-tier.max-tier {
		color: rgba(120, 255, 120, 0.85);
	}
</style>
