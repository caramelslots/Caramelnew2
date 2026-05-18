import { stateBet } from 'state-shared';

import { stateGame } from './stateGame.svelte';

export type ActiveFeature = 'bonus_boost' | 'special_spins';

export const BONUS_BOOST_COST_MULT = 2;
export const SPECIAL_SPINS_COST_MULT = 30;

/** Синхронизирует stateBet.activeBetModeKey с stateGame.activeFeature. */
export const syncActiveBetModeKey = () => {
	const current = stateBet.activeBetModeKey;
	if (current === 'bonus_normal' || current === 'bonus_super') return;
	const feature = stateGame.activeFeature;
	if (feature === 'bonus_boost') stateBet.activeBetModeKey = 'bonus_boost';
	else if (feature === 'special_spins') stateBet.activeBetModeKey = 'special_spins';
	else stateBet.activeBetModeKey = 'BASE';
};

export const toggleActiveFeature = (feature: ActiveFeature) => {
	stateGame.activeFeature = stateGame.activeFeature === feature ? null : feature;
	syncActiveBetModeKey();
};

/** Сбрасывает boost/special перед покупкой buy-bonus. */
export const clearActiveFeature = () => {
	stateGame.activeFeature = null;
	syncActiveBetModeKey();
};
