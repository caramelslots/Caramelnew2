import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateUi } from 'state-shared';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import { stateLayoutDerived } from './stateLayout';
import { devPreview } from './devPreview.svelte';
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
	PAW_PHASE1_HOLD_MS,
	PAW_COIN_WAVE_STEP_MS,
	BONUS_WIN_PRE_DELAY_MS,
	BONUS_WIN_POST_DELAY_MS,
	BULLET_FLY_MS,
	BULLET_FLY_LEAD_MS,
	BULLET_FLY_CATCH_MS,
	BULLET_DISAPPEAR_EARLY_MS,
	BULLET_FLY_GAP_MS,
	MYSTERY_REVEAL_PRE_DELAY_MS,
	MYSTERY_REVEAL_POST_DELAY_MS,
	WIN_SPOTLIGHT_CLEAR_DELAY_MS,
	TRANSITION_THEME_SWITCH_DELAY_MS,
} from './constants';
import { scaleMsByGameSpeed, waitForGameSpeed } from './gameSpeed';
import { waitForTimeout } from 'utils-shared/wait';
import {
	getDrumLastFilledChamberIndex,
	syncDrumBulletOrients,
	withDrumBulletOrient,
} from './revolverDrumLayout';
import { syncDrumLoadRotation } from './drumShoot';
import { resetDuelState, stateDuel, getDuelInitialVisibleBoard, resolveDuelPlayerPayout } from './stateDuel.svelte';
import {
	getDuelBoardStack,
	getDuelPaddingBoard,
	getFreegamePaddingBoard,
	padDuelBoardForPixi,
} from './stateDuelBoards.svelte';
import {
	applyDuelStickySwPreExpanded,
	expandDuelSuperWildColumn,
	prepareDuelStickySwFrozenReels,
	settleDuelBoardFromPixi,
} from './duelStickySw';
import type { DuelSide } from './stateDuel.svelte';
import {
	computeCatSlowTriggerReel,
	catSlowReelsAfterTrigger,
	CAT_SLOW_EXTRA_SYMBOL_ROWS,
} from './catAnticipation';
import {
	MASCOT_COIN_ANTICIPATE_MS,
	MASCOT_COIN_FLY_DURATION_MS,
	MASCOT_COIN_FLY_STAGGER_MS,
	MASCOT_COIN_FLY_WAIT_MS,
	MASCOT_GUN_END_LOAD_MS,
	MASCOT_GUN_START_MS,
	MASCOT_HAT_CATCH_BEFORE_COINS_MS,
	MASCOT_HAT_ON_MS,
	MASCOT_LOAD_MS,
} from './mascotHtmlSpine';

/** Beat between the paw landing (appear_flash flip) and the row→coin conversion. */
const PAW_COIN_CONVERT_DELAY_MS = 250;

const DUEL_POST_SPIN_MS = 280;
const FS_POST_SPIN_MS = 280;
const DUEL_BANK_FLOW_MS = 700;
const DUEL_BETWEEN_SPINS_MS = 350;

const duelSwRowsOnReel = (side: DuelSide, reelIndex: number) => {
	const stack = getDuelBoardStack(side);
	let swRows = 0;
	for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
		if (stack.board[reelIndex]?.reelState.symbols[paddedRow]?.rawSymbol.name === 'SW') {
			swRows += 1;
		}
	}
	return swRows;
};

const playDuelWinLines = async (
	side: DuelSide,
	wins: NonNullable<BookEventOfType<'duelSpin'>['wins']>,
	totalWin: number,
) => {
	if (!wins.length || totalWin <= 0) return;

	// Cancel any pending global spotlight clear from a previous desk/spin —
	// otherwise it can fire mid-celebration and wipe lines before win anims.
	if (spotlightClearTimer !== null) {
		clearTimeout(spotlightClearTimer);
		spotlightClearTimer = null;
	}

	await waitForGameSpeed(WIN_INFO_PRE_DELAY_MS, stateGame.gameSpeed);

	// Phone portrait: only one desk may celebrate at a time. Tear down the
	// other board's lines / postWinStatic right before this side starts.
	if (stateLayoutDerived.layoutType() === 'portrait') {
		clearDuelSideWinPresentation(side === 'cat' ? 'dog' : 'cat');
	}

	eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
	eventEmitter.broadcast({ type: 'boardFramePulse', side });
	// Dim only this desk — the other side stays full-bright.
	stateDuel.winSpotlightSide = side;

	for (const win of wins) {
		const lineIndex = win.meta?.lineIndex ?? 0;
		const paylineRows = config.paylines[String(lineIndex) as keyof typeof config.paylines];
		eventEmitter.broadcast({
			type: 'paylineShow',
			side,
			lineIndex,
			positions: win.positions,
			paylineRows,
		});
	}

	const anchorWin = wins[0];
	eventEmitter.broadcast({
		type: 'paylineWinAmountShow',
		side,
		amount: totalWin,
		anchor: {
			lineIndex: anchorWin.meta?.lineIndex ?? 0,
			positions: anchorWin.positions,
		},
	});

	const allPositions = _.uniqWith(
		wins.flatMap((win) => win.positions),
		(a, b) => a.reel === b.reel && a.row === b.row,
	);
	await eventEmitter.broadcastAsync({
		type: 'duelBoardAnimateSymbols',
		side,
		symbolPositions: allPositions,
	});

	if (spotlightClearTimer !== null) clearTimeout(spotlightClearTimer);
	spotlightClearTimer = setTimeout(
		() => clearWinSpotlight(),
		scaleMsByGameSpeed(WIN_SPOTLIGHT_CLEAR_DELAY_MS, stateGame.gameSpeed),
	);
};

