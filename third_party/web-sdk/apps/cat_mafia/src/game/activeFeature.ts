import { stateBet, stateUi } from 'state-shared';

import { stateGame } from './stateGame.svelte';
import { isDuelActive } from './stateDuel.svelte';

export type ActiveFeature = 'bonus_boost' | 'special_spins';

export const BONUS_BOOST_COST_MULT = 2;
export const SPECIAL_SPINS_COST_MULT = 30;

/** Синхронизирует stateBet.activeBetModeKey с stateGame.activeFeature. */
export const syncActiveBetModeKey = () => {
	const current = stateBet.activeBetModeKey;
	if (
		current === 'bonus_normal' ||
		current === 'bonus_super' ||
		current === 'bonus_duel' ||
		current === 'bonus_duel_cat' ||
		current === 'bonus_duel_dog'
	)
		return;
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

/** Bonus Boost, Special Spins или активный buy-bonus bet-mode. */
export const isAnyBonusActive = () => {
	if (stateGame.activeFeature != null) return true;
	const key = stateBet.activeBetModeKey;
	return (
		key === 'bonus_boost' ||
		key === 'special_spins' ||
		key === 'bonus_normal' ||
		key === 'bonus_super' ||
		key === 'bonus_duel' ||
		key === 'bonus_duel_cat' ||
		key === 'bonus_duel_dog'
	);
};

/** Free Spins feature round — hide spin button on all layouts. */
export const isFreeSpinsActive = () =>
	stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow;

/** Duel feature round — same HUD lock as FS (no spin/bet/buy). */
export { isDuelActive };

export const isLockedBonusHud = () => isFreeSpinsActive() || isDuelActive();
