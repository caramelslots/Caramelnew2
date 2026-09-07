import { stateBet, stateUi } from 'state-shared';

import { stateGame } from './stateGame.svelte';

export type ActiveFeature = 'bonus_boost';

export const BONUS_BOOST_COST_MULT = 2;

/** Синхронизирует stateBet.activeBetModeKey с stateGame.activeFeature. */
export const syncActiveBetModeKey = () => {
	const current = stateBet.activeBetModeKey;
	if (current === 'bonus_normal' || current === 'bonus_super') return;
	const feature = stateGame.activeFeature;
	if (feature === 'bonus_boost') stateBet.activeBetModeKey = 'bonus_boost';
	else stateBet.activeBetModeKey = 'BASE';
};

export const toggleActiveFeature = (feature: ActiveFeature) => {
	stateGame.activeFeature = stateGame.activeFeature === feature ? null : feature;
	syncActiveBetModeKey();
};

/** Сбрасывает boost перед покупкой buy-bonus. */
export const clearActiveFeature = () => {
	stateGame.activeFeature = null;
	syncActiveBetModeKey();
};

/** Bonus Boost или активный buy-bonus bet-mode. */
export const isAnyBonusActive = () => {
	if (stateGame.activeFeature != null) return true;
	const key = stateBet.activeBetModeKey;
	return key === 'bonus_boost' || key === 'bonus_normal' || key === 'bonus_super';
};

/** Free Spins feature round — hide spin button on all layouts. */
export const isFreeSpinsActive = () =>
	stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow;
