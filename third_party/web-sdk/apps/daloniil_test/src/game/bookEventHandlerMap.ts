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
} from './mysteryReel';
import {
	WIN_INFO_PRE_DELAY_MS,
	BONUS_WIN_PRE_DELAY_MS,
	BONUS_WIN_POST_DELAY_MS,
	MYSTERY_REVEAL_PRE_DELAY_MS,
	WIN_SPOTLIGHT_CLEAR_DELAY_MS,
} from './constants';
import { scaleMsByGameSpeed, waitForGameSpeed } from './gameSpeed';

// Таймер фонового снятия затемнения/paylines. Хранится здесь, чтобы
// `reveal` мог отменить его при старте нового спина раньше истечения задержки.
let spotlightClearTimer: ReturnType<typeof setTimeout> | null = null;
import { toRevealedRawSymbol } from './utils';

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

/** Stops looping count-up audio (coin SFX + win-level BGM) without switching main music. */
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

/**
 * In basegame only: returns the index of the reel that lands the 2nd cat (B),
 * or -1 if fewer than 2 cats are on the board or no reels remain after it.
 * When this reel's onReelStopping fires, the remaining reels switch to slow speed.
 */
const computeCatSlowTriggerReel = (revealEvent: BookEventOfType<'reveal'>): number => {
	if (revealEvent.gameType !== 'basegame') return -1;

	const reelCount = revealEvent.board.length;
	let catsFound = 0;

	for (let i = 0; i < reelCount; i++) {
		catsFound += revealEvent.board[i].filter((s) => s.name === 'B').length;
		if (catsFound >= 2 && i + 1 < reelCount) return i;
	}

	return -1;
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
		stateGame.catSlowTriggerReel = computeCatSlowTriggerReel(bookEvent);
		stateGame.catSlowReels = [];
		await stateGameDerived.enhancedBoard.spin({
			revealEvent: bookEvent,
			paddingBoard: config.paddingReels[bookEvent.gameType],
			frozenReelIndices: [...stateGame.mysteryReelsFrozen, ...pendingCollapseReels],
		});
		stateGame.catSlowTriggerReel = -1;
		stateGame.catSlowReels = [];
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>, { bookEvents }: BookEventContext) => {
		// Breathing room after the reels land before the win celebration kicks
		// in (also lets the symbol bounce animation finish landing).
		await waitForGameSpeed(WIN_INFO_PRE_DELAY_MS, stateGame.gameSpeed);

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

			if (isSmallWinFlow) {
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

		// Запускаем фоновый таймер (не блокирует pipeline — игрок может делать
		// ставку сразу). По истечении WIN_SPOTLIGHT_CLEAR_DELAY_MS снимаем
		// затемнение и paylines. Если до этого стартует новый спин, `reveal`
		// отменит таймер через clearTimeout выше.
		if (spotlightClearTimer !== null) clearTimeout(spotlightClearTimer);
		spotlightClearTimer = setTimeout(() => {
			spotlightClearTimer = null;
			stateGame.winSpotlightActive = false;
			eventEmitter.broadcast({ type: 'paylineClearAll' });
		}, scaleMsByGameSpeed(WIN_SPOTLIGHT_CLEAR_DELAY_MS, stateGame.gameSpeed));
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>, { bookEvents }: BookEventContext) => {
		// Сброс Cash Stacks FS-state при входе в FS.
		stateGame.bonusCollected = 0;
		stateGame.ladderTier = 0;
		stateGame.mysteryReels = [];
		stateGame.ladderVisible = false;
		resetMysteryReelSession();
		// Math emits `bonusCollect` immediately before `freeSpinTrigger` when
		// 3+ B land on the trigger board. Skip the duplicate paw-wave on old
		// books that only carry positions on this event.
		const eventIdx = bookEvents.indexOf(bookEvent);
		const prevEvent = eventIdx > 0 ? bookEvents[eventIdx - 1] : undefined;
		if (prevEvent?.type !== 'bonusCollect') {
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
		stateGame.ladderVisible = true;
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
		stateGame.ladderVisible = false;
		resetMysteryReelSession();

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
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
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		// Stake UX: small/medium wins are non-blocking — board amount + HUD WIN
		// are raised during winInfo; skip duplicate increment here.
		if (winLevelData.type !== 'big') {
			return;
		}

		// Big-win HUD: поднимаем кумулятив ДО await'а celebration overlay.
		// math-инвариант: (prev + setWin.amount) ≡ setTotalWin.amount.
		stateBet.winBookEventAmount = stateBet.winBookEventAmount + bookEvent.amount;

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
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		// Do nothing
	},
	// === Cash Stacks custom events ===
	bonusCollect: async (bookEvent: BookEventOfType<'bonusCollect'>) => {
		stateGame.bonusCollected = bookEvent.collectedTotal;
		await animateBonusSymbols({ positions: bookEvent.positions });
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
};
