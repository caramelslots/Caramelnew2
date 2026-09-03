import { stateBet } from 'state-shared';

import config from './config';
import { getFreegamePaddingBoard } from './stateDuelBoards.svelte';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import { stateXstateDerived } from './stateXstate';
import type { GameType } from './types';

export const shouldSkipPreSpin = () =>
	(stateBet.isTurbo && stateXstateDerived.isAutoBetting()) || stateBet.isSpaceHold;

/** Pre-spin scroll before a reveal — same path as `actor.onNewGameStart`. */
export const runPreSpin = async (gameType: GameType) => {
	if (shouldSkipPreSpin()) return;

	// Sticky SW columns stay locked during pre-spin (do not scroll with other reels).
	const stickyFrozenReels =
		gameType === 'freegame' ? Object.keys(stateGame.stickySwByReel).map(Number) : [];

	const paddingBoard =
		gameType === 'freegame'
			? getFreegamePaddingBoard(config.paddingReels.freegame, stateGame.stickySwByReel)
			: config.paddingReels[gameType];

	await stateGameDerived.enhancedBoard.preSpin({
		paddingBoard,
		frozenReelIndices: stickyFrozenReels,
	});
};