// Таймер фонового снятия затемнения/paylines. Хранится здесь, чтобы
// `reveal` мог отменить его при старте нового спина раньше истечения задержки.
let spotlightClearTimer: ReturnType<typeof setTimeout> | null = null;
import { toRevealedRawSymbol } from './utils';
import { resetIdleBounceSymbols } from './boardIdleBounce';

/** Snap celebrate cells back to idle once paylines / spotlight end. */
const resetBoardCelebrateToIdle = (board: typeof stateGame.board) => {
	for (const reel of board) {
		for (const reelSymbol of reel.reelState.symbols) {
			if (
				reelSymbol.symbolState === 'winLift' ||
				reelSymbol.symbolState === 'win' ||
				reelSymbol.symbolState === 'postWinStatic'
			) {
				reelSymbol.symbolState = 'static';
			}
		}
	}
};

const resetWinCelebrateSymbolsToIdle = () => {
	resetBoardCelebrateToIdle(stateGame.board);
	resetBoardCelebrateToIdle(getDuelBoardStack('dog').board);
	resetBoardCelebrateToIdle(getDuelBoardStack('cat').board);
};

/** Drop paylines + celebrate on one duel desk only (phone one-at-a-time win). */
const clearDuelSideWinPresentation = (side: DuelSide) => {
	eventEmitter.broadcast({ type: 'paylineClearAll', side });
	resetBoardCelebrateToIdle(getDuelBoardStack(side).board);
	if (stateDuel.winSpotlightSide === side) {
		stateDuel.winSpotlightSide = null;
	}
};

/**
 * Немедленно снимает затемнение невыигрышных символов и скрывает paylines,
 * отменяя фоновый таймер. Выигрышные символы возвращаются в idle (`static`),
 * чтобы не продолжали крутить Win после исчезновения линий.
 * Вызывается по таймеру spotlight и при старте нового спина (actor.onNewGameStart).
 */
export const clearWinSpotlight = () => {
	if (spotlightClearTimer !== null) {
		clearTimeout(spotlightClearTimer);
		spotlightClearTimer = null;
	}
	stateGame.winSpotlightActive = false;
	stateDuel.winSpotlightSide = null;
	eventEmitter.broadcast({ type: 'paylineClearAll' });
	resetWinCelebrateSymbolsToIdle();
};

const DRUM_MAX = 6;

/** Product of open sticky SW column multipliers (FS). Math applies this after winInfo. */
const stickySwProductFromState = (byReel: Record<number, number | undefined>) => {
	const mults = Object.values(byReel).filter((m): m is number => m != null && m > 0);
	if (!mults.length) return 1;
	return mults.reduce((acc, m) => acc * m, 1);
};

/**
 * winInfo amounts are evaluated with SW mults neutralized.
 * Lying SW = plain wild → show raw totalWin on phase-1 (no upcoming product).
 * Open sticky columns already carry × — scale by stickyProduct for sticky-only /
 * phase-1 lines that pass through existing sticky.
 * Phase-2 book totals already include full productMult.
 */
