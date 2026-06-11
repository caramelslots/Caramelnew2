import { stateBet, stateBetDerived, stateConfig } from 'state-shared';

import {
	BONUS_BOOST_COST_MULT,
	SPECIAL_SPINS_COST_MULT,
} from './activeFeature';
import { stateGame } from './stateGame.svelte';

export const BUY_NORMAL_COST_MULT = 100;
export const BUY_SUPER_COST_MULT = 200;

export const buyBonusCost = (costMultiplier: number) => stateBet.betAmount * costMultiplier;

/** Достаточно ли баланса для покупки бонуса (bet ×100 / ×200). */
export const canAffordBuyBonus = (costMultiplier: number) =>
	stateBet.betAmount > 0 && stateBet.balanceAmount >= buyBonusCost(costMultiplier);

export const canAffordBuyBonusForModeKey = (modeKey: string) => {
	if (modeKey === 'bonus_super') return canAffordBuyBonus(BUY_SUPER_COST_MULT);
	if (modeKey === 'bonus_normal') return canAffordBuyBonus(BUY_NORMAL_COST_MULT);
	return false;
};

/** Множитель стоимости обычного спина (BASE + Bonus Boost / Special Spins). */
export const spinCostMultiplier = () => {
	const mode = stateBetDerived.activeBetMode();
	if (mode?.type === 'activate') return mode.costMultiplier;
	if (stateGame.activeFeature === 'bonus_boost') return BONUS_BOOST_COST_MULT;
	if (stateGame.activeFeature === 'special_spins') return SPECIAL_SPINS_COST_MULT;
	return 1;
};

export const spinCost = () => stateBet.betAmount * spinCostMultiplier();

/** Достаточно ли баланса для спина при текущей ставке и активных фичах. */
export const canAffordSpin = () =>
	stateBet.betAmount > 0 && stateBet.balanceAmount >= spinCost();

/** Достаточно ли баланса для активации Bonus Boost (bet ×2 за спин). */
export const canAffordBonusBoost = () =>
	stateBet.betAmount > 0 &&
	stateBet.balanceAmount >= stateBet.betAmount * BONUS_BOOST_COST_MULT;

/** Достаточно ли баланса для спина с указанной ставкой и текущими фичами. */
export const canAffordBetAmount = (betAmount: number) =>
	betAmount > 0 && stateBet.balanceAmount >= betAmount * spinCostMultiplier();

export const nextBetOption = () =>
	[...stateConfig.betAmountOptions]
		.sort((a, b) => a - b)
		.find((opt) => opt > stateBet.betAmount);

/** Можно ли поднять ставку на следующий шаг из betAmountOptions. */
export const canIncreaseBet = () => {
	const next = nextBetOption();
	if (next == null) return false;
	return canAffordBetAmount(next);
};
