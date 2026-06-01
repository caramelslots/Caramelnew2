import { stateBet } from 'state-shared';

import config from './config';
import { stateGameDerived } from './stateGame.svelte';
import { stateXstateDerived } from './stateXstate';
import type { GameType } from './types';

export const shouldSkipPreSpin = () =>
	(stateBet.isTurbo && stateXstateDerived.isAutoBetting()) || stateBet.isSpaceHold;

/** Pre-spin scroll before a reveal — same path as `actor.onNewGameStart`. */
export const runPreSpin = async (gameType: GameType) => {
	if (shouldSkipPreSpin()) return;

	await stateGameDerived.enhancedBoard.preSpin({
		paddingBoard: config.paddingReels[gameType],
	});
};