const paylineAmountWithStickyProduct = ({
	totalWin,
	isPostSwExpand,
	stickyProduct,
}: {
	totalWin: number;
	isPostSwExpand: boolean;
	stickyProduct: number;
}) => {
	if (totalWin <= 0) return totalWin;
	// Phase-2 book totals already include productMult — do not double.
	if (isPostSwExpand) return totalWin;
	// Already-open sticky product (not the lying SW that will open this spin).
	if (stickyProduct > 1) return Math.round(totalWin * stickyProduct);
	return totalWin;
};

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
		// Normal: only lock reels already sticky in session state (not lying SW on reveal).
		const fromReveal =
			stateGame.bonusMode === 'super' ? fullSwMultFromRevealColumn(revealBoard[reelIndex] || []) : null;
		const mult = fromState ?? fromReveal;
		if (mult == null) continue;
		stateGame.stickySwByReel[reelIndex] = mult;
		stateGame.stickySwOpened = true;

		const reel = stateGame.board[reelIndex] as {
			stopPreSpin?: () => void;
			setSymbolsWithRawSymbols?: (
				symbols: { name: string; wild?: boolean; multiplier?: number }[],
			) => void;
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

/**
 * Mascot win beat — only on full-screen Big Win+ banners:
 * `like` for big/super, `applause` for epic/sensational.
 * Bumps `mascotAnimToken` so a second setWin can re-fire the same pose.
 * Portrait phone skips — keep idle looping under the banner.
 */
const triggerMascotWinReaction = (winLevelData: WinLevelData | undefined) => {
	if (!winLevelData || winLevelData.type !== 'big') return;
	if (stateLayoutDerived.layoutType() === 'portrait') return;
	const pose =
		winLevelData.alias === 'epic' || winLevelData.alias === 'sensational'
			? 'clap'
			: 'react';
	stateGame.mascotAnimToken += 1;
	stateGame.mascotPose = pose;
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

/** True when this spin's segment (until the next reveal) resolves paw coins. */
const hasPawResolveBeforeNextReveal = (bookEvents: BookEvent[], fromEvent: BookEvent) => {
	const startIdx = bookEvents.indexOf(fromEvent);
	if (startIdx < 0) return false;
	for (let i = startIdx + 1; i < bookEvents.length; i++) {
		const event = bookEvents[i];
		if (event.type === 'reveal') break;
		if (event.type === 'pawCoinResolve') return true;
	}
	return false;
};

/** True when FS entry (target pick / trigger / first FS reveal) follows this winInfo. */
const fsEntryFollowsWinInfo = (bookEvents: BookEvent[], eventIndex: number) => {
	if (eventIndex < 0) return false;
	for (let i = eventIndex + 1; i < bookEvents.length; i++) {
		const event = bookEvents[i];
		if (event.type === 'freeSpinTargetPick' || event.type === 'freeSpinTrigger') return true;
		if (event.type === 'reveal' && event.gameType === 'freegame') return true;
		if (
			event.type === 'winInfo' ||
			event.type === 'superWildExpand' ||
			event.type === 'setWin' ||
			event.type === 'setTotalWin'
		) {
			continue;
		}
		break;
	}
	return false;
};

/** True when line wins played in this spin's segment before the paw resolve. */
const hasWinInfoSinceLastReveal = (bookEvents: BookEvent[], fromEvent: BookEvent) => {
	const startIdx = bookEvents.indexOf(fromEvent);
	for (let i = startIdx - 1; i >= 0; i--) {
		const event = bookEvents[i];
		if (event.type === 'reveal') break;
		if (event.type === 'winInfo') return true;
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

const resumeLoopBgm = () => {
	if (
		stateBet.activeBetModeKey === 'SUPERSPIN' ||
		stateGame.gameType === 'freegame' ||
		stateDuel.active ||
		stateDuel.phase === 'outro'
	) {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
};

const winLevelSoundsStop = (options?: { music?: 'bgm_main' | 'bgm_freespin' }) => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (options?.music) {
		eventEmitter.broadcast({ type: 'soundMusic', name: options.music });
	} else {
		resumeLoopBgm();
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
	resumeLoopBgm();
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
		// Лапа остаётся горящей во время фазы-1 линий, если следом идёт
		// конверсия в монетки (исключение из димминга — см. ReelSymbol).
		// Снимается в конце pawCoinResolve.
		stateGame.pawPending = hasPawResolveBeforeNextReveal(bookEvents, bookEvent);

		stateGame.gameType = bookEvent.gameType;
		// Base: SW expand is not sticky across spins — clear so × badges / product
		// don't leak onto the next lying SW.
		if (bookEvent.gameType === 'basegame') {
			stateGame.stickySwByReel = {};
			stateGame.stickySwOpened = false;
		}

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
		// Extra FS after shoot, or main FS with a full drum: strip BT from the
		// reveal board (math should too; guards stale RGS / old storybook books).
		const stripBulletsFromReveal =
			bookEvent.gameType === 'freegame' &&
			(stateGame.fsExtraPhase || stateGame.drumCount >= DRUM_MAX);
		const revealEvent = stripBulletsFromReveal
			? {
					...bookEvent,
					board: bookEvent.board.map((reel) =>
						reel.map((cell) => (cell.name === 'BT' ? { ...cell, name: 'L2' as const } : cell)),
					),
				}
			: bookEvent;

		stateGame.catSlowTriggerReel = computeCatSlowTriggerReel(
			revealEvent.board,
			revealEvent.gameType,
		);
		stateGame.catSlowReels = [];
		const catSlowReelIndices = catSlowReelsAfterTrigger(
			stateGame.catSlowTriggerReel,
			revealEvent.board.length,
		);
		const paddingBoard =
			revealEvent.gameType === 'freegame'
				? getFreegamePaddingBoard(config.paddingReels.freegame)
				: config.paddingReels[revealEvent.gameType];
		// Sticky SW columns stay put — paint them and exclude from spin (like frozen mystery).
		const stickyFrozenReels =
			revealEvent.gameType === 'freegame' ? prepareStickySwFrozenReels(revealEvent.board) : [];
		try {
			await stateGameDerived.enhancedBoard.spin({
				revealEvent,
				paddingBoard,
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
		if (bookEvent.gameType === 'freegame' && !revealHasWinBeforeNextReveal(bookEvents, bookEvent)) {
			await waitForGameSpeed(FS_POST_SPIN_MS, stateGame.gameSpeed);
		}
		stateGame.idleBounceAllowed = !revealHasWinBeforeNextReveal(bookEvents, bookEvent);
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>, { bookEvents }: BookEventContext) => {
		stateGame.idleBounceAllowed = false;

		if (!bookEvent.wins?.length) return;

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
			expandIndex >= 0 && bookEvents.slice(expandIndex + 1).some((e) => e.type === 'winInfo');
		// Phase 2: winInfo after SW curtain — clear phase-1 lines, longer beat.
		const isPostSwExpand = eventIndex >= 0 && expandIndex >= 0 && eventIndex > expandIndex;
		// Phase 1 when a curtain + second winInfo follows — expand handler clears after hold.
		const swExpandFollows = eventIndex >= 0 && expandIndex > eventIndex && hasWinInfoAfterExpand;
		// Paw two-beat: линии играют первыми, затем pawCoinResolve держит фазу-1,
		// снимает spotlight и конвертит ряды — тот же хендофф, что у шторы SW,
		// поэтому фоновой таймер затемнения здесь не запускаем.
		const pawResolveFollows =
			eventIndex >= 0 && hasPawResolveBeforeNextReveal(bookEvents, bookEvent);

		if (isPostSwExpand) {
			// Normal FS: phase-2 lines only after a real phase-1 win (SW in a line).
			// Stale books emit reveal→expand→winInfo — skip those phantom lines.
			const isNormalFs =
				stateGame.gameType === 'freegame' && stateGame.bonusMode !== 'super';
			if (isNormalFs) {
				const expandEvent = expandIndex >= 0 ? bookEvents[expandIndex] : undefined;
				if (!expandEvent || !hasWinInfoSinceLastReveal(bookEvents, expandEvent)) {
					return;
				}
			}
			clearWinSpotlight();
			await waitForGameSpeed(SW_SECOND_WIN_PRE_DELAY_MS, stateGame.gameSpeed);
		} else {
			// Breathing room after the reels land before the win celebration kicks
			// in (also lets the symbol bounce animation finish landing).
			await waitForGameSpeed(WIN_INFO_PRE_DELAY_MS, stateGame.gameSpeed);
		}

		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		eventEmitter.broadcast({ type: 'boardFramePulse' });

		// Raise spotlight before paylines so non-winners start dimming with the
		// line draw (animateSymbols also sets this; idempotent).
		stateGame.winSpotlightActive = true;

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
			const stickyProduct = stickySwProductFromState(stateGame.stickySwByReel);
			// Phase-1 before a new curtain: never bake upcoming product into the
			// label — lying SW is a plain wild. Only already-open sticky scales.
			const lineAmount = paylineAmountWithStickyProduct({
				totalWin: bookEvent.totalWin,
				isPostSwExpand,
				stickyProduct: swExpandFollows ? 1 : stickyProduct,
			});
			eventEmitter.broadcast({
				type: 'paylineWinAmountShow',
				amount: lineAmount,
				anchor: {
					lineIndex: anchorWin.meta.lineIndex,
					positions: anchorWin.positions,
				},
			});

			const nextSetWin = findNextSetWin(bookEvents, bookEvent);
			const nextWinLevelData =
				nextSetWin != null ? winLevelMap[nextSetWin.winLevel as WinLevel] : undefined;
			const isSmallWinFlow = !nextWinLevelData || nextWinLevelData.type !== 'big';

			// SW / sticky product: setTotalWin is the only HUD source of truth —
			// never += a UI-scaled lineAmount (that double-credited ×N before curtain).
			if (
				isSmallWinFlow &&
				!isPostSwExpand &&
				!spinHasSuperWildExpand(bookEvents) &&
				stickyProduct <= 1
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

		// Phase-1 before SW curtain / paw resolve: keep paylines until the
		// feature handler clears them.
		if (swExpandFollows || pawResolveFollows) return;

		// Trigger spin entering FS: hold paylines before target pick / transition.
		if (fsEntryFollowsWinInfo(bookEvents, eventIndex)) {
			await waitForGameSpeed(BONUS_WIN_POST_DELAY_MS, stateGame.gameSpeed);
			clearWinSpotlight();
			return;
		}

		// Запускаем фоновый таймер (не блокирует pipeline — игрок может делать
		// ставку сразу). По истечении WIN_SPOTLIGHT_CLEAR_DELAY_MS снимаем
		// затемнение и paylines. Если до этого стартует новый спин, `reveal`
		// отменит таймер через clearTimeout выше.
		if (spotlightClearTimer !== null) clearTimeout(spotlightClearTimer);
		spotlightClearTimer = setTimeout(
			() => clearWinSpotlight(),
			scaleMsByGameSpeed(WIN_SPOTLIGHT_CLEAR_DELAY_MS, stateGame.gameSpeed),
		);
	},
	setTotalWin: async (
		bookEvent: BookEventOfType<'setTotalWin'>,
		{ bookEvents }: BookEventContext,
	) => {
		// Intermediate totals before SW product / phase-2 — skip so HUD only
		// jumps once to the final cumulative (avoids up→down→up flicker).
		if (spinHasSuperWildExpand(bookEvents) && findNextSetTotalWin(bookEvents, bookEvent)) {
			return;
		}
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	// Cat Mafia Stage C — cloud → target board → pick → congrats (while board exits).
	freeSpinTargetPick: async (bookEvent: BookEventOfType<'freeSpinTargetPick'>) => {
		clearWinSpotlight();
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition', gameType: 'freegame' });
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
		clearWinSpotlight();
		// Сброс FS-state при входе в FS.
		stateGame.bonusCollected = 0;
		stateGame.ladderTier = 0;
		stateGame.mysteryReels = [];
		resetMysteryReelSession();
		// Stage D — drum + bonus mode
		stateGame.drumCount = 0;
		stateGame.drumRotationDeg = 0;
		stateGame.drumBulletOrientDeg = {};
		stateGame.drumSeatAnimKey = {};
		stateGame.drumSpentChambers = {};
		stateGame.drumShakeKey = 0;
		stateGame.drumFiringChamber = null;
		stateGame.drumShootActive = false;
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
		const hadBonusCollect = prevEvent?.type === 'bonusCollect' || prevPrev?.type === 'bonusCollect';
		if (!hadTargetPick && !hadBonusCollect && bookEvent.positions?.length) {
			await animateBonusSymbols({ positions: bookEvent.positions });
		}
		// Target-pick path already ran cloud + FreeSpinIntro while the board exited.
		if (!hadTargetPick) {
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
		}
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

		// Очистка FS state — drum kept through outro so casings stay visible.
		stateGame.bonusCollected = 0;
		stateGame.ladderTier = 0;
		stateGame.mysteryReels = [];
		resetMysteryReelSession();
		stateGame.bonusMode = null;
		stateGame.drumFiringChamber = null;
		stateGame.drumShootActive = false;
		stateGame.fsMainTotal = 0;
		stateGame.fsExtraPhase = false;
		stateGame.bulletFly = null;
		stateGame.stickySwByReel = {};
		stateGame.stickySwOpened = false;

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
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
		stateGame.mascotPose = 'idle';
		// Drop drum after outro so it can sit through the celebration.
		stateGame.fsDrumWanted = false;
		stateGame.drumCount = 0;
		stateGame.drumRotationDeg = 0;
		stateGame.drumBulletOrientDeg = {};
		stateGame.drumSeatAnimKey = {};
		stateGame.drumSpentChambers = {};
		stateGame.drumShakeKey = 0;
		await eventEmitter.broadcastAsync({ type: 'transition', gameType: 'basegame' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>, { bookEvents }: BookEventContext) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		// Like / applause only when the Big Win+ overlay runs (not on paylines).
		triggerMascotWinReaction(winLevelData);

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
		if (stateDuel.active && bookEvent.side) {
			const side = bookEvent.side;
			const sticky = stateDuel.stickySwByReel[side];

			const columnAlreadyOpen = bookEvent.expands.every(
				(e) => duelSwRowsOnReel(side, e.reel) >= BOARD_DIMENSIONS.y,
			);

			if (columnAlreadyOpen) {
				for (const expand of bookEvent.expands) {
					sticky[expand.reel] = expand.mult;
					stateDuel.stickySwOpened[side] = true;
					expandDuelSuperWildColumn(getDuelBoardStack(side), expand.reel, expand.mult);
				}
				return;
			}

			const willShowCurtain = bookEvent.expands.some(
				(expand) =>
					!(
						duelSwRowsOnReel(side, expand.reel) >= BOARD_DIMENSIONS.y ||
						sticky[expand.reel] != null
					),
			);
			if (willShowCurtain) {
				await waitForGameSpeed(SW_PHASE1_HOLD_MS, stateGame.gameSpeed);
				clearWinSpotlight();
			}

			for (const expand of bookEvent.expands) {
				const alreadyOpen =
					duelSwRowsOnReel(side, expand.reel) >= BOARD_DIMENSIONS.y ||
					sticky[expand.reel] != null;

				if (!alreadyOpen) {
					stateDuel.superWildCurtain = {
						side,
						reel: expand.reel,
						mult: expand.mult,
						phase: 'expanding',
					};
					await waitForGameSpeed(450, stateGame.gameSpeed);
				}
				expandDuelSuperWildColumn(getDuelBoardStack(side), expand.reel, expand.mult);
				const stack = getDuelBoardStack(side);
				for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
					const cell = stack.board[expand.reel]?.reelState.symbols[paddedRow];
					if (cell) cell.symbolState = 'postWinStatic';
				}
				sticky[expand.reel] = expand.mult;
				stateDuel.stickySwOpened[side] = true;
				if (!alreadyOpen) {
					stateDuel.superWildCurtain = {
						side,
						reel: expand.reel,
						mult: expand.mult,
						phase: 'done',
					};
				}
			}

			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
			await waitForGameSpeed(400, stateGame.gameSpeed);
			stateDuel.superWildCurtain = null;
			if (willShowCurtain) {
				await waitForGameSpeed(SW_PHASE2_PRE_MS, stateGame.gameSpeed);
			}
			return;
		}

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

		// Normal FS gate (UI guard for stale books): new SW expands only after a
		// phase-1 winInfo in this spin — SW must have played in a line.
		const isNormalFs =
			stateGame.gameType === 'freegame' && stateGame.bonusMode !== 'super';
		if (isNormalFs && !hasWinInfoSinceLastReveal(bookEvents, bookEvent)) {
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
		// Mascot like/applause stays on Big Win setWin — not on the curtain itself.
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
		// Beat before phase-2 winInfo (post-expand lines × product).
		if (willShowCurtain) {
			await waitForGameSpeed(SW_PHASE2_PRE_MS, stateGame.gameSpeed);
		}
	},

	bulletCollect: async (bookEvent: BookEventOfType<'bulletCollect'>) => {
		// Extra FS after shoot: no bullets.
		if (stateGame.fsExtraPhase) return;

		const room = Math.max(0, DRUM_MAX - stateGame.drumCount);
		const batch = bookEvent.bullets.slice(0, room);
		if (batch.length > 0) {
			// All collected BTs fly to the hand together, then one catch → load.
			const baseKey = Date.now();
			stateGame.bulletFly = batch.map((pos, i) => ({
				reel: pos.reel,
				row: pos.row,
				chamber: stateGame.drumCount + i,
				key: baseKey + i,
			}));
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
			eventEmitter.broadcast({ type: 'boardFramePulse' });
			await waitForTimeout(BULLET_FLY_LEAD_MS);

			stateGame.mascotPose = 'gunStart';
			const gunStarted = performance.now();
			await waitForTimeout(Math.max(0, BULLET_FLY_CATCH_MS - BULLET_DISAPPEAR_EARLY_MS));
			stateGame.bulletFly = null;
			const gunElapsed = performance.now() - gunStarted;
			if (gunElapsed < MASCOT_GUN_START_MS) {
				await waitForTimeout(MASCOT_GUN_START_MS - gunElapsed);
			}

			// Seat drum UI when each clip finishes (`gun_start` = 1st, `load` = extras).
			const seatNextChamber = () => {
				stateGame.drumCount = Math.min(DRUM_MAX, stateGame.drumCount + 1);
				const seated = getDrumLastFilledChamberIndex(stateGame.drumCount);
				if (seated !== null) {
					stateGame.drumBulletOrientDeg = withDrumBulletOrient(
						stateGame.drumBulletOrientDeg,
						seated,
					);
					stateGame.drumSeatAnimKey = {
						...stateGame.drumSeatAnimKey,
						[seated]: (stateGame.drumSeatAnimKey[seated] ?? 0) + 1,
					};
				}
				syncDrumLoadRotation();
			};
			seatNextChamber();

			for (let i = 1; i < batch.length; i++) {
				stateGame.mascotPose = 'load';
				stateGame.mascotAnimToken += 1;
				await waitForTimeout(MASCOT_LOAD_MS);
				seatNextChamber();
			}

			stateGame.mascotPose = 'gunEndLoad';
			await waitForTimeout(MASCOT_GUN_END_LOAD_MS);
			stateGame.mascotPose = 'idle';
			await waitForGameSpeed(BULLET_FLY_GAP_MS, stateGame.gameSpeed);
		}

		stateGame.drumCount = Math.min(DRUM_MAX, bookEvent.drumCount);
		syncDrumLoadRotation();
		stateGame.drumBulletOrientDeg = syncDrumBulletOrients(
			stateGame.drumBulletOrientDeg,
			stateGame.drumCount,
		);
	},

	/** Stage E — player taps targets after main FS; rewards come from the book. */
	targetShootRound: async (bookEvent: BookEventOfType<'targetShootRound'>) => {
		// Only one shooting round per bonus.
		if (stateGame.fsExtraPhase) return;

		// Kill paylines / win celebrate before the cabinet slides over the mask.
		clearWinSpotlight();

		await eventEmitter.broadcastAsync({
			type: 'targetShootRound',
			shots: bookEvent.shots,
			extraFs: bookEvent.extraFs,
		});

		stateGame.fsExtraPhase = true;
		// Keep spent casings in the drum through extra FS.
		stateGame.drumFiringChamber = null;
		stateGame.drumShootActive = false;
		stateGame.drumShakeKey = 0;
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

		// Paw-coin cells (coinTier 0) are excluded from the overlay — the PB/PS/PG
		// board symbols already render as coins and never pay / never fly.
		const pawCells = new Set(bookEvent.paws.map((p) => `${p.reel}:${p.row}`));
		// Wave ring = Chebyshev distance from the nearest paw cell; the conversion
		// pops in ring by ring so the coins spread outward from the paw.
		const waveRing = (reel: number, row: number) =>
			bookEvent.paws.reduce(
				(best, p) => Math.min(best, Math.max(Math.abs(p.reel - reel), Math.abs(p.row - row))),
				Infinity,
			);
		const cells = bookEvent.rows
			.flatMap((row) =>
				row.cells
					.filter((cell) => cell.coinTier > 0 && !pawCells.has(`${cell.reel}:${row.row}`))
					.map((cell) => ({
						reel: cell.reel,
						row: row.row,
						tier: cell.coinTier as 1 | 2 | 3,
						win: cell.win,
						ring: waveRing(cell.reel, row.row),
					})),
			)
			// Hat fly stagger is index-based: top row first, then left → right
			// inside the row (the appear wave above stays ring-based).
			.sort((a, b) => a.row - b.row || a.reel - b.reel);
		const minRing = cells.length > 0 ? Math.min(...cells.map((c) => c.ring)) : 0;
		const pawCoinCells = cells.map(({ ring, ...cell }) => {
			const appearRing = ring - minRing;
			return {
				...cell,
				appearRing,
				appearDelayMs: appearRing * PAW_COIN_WAVE_STEP_MS,
			};
		});

		// Линии → монетки (тот же two-beat, что у шторы SW): если линии уже
		// отыграли, держим фазу-1 (paylines + spotlight) на холде, затем снимаем
		// затемнение — конверсия читается как отдельное второе событие.
		// На спинах только с лапой (без линий) остаётся короткий бит, чтобы
		// прочитался флип выпадения лапы (appear_flash).
		const linesPlayed = hasWinInfoSinceLastReveal(bookEvents, bookEvent);
		await waitForGameSpeed(
			linesPlayed ? PAW_PHASE1_HOLD_MS : PAW_COIN_CONVERT_DELAY_MS,
			stateGame.gameSpeed,
		);
		clearWinSpotlight();

		stateGame.pawCoinCells = pawCoinCells;
		stateGame.pawCoinTotal = bookEvent.totalCoinWin;
		stateGame.pawCoinFlying = false;
		stateGame.pawCoinPlayId += 1;
		// Freeze covered cells on the masked board (static) — do not leave them in
		// postWinStatic/win FX under the coin overlay (that burned rays through coins
		// after postWinStatic was lifted above the rails for H3).
		for (const cell of pawCoinCells) {
			const symbol = stateGame.board[cell.reel]?.reelState.symbols[cell.row];
			if (symbol) symbol.symbolState = 'static';
		}
		// Hat out to catch — coins fly into the brim, then hat goes back on.
		// Mascot clips always play at 1× (not turbo-scaled); waits match wall-clock clip length.
		stateGame.pawCoinBagVisible = true;
		stateGame.mascotPose = 'hatCatch';
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		eventEmitter.broadcast({ type: 'boardFramePulse' });
		// Wait until brim-out shake hold (~1.90s), then fly coins into the hat.
		// Hat clip is truncated here so it does NOT return until coins land.
		await waitForTimeout(MASCOT_HAT_CATCH_BEFORE_COINS_MS);

		stateGame.pawCoinFlying = true;
		// Keep the hat frozen out until the last coin finishes anticipation + flight.
		// (multi-row resolves outlast the single-row floor wait). Coin CSS still
		// follows turbo — scale this wait to match fly duration.
		const lastCoinLandMs =
			Math.max(0, pawCoinCells.length - 1) * MASCOT_COIN_FLY_STAGGER_MS +
			MASCOT_COIN_ANTICIPATE_MS +
			MASCOT_COIN_FLY_DURATION_MS +
			150;
		await waitForGameSpeed(Math.max(MASCOT_COIN_FLY_WAIT_MS, lastCoinLandMs), stateGame.gameSpeed);

		stateBet.winBookEventAmount += bookEvent.totalCoinWin;
		// Coins landed — resume hat forward so it finishes putting the hat back on.
		stateGame.mascotPose = 'hatOn';
		await waitForTimeout(MASCOT_HAT_ON_MS);

		stateGame.pawCoinBagVisible = false;
		stateGame.pawCoinFlying = false;
		stateGame.pawCoinCells = [];
		stateGame.pawCoinTotal = 0;
		stateGame.pawPending = false;
		stateGame.mascotPose = 'idle';
	},

	// === Duel Stage C (math books — amounts in book cents) ===
	/** Cosmetic 3×B celebrate after purchase reveal — same anim as freeSpinTrigger. */
	duelPurchaseCelebrate: async (bookEvent: BookEventOfType<'duelPurchaseCelebrate'>) => {
		clearWinSpotlight();
		if (bookEvent.positions?.length) {
			await animateBonusSymbols({ positions: bookEvent.positions });
		}
	},

	duelStart: async (bookEvent: BookEventOfType<'duelStart'>) => {
		const preservedSide =
			bookEvent.playerSide === 'cat' || bookEvent.playerSide === 'dog'
				? bookEvent.playerSide
				: stateDuel.playerSide;
		// Real book overrides layout-only DEV preview.
		devPreview.forceShowDuelLayout = false;
		resetDuelState();
		// Keep active=false until the cloud cover — same reveal timing as FS.
		stateDuel.phase = 'pick';
		stateDuel.totalSpinsPerSide = bookEvent.totalSpinsPerSide;
		stateBet.activeBetModeKey =
			preservedSide === 'dog'
				? 'bonus_duel_dog'
				: preservedSide === 'cat'
					? 'bonus_duel_cat'
					: 'bonus_duel';
		stateGame.activeFeature = null;

		const pad = getDuelPaddingBoard(config.paddingReels.basegame);
		stateDuel.dogBoard = getDuelInitialVisibleBoard();
		stateDuel.catBoard = getDuelInitialVisibleBoard();
		for (const side of ['dog', 'cat'] as const) {
			const visible = side === 'dog' ? stateDuel.dogBoard : stateDuel.catBoard;
			getDuelBoardStack(side).enhancedBoard.settle(padDuelBoardForPixi(visible, pad));
			eventEmitter.broadcast({ type: 'paylineClearAll', side });
		}

		if (preservedSide === 'cat' || preservedSide === 'dog') {
			stateDuel.playerSide = preservedSide;
		} else {
			eventEmitter.broadcast({ type: 'duelPickShow' });
			await eventEmitter.broadcastAsync({ type: 'duelPickUpdate' });
			eventEmitter.broadcast({ type: 'duelPickHide' });
		}

		// Cloud first — HUD hides under the cover; night duel scene reveals like FS.
		const transitionPromise = eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await waitForTimeout(TRANSITION_THEME_SWITCH_DELAY_MS);
		stateDuel.active = true;
		stateDuel.phase = 'playing';
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin', withIntro: true });
		await transitionPromise;

		// Rules splash after transition (same beat as freeSpinIntro after cloud).
		eventEmitter.broadcast({ type: 'duelIntroShow' });
		await eventEmitter.broadcastAsync({
			type: 'duelIntroUpdate',
			totalSpinsPerSide: bookEvent.totalSpinsPerSide,
			playerSide: stateDuel.playerSide ?? undefined,
		});
		eventEmitter.broadcast({ type: 'duelIntroHide' });

		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},

	duelSpin: async (bookEvent: BookEventOfType<'duelSpin'>) => {
		const side = bookEvent.side;
		const stack = getDuelBoardStack(side);
		const sticky = stateDuel.stickySwByReel[side];
		const twoBeat = bookEvent.swTwoBeat === true;
		stateDuel.activeSide = side;
		stateDuel.spinning = true;
		stateDuel.flowAmount = 0;
		stateDuel.flowSide = null;
		if (side === 'cat') stateDuel.catSpinWin = 0;
		else stateDuel.dogSpinWin = 0;

		eventEmitter.broadcast({ type: 'paylineClearAll', side });
		stateDuel.winSpotlightSide = null;

		const paddingBoard = getDuelPaddingBoard(config.paddingReels.basegame);
		// Same as bonus_normal reveal: chain from Pixi state (keeps sticky SW painted
		// after two-beat expand). HTML duelBoard snapshots can lag behind Pixi.
		settleDuelBoardFromPixi(side);

		const revealBoard = padDuelBoardForPixi(bookEvent.board, paddingBoard);
		const stickyFrozenReels = prepareDuelStickySwFrozenReels(side, sticky, revealBoard);
		await stack.enhancedBoard.spin({
			revealEvent: {
				type: 'reveal',
				index: bookEvent.index,
				board: revealBoard,
				paddingPositions: [10, 20, 5, 15, 8],
				gameType: 'basegame',
				anticipation: [0, 0, 0, 0, 0],
			},
			paddingBoard,
			frozenReelIndices: stickyFrozenReels,
		});
		await applyDuelStickySwPreExpanded(side, sticky, (ms) =>
			waitForGameSpeed(ms, stateGame.gameSpeed),
		);

		const board = bookEvent.board.map((reel) => reel.map((s) => ({ name: s.name })));
		if (side === 'cat') {
			stateDuel.catBoard = board;
			stateDuel.catSpinIndex = bookEvent.spinIndex;
		} else {
			stateDuel.dogBoard = board;
			stateDuel.dogSpinIndex = bookEvent.spinIndex;
		}
		stateDuel.spinning = false;

		if (twoBeat && bookEvent.phase1Wins && (bookEvent.phase1TotalWin ?? 0) > 0) {
			// Phase-1 through lying SW: plain wild amount — no upcoming product.
			await playDuelWinLines(side, bookEvent.phase1Wins, bookEvent.phase1TotalWin ?? 0);
			await waitForGameSpeed(DUEL_POST_SPIN_MS, stateGame.gameSpeed);
			return;
		}

		if (bookEvent.spinWin > 0) {
			if (side === 'cat') stateDuel.catSpinWin = bookEvent.spinWin;
			else stateDuel.dogSpinWin = bookEvent.spinWin;
		}

		const wins = bookEvent.wins ?? [];
		const totalWin = bookEvent.totalWin ?? bookEvent.spinWin;
		if (wins.length > 0 && totalWin > 0) {
			await playDuelWinLines(side, wins, totalWin);
		}

		await waitForGameSpeed(DUEL_POST_SPIN_MS, stateGame.gameSpeed);
	},

	duelSpinWin: async (bookEvent: BookEventOfType<'duelSpinWin'>) => {
		const side = bookEvent.side;
		const expandPending = stateDuel.superWildCurtain != null;
		if (!expandPending) {
			await waitForGameSpeed(SW_SECOND_WIN_PRE_DELAY_MS, stateGame.gameSpeed);
		}

		if (bookEvent.spinWin > 0) {
			if (side === 'cat') stateDuel.catSpinWin = bookEvent.spinWin;
			else stateDuel.dogSpinWin = bookEvent.spinWin;
		}

		const wins = bookEvent.wins ?? [];
		const totalWin = bookEvent.totalWin ?? bookEvent.spinWin;
		if (wins.length > 0 && totalWin > 0) {
			eventEmitter.broadcast({ type: 'paylineClearAll', side });
			await playDuelWinLines(side, wins, totalWin);
		} else if (bookEvent.spinWin > 0) {
			await waitForGameSpeed(DUEL_POST_SPIN_MS, stateGame.gameSpeed);
			return;
		}

		await waitForGameSpeed(DUEL_POST_SPIN_MS, stateGame.gameSpeed);
	},

	duelBankUpdate: async (bookEvent: BookEventOfType<'duelBankUpdate'>) => {
		// Book amounts are cents (×100); under-board WIN uses spinWin like base LabelWin.
		if (bookEvent.side === 'cat') stateDuel.catSpinWin = bookEvent.spinWin;
		else stateDuel.dogSpinWin = bookEvent.spinWin;

		// Brief hold so WIN under the desk is readable, then bank totals update.
		if (bookEvent.spinWin > 0) {
			await waitForGameSpeed(DUEL_BANK_FLOW_MS, stateGame.gameSpeed);
		}

		stateDuel.dogTotal = bookEvent.dogTotal;
		stateDuel.catTotal = bookEvent.catTotal;
		await waitForGameSpeed(DUEL_BETWEEN_SPINS_MS, stateGame.gameSpeed);
	},

	duelEnd: async (bookEvent: BookEventOfType<'duelEnd'>) => {
		stateDuel.phase = 'outro';
		stateDuel.activeSide = null;
		stateDuel.dogTotal = bookEvent.dogTotal;
		stateDuel.catTotal = bookEvent.catTotal;
		stateDuel.winner = bookEvent.winner;

		const playerSide =
			bookEvent.playerSide ?? stateDuel.playerSide ?? 'cat';
		const resolved = resolveDuelPlayerPayout({
			playerSide,
			boardWinner: bookEvent.winner,
			dogTotal: bookEvent.dogTotal,
			catTotal: bookEvent.catTotal,
		});
		const playerWon = bookEvent.playerWon ?? resolved.playerWon;
		// Prefer math payout when the book already encodes playerSide.
		const payout =
			bookEvent.playerSide != null ? bookEvent.payout : resolved.payout;
		stateDuel.playerSide = playerSide;
		stateDuel.payout = payout;
		stateDuel.winLevel = playerWon ? (bookEvent.winLevel ?? 1) : 1;

		// Same units as setTotalWin / LabelWin (book cents).
		stateBet.winBookEventAmount = payout;

		eventEmitter.broadcast({ type: 'duelOutroShow' });
		await eventEmitter.broadcastAsync({
			type: 'duelOutroUpdate',
			dogTotal: bookEvent.dogTotal,
			catTotal: bookEvent.catTotal,
			winner: bookEvent.winner,
			playerSide,
			playerWon,
			payout,
		});

		let bigWinShown = false;
		// Big Win only when the player's chosen side won.
		if (playerWon && payout > 0) {
			const winLevelData = winLevelMap[(stateDuel.winLevel ?? 1) as WinLevel];
			if (winLevelData?.type === 'big') {
				const BIG_WIN_LEVEL = 6 as const;
				const firstTierData =
					winLevelData.level > BIG_WIN_LEVEL
						? winLevelMap[BIG_WIN_LEVEL]
						: winLevelData;
				eventEmitter.broadcast({ type: 'duelOutroHide' });
				eventEmitter.broadcast({ type: 'winShow' });
				winLevelSoundsPlay({ winLevelData: firstTierData });
				await eventEmitter.broadcastAsync({
					type: 'winUpdate',
					amount: payout,
					winLevelData,
				});
				winLevelSoundsStop({ music: 'bgm_freespin' });
				bigWinShown = true;
			}
		}

		// Cloud first — result modals stay up until the cover closes over them.
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
		const transitionPromise = eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await waitForTimeout(TRANSITION_THEME_SWITCH_DELAY_MS);
		eventEmitter.broadcast({ type: 'duelOutroHide' });
		if (bigWinShown) {
			// Same order as setWin: hide overlay first so Win.svelte won't re-force
			// clap/react, then restore looping idle (clap uses holdEnd without returnTo).
			eventEmitter.broadcast({ type: 'winHide' });
			stateGame.mascotPose = 'idle';
		}
		resetDuelState();
		stateBet.activeBetModeKey = 'BASE';
		await transitionPromise;
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
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
