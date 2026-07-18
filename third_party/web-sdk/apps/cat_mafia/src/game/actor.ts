import _ from 'lodash';

import { stateBet, stateModal, stateUrlDerived } from 'state-shared';
import { checkIsMultipleRevealEvents } from 'utils-book';
import { createPrimaryMachines, createIntermediateMachines, createGameActor } from 'utils-xstate';

import type { Bet } from './typesBookEvent';
import { playBet, convertTorResumableBet } from './utils';
import { sanitizeBetForCatMafia } from './sanitizeBetForCatMafia';
import { stateGameDerived } from './stateGame.svelte';
import { eventEmitter } from './eventEmitter';
import { clearWinSpotlight } from './bookEventHandlerMap';
import { resetIdleBounceSymbols } from './boardIdleBounce';

const primaryMachines = createPrimaryMachines<Bet>({
	onResumeGameActive: (betToResume) => convertTorResumableBet(betToResume),
	onResumeGameInactive: (betToResume) => {
		const lastRevealEvent = _.findLast(
			betToResume.state,
			(bookEvent) => bookEvent?.type === 'reveal',
		);

		if (lastRevealEvent) stateGameDerived.enhancedBoard.settle(lastRevealEvent.board);
	},
	onNewGameStart: async () => {
		// Как только игрок нажал Bet — сразу убираем затемнение и paylines от
		// предыдущего выигрыша, чтобы они пропадали одновременно со стартом
		// барабанов, а не после него (см. clearWinSpotlight).
		clearWinSpotlight();
		resetIdleBounceSymbols();
		stateBet.winBookEventAmount = 0;
		eventEmitter.broadcast({ type: 'winHide' });
		// Reel scroll starts in `reveal` when RGS returns the result board —
		// not while the bet request is in flight (see bookEventHandlerMap).
	},
	onNewGameError: () => stateGameDerived.enhancedBoard.settle(),
	onPlayGame: async (bet) => {
		await playBet(sanitizeBetForCatMafia(bet));
		// End of replay sequence — offer Replay Again (checklist requirement).
		if (stateUrlDerived.replay()) {
			stateModal.modal = { name: 'replayComplete' };
		}
	},
	checkIsBonusGame: (bet) => checkIsMultipleRevealEvents({ bookEvents: bet.state }),
});

const intermediateMachines = createIntermediateMachines(primaryMachines);

export const gameActor = createGameActor(intermediateMachines);
