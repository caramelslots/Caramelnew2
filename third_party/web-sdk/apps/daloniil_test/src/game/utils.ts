import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import {
	SYMBOL_SIZE,
	REEL_PADDING,
	SYMBOL_INFO_MAP,
	BOARD_DIMENSIONS,
	MYSTERY_REVEAL_ANIMATION,
	MYSTERY_REVEAL_SYNC_ANIMATION,
	M_SIZE,
} from './constants';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap, playMysteryRevealBatch } from './bookEventHandlerMap';
import type { RawSymbol, SymbolName, SymbolState } from './types';

// general utils
export const { getEmptyBoard } = createGetEmptyPaddedBoard({ reelsDimensions: BOARD_DIMENSIONS });
const { playBookEvent, playBookEvents: playBookEventsSequential } = createPlayBookUtils({
	bookEventHandlerMap,
});

export { playBookEvent };

/** Runs consecutive `mysteryReveal` book-events in one parallel reveal (math emits one per reel). */
export const playBookEvents = async (
	bookEvents: Bet['state'],
	bookEventContext?: Parameters<typeof playBookEventsSequential>[1],
) => {
	const context = bookEventContext ?? {};
	let index = 0;

	while (index < bookEvents.length) {
		const bookEvent = bookEvents[index];
		if (bookEvent.type === 'mysteryReveal') {
			const batch: BookEventOfType<'mysteryReveal'>[] = [];
			while (index < bookEvents.length && bookEvents[index].type === 'mysteryReveal') {
				batch.push(bookEvents[index] as BookEventOfType<'mysteryReveal'>);
				index += 1;
			}
			await playMysteryRevealBatch(batch);
			continue;
		}
		await playBookEvent(bookEvent, { bookEvents, ...context });
		index += 1;
	}
};

export const playBet = async (bet: Bet) => {
	stateBet.winBookEventAmount = 0;
	await playBookEvents(bet.state);
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

// resume bet
const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'updateGlobalMult',
	'freeSpinTrigger',
	'updateFreeSpin',
	'setTotalWin',
];

export const convertTorResumableBet = (betToResume: Bet) => {
	const resumingIndex = Number(betToResume.event);
	const bookEventsBeforeResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex < resumingIndex,
	);
	const bookEventsAfterResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex >= resumingIndex,
	);

	const bookEventToCreateSnapshot: BookEventOfType<'createBonusSnapshot'> = {
		index: 0,
		type: 'createBonusSnapshot',
		bookEvents: bookEventsBeforeResume.filter((bookEvent) =>
			BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(bookEvent.type),
		),
	};

	const stateToResume = [bookEventToCreateSnapshot, ...bookEventsAfterResume];

	return { ...betToResume, state: stateToResume };
};

// other utils
export const getSymbolX = (reelIndex: number) => SYMBOL_SIZE * (reelIndex + REEL_PADDING);
export const getSymbolY = (symbolIndexOfBoard: number) => (symbolIndexOfBoard + 0.5) * SYMBOL_SIZE;

export const getMysteryRevealSymbolInfo = (
	revealedSymbol: SymbolName,
	options?: { syncAnimation?: boolean },
) => {
	// Designer combined skeleton ships a single `Mystery/explosion` track
	// that handles every reveal — `revealedSymbol` is no longer used to
	// pick a tier-specific animation. We still take it as a parameter so
	// the caller signature stays stable for math-emitted reveal events.
	void revealedSymbol;
	const animationName = options?.syncAnimation
		? MYSTERY_REVEAL_SYNC_ANIMATION
		: MYSTERY_REVEAL_ANIMATION;
	return {
		type: 'spine' as const,
		assetKey: 'M' as const,
		animationName,
		sizeRatios: { width: M_SIZE, height: M_SIZE },
	};
};

export const toRevealedRawSymbol = (revealedSymbol: SymbolName): RawSymbol => {
	if (revealedSymbol === 'W') {
		return { name: 'W', wild: true, multiplier: 1 };
	}
	return { name: revealedSymbol };
};

export const getSymbolInfo = ({
	rawSymbol,
	state,
}: {
	rawSymbol: RawSymbol;
	state: SymbolState;
}) => {
	if (rawSymbol.name === 'M' && state === 'mysteryReveal' && rawSymbol.mysteryRevealTo) {
		return getMysteryRevealSymbolInfo(rawSymbol.mysteryRevealTo, {
			syncAnimation: rawSymbol.mysteryRevealSync,
		});
	}
	return SYMBOL_INFO_MAP[rawSymbol.name][state];
};
