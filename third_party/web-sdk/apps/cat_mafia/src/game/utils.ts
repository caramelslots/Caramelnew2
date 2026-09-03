import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import {
	SYMBOL_SIZE,
	REEL_PADDING,
	REEL_SYMBOL_X_NUDGE_PX,
	FULL_COLUMN_SYMBOL_NAMES,
	getFullColumnBayCenterX,
	SYMBOL_INFO_MAP,
	BOARD_DIMENSIONS,
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
import { ensureDuelPurchaseReveal } from './duelPurchaseReveal';

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
	// Buy Duel: ensure purchase reveal lands 3× BD (math emits it; client pads old books).
	const events = ensureDuelPurchaseReveal(bet.state);
	await playBookEvents(events);
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
/** Geometric centre of a reel column (no rail nudge). */
export const getReelCenterX = (reelIndex: number) => SYMBOL_SIZE * (reelIndex + REEL_PADDING);

/**
 * Symbol X on the board. Full-column specials (B/W/SW) sit on the parchment
 * bay centres (same math as the rail mask). Other symbols use the flat
 * 5×100 grid plus the small right-rail nudge.
 */
export const getSymbolX = (reelIndex: number, symbolName?: SymbolName | string) =>
	symbolName && FULL_COLUMN_SYMBOL_NAMES.has(symbolName)
		? getFullColumnBayCenterX(reelIndex)
		: getReelCenterX(reelIndex) + (REEL_SYMBOL_X_NUDGE_PX[reelIndex] ?? 0);
export const getSymbolY = (symbolIndexOfBoard: number) => (symbolIndexOfBoard + 0.5) * SYMBOL_SIZE;

export const getMysteryRevealSymbolInfo = (
	revealedSymbol: SymbolName,
	options?: { syncAnimation?: boolean },
) => {
	void revealedSymbol;
	void options;
	return {
		type: 'placeholder' as const,
		assetKey: 'mystery' as const,
		label: 'M',
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
			const mapEntry = SYMBOL_INFO_MAP[rawSymbol.name];
			// Static may be a WebP (B / BT) with 1:1 bay ratios. Spine still needs
			// inflated skeleton sizeRatios + offsets from land/win — otherwise the
			// visible frame shrinks to ~half a cell (Bonus idle preview bug).
			const spineSizing =
				mapEntry.land.type === 'spine'
					? mapEntry.land
					: mapEntry.win.type === 'spine'
						? mapEntry.win
						: mapEntry.static;
			return {
				type: 'spine' as const,
				assetKey: resolved.assetKey,
				animationName: resolved.animationName,
				sizeRatios: spineSizing.sizeRatios,
				loop: resolved.loop,
				devNonce: preview.nonce,
				...('offsetX' in spineSizing && typeof spineSizing.offsetX === 'number'
					? { offsetX: spineSizing.offsetX }
					: {}),
				...('offsetY' in spineSizing && typeof spineSizing.offsetY === 'number'
					? { offsetY: spineSizing.offsetY }
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
	if (state === 'idleBounce' || state === 'winLift') {
		return SYMBOL_INFO_MAP[rawSymbol.name].static;
	}
	return SYMBOL_INFO_MAP[rawSymbol.name][state];
};
