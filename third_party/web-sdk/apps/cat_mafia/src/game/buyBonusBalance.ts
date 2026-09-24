import { stateBet, stateBetDerived, stateConfig, stateMeta } from 'state-shared';

import {
	BONUS_BOOST_COST_MULT,
	SPECIAL_SPINS_COST_MULT,
} from './activeFeature';
import { stateGame } from './stateGame.svelte';

/** Fallbacks used until authenticate overwrites betModes.costMultiplier. */
export const BUY_NORMAL_COST_MULT = 100;
export const BUY_SUPER_COST_MULT = 200;
export const BUY_DUEL_COST_MULT = 150;

const modeCostMultiplier = (modeKey: string, fallback: number) => {
	const meta =
		stateMeta.betModeMeta?.[modeKey] ??
		stateMeta.betModeMeta?.[modeKey.toUpperCase()] ??
		stateMeta.betModeMeta?.[modeKey.toLowerCase()];
	const value = meta?.costMultiplier;
	return typeof value === 'number' && value > 0 ? value : fallback;
};

export const buyNormalCostMultiplier = () =>
	modeCostMultiplier('bonus_normal', BUY_NORMAL_COST_MULT);

export const buySuperCostMultiplier = () =>
	modeCostMultiplier('bonus_super', BUY_SUPER_COST_MULT);

export const buyDuelCostMultiplier = () => modeCostMultiplier('bonus_duel', BUY_DUEL_COST_MULT);

export const bonusBoostCostMultiplier = () =>
	modeCostMultiplier('bonus_boost', BONUS_BOOST_COST_MULT);

export const specialSpinsCostMultiplier = () =>
	modeCostMultiplier('special_spins', SPECIAL_SPINS_COST_MULT);

export const buyBonusCost = (costMultiplier: number) => stateBet.betAmount * costMultiplier;

/** Достаточно ли баланса для покупки бонуса (bet ×100 / ×200). */
export const canAffordBuyBonus = (costMultiplier: number) =>
	stateBet.betAmount > 0 && stateBet.balanceAmount >= buyBonusCost(costMultiplier);

export const canAffordBuyBonusForModeKey = (modeKey: string) => {
	if (modeKey === 'bonus_super') return canAffordBuyBonus(buySuperCostMultiplier());
	if (modeKey === 'bonus_normal') return canAffordBuyBonus(buyNormalCostMultiplier());
	if (
		modeKey === 'bonus_duel' ||
		modeKey === 'bonus_duel_cat' ||
		modeKey === 'bonus_duel_dog'
	)
		return canAffordBuyBonus(buyDuelCostMultiplier());
	return false;
};

/** Множитель стоимости обычного спина (BASE + Bonus Boost / Special Spins). */
export const spinCostMultiplier = () => {
	const mode = stateBetDerived.activeBetMode();
	if (mode?.type === 'activate') return mode.costMultiplier;
	if (stateGame.activeFeature === 'bonus_boost') return bonusBoostCostMultiplier();
	if (stateGame.activeFeature === 'special_spins') return specialSpinsCostMultiplier();
	return 1;
};

export const spinCost = () => stateBet.betAmount * spinCostMultiplier();

/** Достаточно ли баланса для спина при текущей ставке и активных фичах. */
export const canAffordSpin = () =>
	stateBet.betAmount > 0 && stateBet.balanceAmount >= spinCost();

/** Достаточно ли баланса для активации Bonus Boost (bet × costMultiplier за спин). */
export const canAffordBonusBoost = () =>
	stateBet.betAmount > 0 &&
	stateBet.balanceAmount >= stateBet.betAmount * bonusBoostCostMultiplier();

/** Достаточно ли баланса для спина с указанной ставкой и текущими фичами. */
export const canAffordBetAmount = (betAmount: number) =>
	betAmount > 0 && stateBet.balanceAmount >= betAmount * spinCostMultiplier();

export const nextBetOption = () => {
	const maxBound =
		stateConfig.maxBet > 0
			? stateConfig.maxBet
			: stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1];
	return [...stateConfig.betAmountOptions]
		.sort((a, b) => a - b)
		.find((opt) => opt > stateBet.betAmount && (maxBound == null || opt <= maxBound));
};

/** Можно ли поднять ставку на следующий шаг из betAmountOptions. */
export const canIncreaseBet = () => {
	const next = nextBetOption();
	if (next == null) return false;
	return canAffordBetAmount(next);
};
