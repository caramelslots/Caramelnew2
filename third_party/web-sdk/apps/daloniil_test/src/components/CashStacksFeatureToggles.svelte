<!--
	Общие строки Bonus Boost / Special Spins с тумблерами.
	Используются в FeaturesAutoSpinOverlay и BuyBonusOverlay — одно состояние
	через stateGame.activeFeature (см. game/activeFeature.ts).
-->
<script lang="ts">
	import { stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import {
		BONUS_BOOST_COST_MULT,
		SPECIAL_SPINS_COST_MULT,
		toggleActiveFeature,
		type ActiveFeature,
	} from '../game/activeFeature';
	import { stateGame } from '../game/stateGame.svelte';

	type Props = {
		/** Заголовок секции «Функции» (только в меню автоигры). */
		showSectionTitle?: boolean;
	};

	const { showSectionTitle = false }: Props = $props();

	const context = getContext();

	const bonusBoostCost = $derived(
		numberToCurrencyString(stateBet.betAmount * BONUS_BOOST_COST_MULT),
	);
	const specialSpinsCost = $derived(
		numberToCurrencyString(stateBet.betAmount * SPECIAL_SPINS_COST_MULT),
	);

	const onToggle = (feature: ActiveFeature) => {
		toggleActiveFeature(feature);
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};
</script>

{#if showSectionTitle}
	<div class="section-title">{context.i18nDerived.autoplayFeatures()}</div>
{/if}

<button
	type="button"
	class="feature-row"
	class:active={stateGame.activeFeature === 'bonus_boost'}
	onclick={() => onToggle('bonus_boost')}
	data-test="feature-bonus-boost"
>
	<div class="feature-info">
		<div class="feature-name">{context.i18nDerived.bonusBoost()}</div>
		<div class="feature-cost">
			{context.i18nDerived.featurePerSpinCost(bonusBoostCost)}
		</div>
	</div>
	<div class="feature-toggle" class:on={stateGame.activeFeature === 'bonus_boost'}>
		<span class="knob"></span>
	</div>
</button>

<button
	type="button"
	class="feature-row"
	class:active={stateGame.activeFeature === 'special_spins'}
	onclick={() => onToggle('special_spins')}
	data-test="feature-special-spins"
>
	<div class="feature-info">
		<div class="feature-name">{context.i18nDerived.specialSpins()}</div>
		<div class="feature-cost">
			{context.i18nDerived.featurePerSpinCost(specialSpinsCost)}
		</div>
	</div>
	<div class="feature-toggle" class:on={stateGame.activeFeature === 'special_spins'}>
		<span class="knob"></span>
	</div>
</button>

<style lang="scss">
	.section-title {
		font-size: 1.1rem;
		font-weight: 800;
		color: #f0c674;
		text-align: center;
		letter-spacing: 0.01em;
		margin-bottom: 0.15rem;
	}

	.feature-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		width: 100%;
		padding: 0.55rem 0.7rem;
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 10px;
		cursor: pointer;
		text-align: left;
		color: inherit;
		font-family: inherit;
		transition: background 0.15s, border-color 0.15s;

		&:hover { background: rgba(0, 0, 0, 0.36); }

		&.active {
			border-color: rgba(76, 200, 120, 0.45);
		}
	}

	.feature-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		flex: 1;
		min-width: 0;
	}

	.feature-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #fff;
	}

	.feature-cost {
		font-size: 0.72rem;
		font-weight: 700;
		color: #4cd964;
		letter-spacing: 0.03em;
	}

	.feature-toggle {
		flex: 0 0 auto;
		width: 38px;
		height: 22px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 999px;
		position: relative;
		transition: background 0.2s;
	}

	.feature-toggle.on { background: #4cd964; }

	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		background: #6e6e6e;
		border-radius: 50%;
		transition: left 0.2s, background 0.2s;
	}

	.feature-toggle.on .knob {
		left: 18px;
		background: #fff;
	}
</style>
