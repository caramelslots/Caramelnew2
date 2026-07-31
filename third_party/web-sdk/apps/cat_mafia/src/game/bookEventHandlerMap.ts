import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateUi } from 'state-shared';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';
import config from './config';
import {
	resetMysteryReelSession,
	markMysteryReelPendingCollapse,
	getMysteryReelsPendingCollapseIndices,
	awaitMysteryCollapseIdle,
} from './mysteryReel';
import {
	BOARD_DIMENSIONS,
	WIN_INFO_PRE_DELAY_MS,
	SW_PHASE1_HOLD_MS,
	SW_PHASE2_PRE_MS,
	SW_SECOND_WIN_PRE_DELAY_MS,
	BONUS_WIN_PRE_DELAY_MS,
	BONUS_WIN_POST_DELAY_MS,
	MYSTERY_REVEAL_PRE_DELAY_MS,
	MYSTERY_REVEAL_POST_DELAY_MS,
	WIN_SPOTLIGHT_CLEAR_DELAY_MS,
} from './constants';
import { scaleMsByGameSpeed, waitForGameSpeed } from './gameSpeed';
import { waitForTimeout } from 'utils-shared/wait';
import { computeCatSlowTriggerReel, catSlowReelsAfterTrigger, CAT_SLOW_EXTRA_SYMBOL_ROWS } from './catAnticipation';
import {
	MASCOT_COIN_FLY_WAIT_MS,
	MASCOT_HAT_CATCH_BEFORE_COINS_MS,
	MASCOT_HAT_ON_MS,
} from './mascotHtmlSpine';

// Таймер фонового снятия затемнения/paylines. Хранится здесь, чтобы
// `reveal` мог отменить его при старте нового спина раньше истечения задержки.
let spotlightClearTimer: ReturnType<typeof setTimeout> | null = null;
import { toRevealedRawSymbol } from './utils';
import { resetIdleBounceSymbols } from './boardIdleBounce';

/**
 * Немедленно снимает затемнение невыигрышных символов и скрывает paylines,
 * отменяя фоновый таймер. Вызывается при старте нового спина (как только
 * игрок нажал Bet — см. actor.onNewGameStart), чтобы линии/затемнение
 * пропадали одновременно со стартом барабанов, а не после него.
 */
export const clearWinSpotlight = () => {
	if (spotlightClearTimer !== null) {
		clearTimeout(spotlightClearTimer);
		spotlightClearTimer = null;
	}
	stateGame.winSpotlightActive = false;
	eventEmitter.broadcast({ type: 'paylineClearAll' });
};

const DRUM_MAX = 6;

/** Fill a reel column with Super Wild (padded visible rows). */
const expandSuperWildColumn = (reelIndex: number, mult: number) => {
	const reel = stateGame.board[reelIndex];
	if (!reel) return;
	for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
		const cell = reel.reelState.symbols[paddedRow];
		if (!cell) continue;
		cell.rawSymbol = { name: 'SW', wild: true, multiplier: mult };
		cell.symbolState = 'static';
	}
};

/** Visible rows of a padded reveal column that are full Super Wild → mult, else null. */
const fullSwMultFromRevealColumn = (column: { name: string; multiplier?: number }[]) => {
	let swRows = 0;
	let mult = 2;
	for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
		const cell = column[paddedRow];
		if (cell?.name === 'SW') {
			swRows += 1;
			mult = cell.multiplier || mult;
		}
	}
	return swRows >= BOARD_DIMENSIONS.y ? mult : null;
};

/**
 * Before FS spin: paint sticky SW columns and return reel indices that must not spin.
 * Super first spin: sticky reel is already full-SW on the reveal board — detect & lock it.
 * If preSpin already started that reel, stop it so the column stays still.
 */
