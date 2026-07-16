import type { BaseBet } from 'utils-bet';
import { stateMeta } from './stateMeta.svelte';
import { stateConfig } from './stateConfig.svelte';

export type Currency = string;
export type BetToResume = BaseBet | null;
export type BetModeKey = string;

export const stateBet = $state({
	currency: 'USD' as Currency,
	balanceAmount: 0,
	betAmount: 1,
	wageredBetAmount: 1,
	betToResume: null as BetToResume,
	activeBetModeKey: 'BASE' as BetModeKey,
	winBookEventAmount: 0,
	autoSpinsLoss: 0,
	autoSpinsCounter: 0,
	autoSpinsLossLimitAmount: Infinity,
	autoSpinsSingleWinLimitAmount: Infinity,
	isSpaceHold: false,
	isTurbo: false,
});

const almostEqual = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** Pick nearest valid bet from authenticate `betLevels`, respecting min/max and balance. */
const snapBetAmount = (value: number) => {
	const levels = stateConfig.betAmountOptions;
	if (!levels.length) {
		if (value <= 0) return 0;
		const costMultiplier = betCostMultiplier();
		if (costMultiplier === 0) return 0;
		const maxAffordable = stateBet.balanceAmount / costMultiplier;
		return Math.min(value, maxAffordable);
	}

	const minBound = stateConfig.minBet > 0 ? stateConfig.minBet : levels[0];
	const maxBound = stateConfig.maxBet > 0 ? stateConfig.maxBet : levels[levels.length - 1];
	const costMultiplier = betCostMultiplier();
	const maxAffordable =
		costMultiplier > 0 ? stateBet.balanceAmount / costMultiplier : levels[levels.length - 1];

	const candidates = levels.filter(
		(level) => level + 1e-9 >= minBound && level - 1e-9 <= maxBound && level - 1e-9 <= maxAffordable,
	);

	if (!candidates.length) {
		// Prefer smallest configured level when nothing is affordable.
		return levels[0];
	}

	const target = Math.min(Math.max(value, minBound), Math.min(maxBound, maxAffordable));
	let best = candidates[0];
	let bestDist = Math.abs(candidates[0] - target);
	for (const level of candidates) {
		const dist = Math.abs(level - target);
		if (dist < bestDist - 1e-12 || (almostEqual(dist, bestDist) && level > best)) {
			best = level;
			bestDist = dist;
		}
	}
	return best;
};

const correctBetAmount = (value: number) => {
	if (value <= 0) return 0;
	return snapBetAmount(value);
};

const setBetAmount = (value: number) => {
	stateBet.betAmount = correctBetAmount(value);
};

const updateBetAmount = (update: (value: number) => number) => {
	stateBet.betAmount = correctBetAmount(update(stateBet.betAmount));
};

let isTurboLocked = false;

const updateIsTurbo = (value: boolean, options: { persistent: boolean }) => {
	const { persistent } = options;

	if (!persistent && isTurboLocked) return;
	if (persistent) isTurboLocked = value;

	stateBet.isTurbo = value;
};

const activeBetMode = () =>
	stateMeta.betModeMeta?.[stateBet.activeBetModeKey.toUpperCase()] ??
	stateMeta.betModeMeta?.[stateBet.activeBetModeKey.toLowerCase()] ??
	null;
const isContinuousBet = () => stateBet.autoSpinsCounter > 1 || stateBet.isSpaceHold;
const timeScale = () => (stateBet.isTurbo ? 2 : 1);
const betCostMultiplier = () =>
	stateBetDerived.activeBetMode()?.type === 'activate'
		? stateBetDerived.activeBetMode()?.costMultiplier ?? 1
		: 1;
const betCost = () => stateBet.betAmount * betCostMultiplier();
const isBetCostAvailable = () => betCost() > 0 && betCost() <= stateBet.balanceAmount;
const hasAutoBetCounter = () => stateBet.autoSpinsCounter !== 0;

export const stateBetDerived = {
	setBetAmount,
	updateBetAmount,
	updateIsTurbo,
	activeBetMode,
	isContinuousBet,
	timeScale,
	betCost,
	isBetCostAvailable,
	hasAutoBetCounter,
};
