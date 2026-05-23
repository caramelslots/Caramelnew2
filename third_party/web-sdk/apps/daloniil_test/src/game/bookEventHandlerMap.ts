import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateUi } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';
import config from './config';
import { WIN_INFO_PRE_DELAY_MS } from './constants';
import { toRevealedRawSymbol } from './utils';

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	if (winLevelData?.sound?.sfx) {
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	if (winLevelData?.type === 'big') {
		eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
	}
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame') {
		// check if SUPERSPIN, when finishing a bet.
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		await stateGameDerived.enhancedBoard.spin({
			revealEvent: bookEvent,
			paddingBoard: config.paddingReels[bookEvent.gameType],
		});
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		// Breathing room after the reels land before the win celebration kicks
		// in (also lets the symbol bounce animation finish landing).
		await waitForTimeout(WIN_INFO_PRE_DELAY_MS);

		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });

		// All winning paylines render simultaneously — PaylineOverlay keeps an
		// array of active lines so multiple `paylineShow` events stack.
		// `paylineRows` — полный rows-паттерн линии через ВСЕ катушки (5),
		// чтобы overlay рисовал линию от левого до правого края, а не только
		// до последнего выигрышного символа (см. скриншот референса).
		for (const win of bookEvent.wins) {
			const paylineRows = config.paylines[String(win.meta.lineIndex) as keyof typeof config.paylines];
			eventEmitter.broadcast({
				type: 'paylineShow',
				lineIndex: win.meta.lineIndex,
				positions: win.positions,
				paylineRows,
			});
		}

		// Symbols repeating across multiple paylines must animate only once;
		// `boardWithAnimateSymbols` swaps `oncomplete` per position, so two
		// concurrent calls on the same cell would race and leave it hanging.
		const allPositions = _.uniqWith(
			bookEvent.wins.flatMap((win) => win.positions),
			(a, b) => a.reel === b.reel && a.row === b.row,
		);
		await animateSymbols({ positions: allPositions });

		eventEmitter.broadcast({ type: 'paylineClearAll' });
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// Сброс Cash Stacks FS-state при входе в FS.
		stateGame.bonusCollected = 0;
		stateGame.ladderTier = 0;
		stateGame.mysteryReels = [];
		// animate bonus symbols (former scatters)
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: bookEvent.totalFs,
		});
		stateUi.freeSpinCounterTotal = bookEvent.totalFs;
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount + 1,
			total: bookEvent.total,
		});
		stateUi.freeSpinCounterCurrent = bookEvent.amount + 1;
		stateUi.freeSpinCounterTotal = bookEvent.total;
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		// Очистка Cash Stacks FS state.
		stateGame.bonusCollected = 0;
		stateGame.ladderTier = 0;
		stateGame.mysteryReels = [];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		stateUi.freeSpinCounterShow = false;
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		// Do nothing
	},
	// === Cash Stacks custom events ===
	bonusCollect: async (bookEvent: BookEventOfType<'bonusCollect'>) => {
		stateGame.bonusCollected = bookEvent.collectedTotal;
		// Анимация символов на позициях Bonus (как при scatter-win).
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
	},
	ladderTierUp: async (bookEvent: BookEventOfType<'ladderTierUp'>) => {
		stateGame.ladderTier = bookEvent.newTier;
		eventEmitter.broadcast({ type: 'ladderPulse' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		// Если новый tier приносит дополнительные mystery reels — добавим визуальный hint.
		if (bookEvent.rewardedMysteryReels) {
			// Реальная активация конкретных reels происходит через mysteryReelActivate.
		}
	},
	mysteryReelActivate: async (bookEvent: BookEventOfType<'mysteryReelActivate'>) => {
		// Объединяем с уже активными sticky reels (persistent=true в FS).
		const merged = Array.from(new Set([...stateGame.mysteryReels, ...bookEvent.reels])).sort();
		stateGame.mysteryReels = merged;
	},
	mysteryReelUnlock: async (bookEvent: BookEventOfType<'mysteryReelUnlock'>) => {
		// REDESIGN_PLAN §2.5.2: full-screen celebration overlay показывается
		// при разблокировке нового sticky mystery reel через ladder
		// (collect 4 B = +1 reel). broadcastAsync ждёт пока overlay
		// проиграет полный цикл анимации (~2.4s) — это блокирует
		// следующий FS-spin до окончания celebration.
		await eventEmitter.broadcastAsync({
			type: 'mysteryReelUnlock',
			reels: bookEvent.reels,
			tierAfter: bookEvent.tierAfter,
			rewardSpins: bookEvent.rewardSpins,
		});
	},
	mysteryReveal: async (bookEvent: BookEventOfType<'mysteryReveal'>) => {
		await playMysteryRevealBatch([bookEvent]);
	},
	// customised
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		function findLastBookEvent<T>(type: T) {
			return _.findLast(bookEvents, (bookEvent) => bookEvent.type === type) as
				| BookEventOfType<T>
				| undefined;
		}

		const lastFreeSpinTriggerEvent = findLastBookEvent('freeSpinTrigger' as const);
		const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);
		const lastUpdateGlobalMultEvent = findLastBookEvent('updateGlobalMult' as const);

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
		if (lastUpdateGlobalMultEvent) playBookEvent(lastUpdateGlobalMultEvent, { bookEvents });
	},
};

/** Math emits one `mysteryReveal` per sticky reel — batch plays them in parallel on the client. */
export const playMysteryRevealBatch = async (bookEvents: BookEventOfType<'mysteryReveal'>[]) => {
	if (bookEvents.length === 0) return;

	const syncAnimation = bookEvents.length > 1;

	eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_win' });
	await eventEmitter.broadcastAsync({
		type: 'boardMysteryRevealBatch',
		reveals: bookEvents.map((bookEvent) => ({
			symbolPositions: bookEvent.positions,
			revealedSymbol: bookEvent.revealedSymbol,
		})),
		syncAnimation,
	});

	for (const bookEvent of bookEvents) {
		const revealedRaw = toRevealedRawSymbol(bookEvent.revealedSymbol);
		for (const pos of bookEvent.positions) {
			const reelSymbol = stateGame.board[pos.reel]?.reelState.symbols[pos.row];
			if (!reelSymbol) continue;
			reelSymbol.rawSymbol = revealedRaw;
			reelSymbol.symbolState = 'static';
		}
	}
};