const prepareStickySwFrozenReels = (revealBoard: { name: string; multiplier?: number }[][]) => {
	if (stateGame.gameType !== 'freegame') return [] as number[];

	for (let reelIndex = 0; reelIndex < revealBoard.length; reelIndex++) {
		const fromState = stateGame.stickySwByReel[reelIndex];
		const fromReveal = fullSwMultFromRevealColumn(revealBoard[reelIndex] || []);
		const mult = fromState ?? fromReveal;
		if (mult == null) continue;
		stateGame.stickySwByReel[reelIndex] = mult;
		stateGame.stickySwOpened = true;

		const reel = stateGame.board[reelIndex] as {
			stopPreSpin?: () => void;
			setSymbolsWithRawSymbols?: (symbols: { name: string; wild?: boolean; multiplier?: number }[]) => void;
		};
		reel?.stopPreSpin?.();
		const stickyColumn = (revealBoard[reelIndex] || []).map((cell) =>
			cell.name === 'SW'
				? { name: 'SW' as const, wild: true as const, multiplier: mult }
				: { ...cell },
		);
		if (stickyColumn.length && reel?.setSymbolsWithRawSymbols) {
			reel.setSymbolsWithRawSymbols(stickyColumn);
		} else {
			expandSuperWildColumn(reelIndex, mult);
		}
	}

	return Object.keys(stateGame.stickySwByReel).map(Number);
};

/** Sticky / Super: keep SW columns painted after the other reels land. */
const applyStickySwPreExpanded = async () => {
	if (stateGame.gameType !== 'freegame') return;
	const stickyReels = Object.keys(stateGame.stickySwByReel).map(Number);
	if (!stickyReels.length && !stateGame.stickySwOpened) return;

	for (const reel of stickyReels) {
		expandSuperWildColumn(reel, stateGame.stickySwByReel[reel] || 2);
	}
	if (stickyReels.length) {
		await waitForGameSpeed(120, stateGame.gameSpeed);
		stateGame.superWildCurtain = null;
	}
};

/** Next `setWin` before the following `reveal`, if any. */
const findNextSetWin = (bookEvents: BookEvent[], fromEvent: BookEvent) => {
	const startIdx = bookEvents.indexOf(fromEvent);
	if (startIdx < 0) return undefined;
	for (let i = startIdx + 1; i < bookEvents.length; i++) {
		const event = bookEvents[i];
		if (event.type === 'setWin') return event;
		if (event.type === 'reveal') break;
	}
	return undefined;
};

/** Next `setTotalWin` before the following `reveal`, if any. */
const findNextSetTotalWin = (bookEvents: BookEvent[], fromEvent: BookEvent) => {
	const startIdx = bookEvents.indexOf(fromEvent);
	if (startIdx < 0) return undefined;
	for (let i = startIdx + 1; i < bookEvents.length; i++) {
		const event = bookEvents[i];
		if (event.type === 'setTotalWin') return event;
		if (event.type === 'reveal') break;
	}
	return undefined;
};

/** SW spins emit multiple winInfo/setTotalWin (pre-expand + product). */
const spinHasSuperWildExpand = (bookEvents: BookEvent[]) =>
	bookEvents.some((e) => e.type === 'superWildExpand');

const IDLE_BOUNCE_BLOCKING_EVENTS = new Set(['winInfo', 'setWin', 'finalWin']);

/** True when this reveal's round includes a win — idle symbol tease stays off. */
const revealHasWinBeforeNextReveal = (bookEvents: BookEvent[], revealEvent: BookEvent) => {
	const startIdx = bookEvents.indexOf(revealEvent);
	if (startIdx < 0) return false;
	for (let i = startIdx + 1; i < bookEvents.length; i++) {
		const event = bookEvents[i];
		if (event.type === 'reveal') break;
		if (IDLE_BOUNCE_BLOCKING_EVENTS.has(event.type)) return true;
	}
	return false;
};

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	// Wincap (level 10) hides UI — the count-up runs ~32s and a visible HUD
	// would otherwise stay live during the celebration. After the 4-tier
	// rework the wincap alias is `sensational` (shared with level 9), so we
	// gate on `level === 10` instead of an alias string.
	if (winLevelData?.level === 10) eventEmitter.broadcastAsync({ type: 'uiHide' });
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

