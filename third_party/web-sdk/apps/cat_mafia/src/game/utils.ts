import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import {
	SYMBOL_SIZE,
	REEL_PADDING,
	REEL_SYMBOL_X_NUDGE_PX,
	SYMBOL_INFO_MAP,
	BOARD_DIMENSIONS,
	MYSTERY_REVEAL_ANIMATION,
	MYSTERY_REVEAL_SYNC_ANIMATION,
	MYSTERY_COLLAPSE_SPINE,
	M_SIZE,
} from './constants';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';
import { stateGame } from './stateGame.svelte';
import { devPreview } from './devPreview.svelte';
import { resolveSymbolDevPreview } from './symbolDevPreview';
import type { RawSymbol, SymbolName, SymbolState } from './types';

// general utils
export const { getEmptyBoard } = createGetEmptyPaddedBoard({ reelsDimensions: BOARD_DIMENSIONS });
const { playBookEvent, playBookEvents: playBookEventsSequential } = createPlayBookUtils({
	bookEventHandlerMap,
});

export { playBookEvent };

/** Play book events. Wok `mysteryReveal` batches are skipped (Cat Mafia has no Mystery). */
export const playBookEvents = async (
	bookEvents: Bet['state'],
	bookEventContext?: Parameters<typeof playBookEventsSequential>[1],
) => {
	const context = bookEventContext ?? {};
	let index = 0;

	while (index < bookEvents.length) {
		const bookEvent = bookEvents[index];
		if (bookEvent.type === 'mysteryReveal') {
			// Skip legacy Wok mystery reveals entirely.
			while (index < bookEvents.length && bookEvents[index].type === 'mysteryReveal') {
				index += 1;
			}
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
	'freeSpinTargetPick',
	'freeSpinTrigger',
	'updateFreeSpin',
	'targetShootRound',
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
export const getSymbolX = (reelIndex: number) =>
	SYMBOL_SIZE * (reelIndex + REEL_PADDING) + (REEL_SYMBOL_X_NUDGE_PX[reelIndex] ?? 0);
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
	if (revealedSymbol === 'SW') {
		return { name: 'SW', wild: true, multiplier: 2 };
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
	// DEV: force a spine clip onto matching board cells (Symbol Anims panel).
	const preview = devPreview.symbolAnim;
	if (preview && rawSymbol.name === preview.groupId) {
		const resolved = resolveSymbolDevPreview(preview);
		if (resolved) {
			const base = SYMBOL_INFO_MAP[rawSymbol.name].static;
			return {
				type: 'spine' as const,
				assetKey: resolved.assetKey,
				animationName: resolved.animationName,
				sizeRatios: base.sizeRatios,
				loop: resolved.loop,
				devNonce: preview.nonce,
				...('offsetY' in base && typeof base.offsetY === 'number'
					? { offsetY: base.offsetY }
					: {}),
			};
		}
	}
	if (rawSymbol.name === 'M' && state === 'mysteryReveal' && rawSymbol.mysteryRevealTo) {
		return getMysteryRevealSymbolInfo(rawSymbol.mysteryRevealTo, {
			syncAnimation: rawSymbol.mysteryRevealSync,
		});
	}
	if (rawSymbol.name === 'M' && state === 'mysteryCollapse') {
		return MYSTERY_COLLAPSE_SPINE;
	}
	// Turbo 3: skip land bounce — fast spin is already near-instant; bounce at 2×
	// is still hard to tell apart from Turbo 2, so land goes straight to static.
	if (state === 'land' && stateGame.gameSpeed === 3) {
		return SYMBOL_INFO_MAP[rawSymbol.name].static;
	}
	if (state === 'idleBounce') {
		return SYMBOL_INFO_MAP[rawSymbol.name].static;
	}
	return SYMBOL_INFO_MAP[rawSymbol.name][state];
};