const winLevelSoundsStop = (options?: { music?: 'bgm_main' | 'bgm_freespin' }) => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (options?.music) {
		eventEmitter.broadcast({ type: 'soundMusic', name: options.music });
	} else if (stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame') {
		// check if SUPERSPIN, when finishing a bet.
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

/** Stops looping count-up audio (coin SFX + win-level BGM) and resumes paused loop BGM. */
export const stopWinLevelCountUpSounds = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	for (const name of [
		'bgm_winlevel_big',
		'bgm_winlevel_superwin',
		'bgm_winlevel_epic',
		'bgm_winlevel_max',
		'bgm_winlevel_mega',
	] as const) {
		eventEmitter.broadcast({ type: 'soundStop', name });
	}
	// Win-level overlay BGM pauses loop tracks (bgm_freespin / bgm_main) — resume them
	// so FS End (and other celebrations) stay audible after count-up finishes.
	if (stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame') {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	// Поднимаем флаг ДО broadcast'а — символы вне выигрыша начнут плавно
	// затемняться синхронно со стартом win-bounce. Сбрасывается в `reveal`
	// при старте следующего спина (см. ниже).
	stateGame.winSpotlightActive = true;
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};

/** Bonus scatter/collect paw-wave — delayed after reel landing. */
const animateBonusSymbols = async ({ positions }: { positions: Position[] }) => {
	await waitForGameSpeed(BONUS_WIN_PRE_DELAY_MS, stateGame.gameSpeed);
	eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
	await animateSymbols({ positions });
	await waitForGameSpeed(BONUS_WIN_POST_DELAY_MS, stateGame.gameSpeed);
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		// Снимаем затемнение/paylines немедленно (на случай резюма или
		// последующих reveal внутри одного бета). При нажатии Bet это уже
		// сделано в actor.onNewGameStart, поэтому здесь — идемпотентный no-op.
		clearWinSpotlight();
		resetIdleBounceSymbols();

		// Cat Mafia Stage B — reset paw / SW overlay state each spin.
		stateGame.pawCoinCells = [];
		stateGame.pawCoinTotal = 0;
		stateGame.pawCoinBagVisible = false;
		stateGame.pawCoinFlying = false;
		stateGame.superWildCurtain = null;

		stateGame.gameType = bookEvent.gameType;

		// Sync the reel engine with the visible board before every spin so that:
		// – FS back-to-back reveals chain from the correct position (no stale pool
		//   or win-presentation drift between consecutive freegame reveals).
		// – After FS ends, M-symbols left on frozen mystery-reel columns by
		//   `mysteryReveal`/`mysteryCollapse` are replaced with a neutral symbol
		//   before the first basegame spin builds its scroll strip. Without this
		//   the engine's internal pool still contains M, and one of those cells
		//   briefly flashes during the new basegame reel scroll.
		//   Frozen reels never participate in `enhancedBoard.spin()` (they are
		//   always excluded via `frozenReelIndices`), so replacing M → L1 in the
		//   settle target is safe: the pool value is never read for those reels.
		{
			const settledBoard = stateGame.board.map((reel) =>
				reel.reelState.symbols
					.slice(0, reel.reelLength)
					.map(({ rawSymbol }) =>
						rawSymbol.name === 'M' ? { name: 'L1' as const } : { ...rawSymbol },
					),
			);
			stateGameDerived.enhancedBoard.settle(settledBoard);
		}

		// Reels that revealed on the previous spin are still showing the revealed
		// symbol. Kick off their collapse animation fire-and-forget so it plays
		// concurrently with the new spin, then skip them from the spin itself.
		const pendingCollapseReels = getMysteryReelsPendingCollapseIndices();
		if (pendingCollapseReels.length > 0) {
			eventEmitter.broadcast({
				type: 'boardMysteryCollapseReels',
				reelIndices: pendingCollapseReels,
			});
		}

		// Full reel scroll starts here once RGS has returned the result board.
		// Frozen Mystery reels don't spin — they stay showing ? until FS ends.
		// Pending-collapse reels are also skipped: the collapse handles their display.
		// Extra FS after shoot: strip BT from the reveal board (math should too;
		// this guards stale RGS / old storybook books that still land bullets).
		const revealEvent =
			stateGame.fsExtraPhase && bookEvent.gameType === 'freegame'
				? {
						...bookEvent,
						board: bookEvent.board.map((reel) =>
							reel.map((cell) =>
								cell.name === 'BT' ? { ...cell, name: 'L2' as const } : cell,
							),
						),
					}
				: bookEvent;

		stateGame.catSlowTriggerReel = computeCatSlowTriggerReel(revealEvent.board, revealEvent.gameType);
		stateGame.catSlowReels = [];
		const catSlowReelIndices = catSlowReelsAfterTrigger(
			stateGame.catSlowTriggerReel,
			revealEvent.board.length,
		);
		// Sticky SW columns stay put — paint them and exclude from spin (like frozen mystery).
		const stickyFrozenReels =
			revealEvent.gameType === 'freegame'
				? prepareStickySwFrozenReels(revealEvent.board)
				: [];
		try {
			await stateGameDerived.enhancedBoard.spin({
				revealEvent,
				paddingBoard: config.paddingReels[revealEvent.gameType],
				frozenReelIndices: [
					...stateGame.mysteryReelsFrozen,
					...pendingCollapseReels,
					...stickyFrozenReels,
				],
				getExtraPaddingSymbols: (reelIndex) =>
					catSlowReelIndices.includes(reelIndex) ? CAT_SLOW_EXTRA_SYMBOL_ROWS : 0,
			});
		} finally {
			stateGame.catSlowTriggerReel = -1;
			stateGame.catSlowReels = [];
		}
		// Sticky / Super: re-paint locked columns after the other reels land.
		if (bookEvent.gameType === 'freegame') {
			await applyStickySwPreExpanded();
		}
		stateGame.idleBounceAllowed = !revealHasWinBeforeNextReveal(bookEvents, bookEvent);
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>, { bookEvents }: BookEventContext) => {
		stateGame.idleBounceAllowed = false;

		let eventIndex = bookEvents.indexOf(bookEvent);
		if (eventIndex < 0 && 'index' in bookEvent) {
			eventIndex = bookEvents.findIndex(
				(e) => e.type === 'winInfo' && 'index' in e && e.index === bookEvent.index,
			);
		}
		const expandIndex = bookEvents.findIndex((e) => e.type === 'superWildExpand');
		// True two-beat: expand is followed by another winInfo (base + bonus new SW).
		// Sticky-only FS spins emit expand without a second winInfo — don't hold paylines.
		const hasWinInfoAfterExpand =
			expandIndex >= 0 &&
			bookEvents.slice(expandIndex + 1).some((e) => e.type === 'winInfo');
		// Phase 2: winInfo after SW curtain — clear phase-1 lines, longer beat.
		const isPostSwExpand = eventIndex >= 0 && expandIndex >= 0 && eventIndex > expandIndex;
		// Phase 1 when a curtain + second winInfo follows — expand handler clears after hold.
		const swExpandFollows =
			eventIndex >= 0 && expandIndex > eventIndex && hasWinInfoAfterExpand;

		if (isPostSwExpand) {
			clearWinSpotlight();
			await waitForGameSpeed(SW_SECOND_WIN_PRE_DELAY_MS, stateGame.gameSpeed);
		} else {
			// Breathing room after the reels land before the win celebration kicks
			// in (also lets the symbol bounce animation finish landing).
			await waitForGameSpeed(WIN_INFO_PRE_DELAY_MS, stateGame.gameSpeed);
		}

		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });

		// All winning paylines render simultaneously — PaylineOverlay keeps an
		// array of active lines so multiple `paylineShow` events stack.
		// `paylineRows` — полный rows-паттерн линии через ВСЕ катушки (5),
		// чтобы overlay рисовал линию от левого до правого края, а не только
		// до последнего выигрышного символа (см. скриншот референса).
		for (const win of bookEvent.wins) {
			const paylineRows =
				config.paylines[String(win.meta.lineIndex) as keyof typeof config.paylines];
			eventEmitter.broadcast({
				type: 'paylineShow',
				lineIndex: win.meta.lineIndex,
				positions: win.positions,
				paylineRows,
			});
		}

		const anchorWin = bookEvent.wins[0];
		if (anchorWin) {
			eventEmitter.broadcast({
				type: 'paylineWinAmountShow',
				amount: bookEvent.totalWin,
				anchor: {
					lineIndex: anchorWin.meta.lineIndex,
					positions: anchorWin.positions,
				},
			});

			const nextSetWin = findNextSetWin(bookEvents, bookEvent);
			const nextWinLevelData =
				nextSetWin != null ? winLevelMap[nextSetWin.winLevel as WinLevel] : undefined;
			const isSmallWinFlow = !nextWinLevelData || nextWinLevelData.type !== 'big';

			// SW spins: do not += spin totals — pre/post expand + product would
			// flash HUD (e.g. 290 → 250 → 290). setTotalWin is the source of truth.
			if (
				isSmallWinFlow &&
				!isPostSwExpand &&
				!spinHasSuperWildExpand(bookEvents)
			) {
				stateBet.winBookEventAmount = stateBet.winBookEventAmount + bookEvent.totalWin;
			}
		}

		// Symbols repeating across multiple paylines must animate only once;
		// `boardWithAnimateSymbols` swaps `oncomplete` per position, so two
		// concurrent calls on the same cell would race and leave it hanging.
		const allPositions = _.uniqWith(
			bookEvent.wins.flatMap((win) => win.positions),
			(a, b) => a.reel === b.reel && a.row === b.row,
		);
		await animateSymbols({ positions: allPositions });

		// Phase-1 before SW curtain: keep paylines until expand handler clears them.
		if (swExpandFollows) return;

		// Запускаем фоновый таймер (не блокирует pipeline — игрок может делать
		// ставку сразу). По истечении WIN_SPOTLIGHT_CLEAR_DELAY_MS снимаем
		// затемнение и paylines. Если до этого стартует новый спин, `reveal`
		// отменит таймер через clearTimeout выше.
		if (spotlightClearTimer !== null) clearTimeout(spotlightClearTimer);
		spotlightClearTimer = setTimeout(
			() => {
				spotlightClearTimer = null;
				stateGame.winSpotlightActive = false;
				eventEmitter.broadcast({ type: 'paylineClearAll' });
			},
			scaleMsByGameSpeed(WIN_SPOTLIGHT_CLEAR_DELAY_MS, stateGame.gameSpeed),
		);
	},
	setTotalWin: async (
		bookEvent: BookEventOfType<'setTotalWin'>,
		{ bookEvents }: BookEventContext,
	) => {
		// Intermediate totals before SW product / phase-2 — skip so HUD only
		// jumps once to the final cumulative (avoids up→down→up flicker).
		if (
			spinHasSuperWildExpand(bookEvents) &&
			findNextSetTotalWin(bookEvents, bookEvent)
		) {
			return;
		}
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	// Cat Mafia Stage C — target pick before FS intro (natural + buy).
	freeSpinTargetPick: async (bookEvent: BookEventOfType<'freeSpinTargetPick'>) => {
		await eventEmitter.broadcastAsync({
			type: 'freeSpinTargetPick',
			targets: bookEvent.targets,
			chosenIndex: bookEvent.chosenIndex,
			awardedFs: bookEvent.awardedFs,
		});
	},
	freeSpinTrigger: async (
		bookEvent: BookEventOfType<'freeSpinTrigger'>,
		{ bookEvents }: BookEventContext,
	) => {
		// Сброс FS-state при входе в FS.
		stateGame.bonusCollected = 0;
		stateGame.ladderTier = 0;
		stateGame.mysteryReels = [];
		stateGame.ladderVisible = false;
		resetMysteryReelSession();
		// Stage D — drum + bonus mode
		stateGame.drumCount = 0;
		stateGame.fsMainTotal = bookEvent.totalFs;
		stateGame.fsExtraPhase = false;
		stateGame.bulletFly = null;
		stateGame.stickySwByReel = {};
		stateGame.bonusMode =
			stateBet.activeBetModeKey === 'bonus_super' || stateGame.bonusMode === 'super'
				? 'super'
				: 'normal'; // natural trigger / bonus_normal / bonus_boost → Normal rules
		// Super: at least one sticky SW from first FS. Normal: opens as SW lands (can be several).
		stateGame.stickySwOpened = stateGame.bonusMode === 'super';
		// Cat Mafia: target pick already celebrated the trigger — skip Wok-style
		// scatter/bonusCollect win anim. Also skip if bonusCollect preceded us.
		const hadTargetPick = bookEvents.some((e) => e.type === 'freeSpinTargetPick');
		const eventIdx = bookEvents.indexOf(bookEvent);
		const prevEvent = eventIdx > 0 ? bookEvents[eventIdx - 1] : undefined;
		const prevPrev = eventIdx > 1 ? bookEvents[eventIdx - 2] : undefined;
		const hadBonusCollect =
			prevEvent?.type === 'bonusCollect' || prevPrev?.type === 'bonusCollect';
		if (!hadTargetPick && !hadBonusCollect && bookEvent.positions?.length) {
			await animateBonusSymbols({ positions: bookEvent.positions });
		}
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition', gameType: 'freegame' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin', withIntro: true });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		// Cat Mafia: no Progress Ladder — keep hidden.
		stateGame.ladderVisible = false;
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
	freeSpinEnd: async (
		bookEvent: BookEventOfType<'freeSpinEnd'>,
		{ bookEvents }: BookEventContext,
	) => {
		// freeSpinEnd.amount is FS-only; RGS payout / finalWin is base + FS.
		// Outro must match the bet payout the player sees in Bets.
		const finalWinEvent = bookEvents.find((e) => e.type === 'finalWin') as
			| BookEventOfType<'finalWin'>
			| undefined;
		const outroAmount =
			finalWinEvent?.amount ??
			(stateBet.winBookEventAmount > 0 ? stateBet.winBookEventAmount : bookEvent.amount);
		stateBet.winBookEventAmount = outroAmount;
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		// Очистка FS state (drum kept until outro starts — Stage E may shoot first).
		stateGame.bonusCollected = 0;
		stateGame.ladderTier = 0;
		stateGame.mysteryReels = [];
		stateGame.ladderVisible = false;
		resetMysteryReelSession();
		stateGame.bonusMode = null;
		stateGame.drumCount = 0;
		stateGame.fsMainTotal = 0;
		stateGame.fsExtraPhase = false;
		stateGame.bulletFly = null;
		stateGame.stickySwByReel = {};
		stateGame.stickySwOpened = false;
		stateGame.mascotPose = 'idle';

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: outroAmount,
			winLevelData,
		});
		// gameType is still `freegame` until the transition animation — force main BGM.
		winLevelSoundsStop({ music: 'bgm_main' });
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		stateUi.freeSpinCounterShow = false;
		await eventEmitter.broadcastAsync({ type: 'transition', gameType: 'basegame' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>, { bookEvents }: BookEventContext) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		// Stake UX: small/medium wins are non-blocking — board amount + HUD WIN
		// are raised during winInfo; skip duplicate increment here.
		if (winLevelData.type !== 'big') {
			return;
		}

		// Big-win HUD before celebration. With SW, multiple setWin can fire
		// (pre-expand + ×product) — `+= spin` double-counts; use next setTotalWin.
		const nextTotal = findNextSetTotalWin(bookEvents, bookEvent);
		if (nextTotal) {
			stateBet.winBookEventAmount = nextTotal.amount;
		} else {
			stateBet.winBookEventAmount = stateBet.winBookEventAmount + bookEvent.amount;
		}

		// For big wins above level 6, the visual ladder starts at Big Win and
		// advances upward. Start BGM from the first ladder tier (Big Win) so the
		// sound progression matches the banner progression. Win.svelte's $effect
		// will advance the BGM as each tier unlocks. For level 6 (Big Win itself)
		// and small wins there is no ladder, so play the target level's sound as usual.
		const BIG_WIN_LEVEL = 6 as const;
		const firstTierData =
			winLevelData.type === 'big' && winLevelData.level > BIG_WIN_LEVEL
				? winLevelMap[BIG_WIN_LEVEL]
				: winLevelData;

		stateGame.mascotPose = 'wow';
		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData: firstTierData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
		stateGame.mascotPose = 'idle';
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		// Do nothing
	},
	// === Wok Fury custom events (no-op — Cat Mafia has no ladder/mystery) ===
	bonusCollect: async () => {},
	ladderTierUp: async () => {},
	mysteryReelActivate: async () => {},
	mysteryReelUnlock: async () => {},
	mysteryReveal: async () => {},

	// === Cat Mafia Stage B ===
	superWildExpand: async (
		bookEvent: BookEventOfType<'superWildExpand'>,
		{ bookEvents }: BookEventContext,
	) => {
		if (bookEvents.some((e) => e.type === 'pawCoinResolve')) {
			console.warn('[Cat Mafia] XOR violated: superWildExpand with pawCoinResolve');
		}

		const columnAlreadyOpen = bookEvent.expands.every((e) => {
			const reel = stateGame.board[e.reel];
			let swRows = 0;
			for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
				if (reel?.reelState.symbols[paddedRow]?.rawSymbol.name === 'SW') swRows += 1;
			}
			return swRows >= BOARD_DIMENSIONS.y;
		});

		// Sticky columns already open: paint only, no curtain. Win HUD from setWin/setTotalWin.
		if (stateGame.gameType === 'freegame' && columnAlreadyOpen) {
			for (const expand of bookEvent.expands) {
				stateGame.stickySwByReel[expand.reel] = expand.mult;
				stateGame.stickySwOpened = true;
				expandSuperWildColumn(expand.reel, expand.mult);
			}
			return;
		}

		// Base (and new FS opens): hold phase-1 paylines, then clear before curtain so
		// the post-expand winInfo reads as a distinct second interaction.
		const willShowCurtain = bookEvent.expands.some((expand) => {
			const reel = stateGame.board[expand.reel];
			let swRows = 0;
			for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
				if (reel?.reelState.symbols[paddedRow]?.rawSymbol.name === 'SW') swRows += 1;
			}
			return !(swRows >= BOARD_DIMENSIONS.y || stateGame.stickySwByReel[expand.reel] != null);
		});
		if (willShowCurtain) {
			await waitForGameSpeed(SW_PHASE1_HOLD_MS, stateGame.gameSpeed);
			clearWinSpotlight();
		}

		// New open(s): lying cell → curtain per new column. Already-open columns skip curtain.
		stateGame.mascotPose = 'react';
		for (const expand of bookEvent.expands) {
			const reel = stateGame.board[expand.reel];
			let swRows = 0;
			for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
				if (reel?.reelState.symbols[paddedRow]?.rawSymbol.name === 'SW') swRows += 1;
			}
			const alreadyOpen =
				swRows >= BOARD_DIMENSIONS.y || stateGame.stickySwByReel[expand.reel] != null;

			if (!alreadyOpen) {
				stateGame.superWildCurtain = {
					reel: expand.reel,
					mult: expand.mult,
					phase: 'expanding',
				};
				await waitForGameSpeed(450, stateGame.gameSpeed);
			}
			expandSuperWildColumn(expand.reel, expand.mult);
			// Keep column lit without entering awaiting `win` anim — phase-2 winInfo
			// (or the next spin) will drive real win celebrations. Leaving `win` here
			// hung the book when animateSymbols re-set the same state (no oncomplete).
			for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
				const cell = stateGame.board[expand.reel]?.reelState.symbols[paddedRow];
				if (cell) cell.symbolState = 'postWinStatic';
			}
			stateGame.stickySwByReel[expand.reel] = expand.mult;
			stateGame.stickySwOpened = true;
			if (!alreadyOpen) {
				stateGame.superWildCurtain = {
					reel: expand.reel,
					mult: expand.mult,
					phase: 'done',
				};
			}
		}

		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
		await waitForGameSpeed(400, stateGame.gameSpeed);
		stateGame.superWildCurtain = null;
		stateGame.mascotPose = 'idle';
		// Beat before phase-2 winInfo (post-expand lines × product).
		if (willShowCurtain) {
			await waitForGameSpeed(SW_PHASE2_PRE_MS, stateGame.gameSpeed);
		}
	},

	bulletCollect: async (bookEvent: BookEventOfType<'bulletCollect'>) => {
		// Extra FS after shoot: no bullets.
		if (stateGame.fsExtraPhase) return;
		for (const pos of bookEvent.bullets) {
			if (stateGame.drumCount >= DRUM_MAX) break;
			stateGame.bulletFly = { reel: pos.reel, row: pos.row, key: Date.now() + pos.reel };
			stateGame.mascotPose = 'load';
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
			await waitForGameSpeed(380, stateGame.gameSpeed);
			stateGame.drumCount = Math.min(DRUM_MAX, stateGame.drumCount + 1);
			stateGame.bulletFly = null;
			stateGame.mascotPose = 'idle';
			await waitForGameSpeed(120, stateGame.gameSpeed);
		}
		stateGame.drumCount = Math.min(DRUM_MAX, bookEvent.drumCount);
	},

	/** Stage E — one auto shoot round after main FS; then optional extra FS. */
	targetShootRound: async (bookEvent: BookEventOfType<'targetShootRound'>) => {
		// Only one shooting round per bonus.
		if (stateGame.fsExtraPhase) return;

		await eventEmitter.broadcastAsync({
			type: 'targetShootRound',
			shots: bookEvent.shots,
			extraFs: bookEvent.extraFs,
		});

		stateGame.fsExtraPhase = true;
		stateGame.drumCount = 0;
		stateGame.mascotPose = 'idle';

		if (bookEvent.extraFs > 0) {
			const newTotal = (stateUi.freeSpinCounterTotal || stateGame.fsMainTotal) + bookEvent.extraFs;
			eventEmitter.broadcast({
				type: 'freeSpinCounterUpdate',
				current: stateUi.freeSpinCounterCurrent,
				total: newTotal,
			});
			stateUi.freeSpinCounterTotal = newTotal;
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		}
	},

	pawCoinResolve: async (
		bookEvent: BookEventOfType<'pawCoinResolve'>,
		{ bookEvents }: BookEventContext,
	) => {
		// Paw does not run in free spins.
		if (stateGame.gameType === 'freegame') return;
		if (bookEvents.some((e) => e.type === 'superWildExpand')) {
			console.warn('[Cat Mafia] XOR violated: pawCoinResolve with superWildExpand');
		}

		const cells = bookEvent.rows.flatMap((row) =>
			row.cells.map((cell) => ({
				reel: cell.reel,
				row: row.row,
				tier: cell.coinTier,
				win: cell.win,
			})),
		);

		stateGame.pawCoinCells = cells;
		stateGame.pawCoinTotal = bookEvent.totalCoinWin;
		stateGame.pawCoinFlying = false;
		// Hat out to catch — coins fly into the brim, then hat goes back on.
		stateGame.pawCoinBagVisible = true;
		stateGame.mascotPose = 'hatCatch';
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		// Wait until brim-out shake (~1.90s+), then fly coins into the hat mid-shake.
		await waitForGameSpeed(MASCOT_HAT_CATCH_BEFORE_COINS_MS, stateGame.gameSpeed);

		stateGame.pawCoinFlying = true;
		await waitForGameSpeed(MASCOT_COIN_FLY_WAIT_MS, stateGame.gameSpeed);

		stateBet.winBookEventAmount += bookEvent.totalCoinWin;
		stateGame.mascotPose = 'hatOn';
		// Reverse idle3 back onto the head (~truncated brim-out clip length).
		await waitForGameSpeed(MASCOT_HAT_ON_MS, stateGame.gameSpeed);

		stateGame.pawCoinBagVisible = false;
		stateGame.pawCoinFlying = false;
		stateGame.pawCoinCells = [];
		stateGame.pawCoinTotal = 0;
		stateGame.mascotPose = 'idle';
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

	// Collapse from the previous spin's reveal may still be running (it plays
	// concurrently with the reel scroll). Wait here so mysteryReveal never races
	// the reverse-explosion on the same cells.
	await awaitMysteryCollapseIdle();

	const syncAnimation = bookEvents.length > 1;

	// Reels stagger their landing (later reels carry more padding), so the
	// last-stopping reel transitions to `land` in the same tick as
	// `enhancedBoard.spin()` resolves. Without this pause, M-cells on that
	// reel skip the `?` static frame entirely and snap straight into the
	// reveal spine. Pause once for the whole batch so all reels show the
	// question mark for a guaranteed window before the reveal.
	await waitForGameSpeed(MYSTERY_REVEAL_PRE_DELAY_MS, stateGame.gameSpeed);

	eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_win' });
	await eventEmitter.broadcastAsync({
		type: 'boardMysteryRevealBatch',
		reveals: bookEvents.map((bookEvent) => ({
			symbolPositions: bookEvent.positions,
			revealedSymbol: bookEvent.revealedSymbol,
		})),
		syncAnimation,
	});

	// Board.svelte's runMysteryRevealBatch has finished: cells are now showing
	// the revealed symbol (static). Mark each reel as pending-collapse so the
	// next reveal handler fires the reverse-explosion concurrently with the spin.
	for (const bookEvent of bookEvents) {
		const reelIndex = bookEvent.positions[0]?.reel;
		if (reelIndex !== undefined) {
			markMysteryReelPendingCollapse(reelIndex, bookEvent.revealedSymbol);
		}

		for (const pos of bookEvent.positions) {
			const reelSymbol = stateGame.board[pos.reel]?.reelState.symbols[pos.row];
			if (!reelSymbol) continue;
			// Keep showing the revealed symbol until the collapse fires.
			reelSymbol.rawSymbol = toRevealedRawSymbol(bookEvent.revealedSymbol);
			reelSymbol.symbolState = 'static';
		}
	}

	// Sync the reel engine's prev/target arrays with the current board so the
	// next spin's padding pool starts from the correct symbols.
	const settledBoard = stateGame.board.map((reel) =>
		reel.reelState.symbols.slice(0, reel.reelLength).map(({ rawSymbol }) => ({ ...rawSymbol })),
	);
	stateGameDerived.enhancedBoard.settle(settledBoard);

	// Hold on the revealed symbol before winInfo / next spin (collapse runs on
	// the next reveal). Turbo 3 normally halves waits — keep the full post
	// delay there so open→close gap stays ~2× longer than the scaled wait.
	const postDelayMs =
		stateGame.gameSpeed === 3
			? MYSTERY_REVEAL_POST_DELAY_MS
			: scaleMsByGameSpeed(MYSTERY_REVEAL_POST_DELAY_MS, stateGame.gameSpeed);
	await waitForTimeout(postDelayMs);
};
