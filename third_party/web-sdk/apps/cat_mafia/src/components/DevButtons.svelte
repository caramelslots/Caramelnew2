<!--
	DevButtons.svelte — Meowfia dev panel.

	Feature buttons play real math books (synced from 0_0_cat_mafia) via
	playBet — same path as Storybook / production book playback.

	Toggle: Shift+D. Language, social mode, and the GPU RAM overlay live
	inside Session. Categories collapse; state is remembered.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import {
		stateBet,
		stateBetDerived,
		stateI18n,
		stateModal,
		stateUi,
		stateUrlDerived,
	} from 'state-shared';

	/** Set to true to show DEV / LANG / SOCIAL toggles locally. */
	const SHOW_DEV_PANEL = true;

	import { playBet, playBookEvent, playBookEvents } from '../game/utils';
	import { eventEmitter } from '../game/eventEmitter';
	import { devPreview } from '../game/devPreview.svelte';
	import { stateGame, stateGameDerived } from '../game/stateGame.svelte';
	import { stateLayout } from '../game/stateLayout';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		MASCOT_DEV_PREVIEW_ITEMS,
		MASCOT_DOG_DEV_PREVIEW_ITEMS,
		MASCOT_GUN_END_LOAD_MS,
		MASCOT_GUN_SHOT_AIM_MS,
		MASCOT_GUN_SHOT_END_MS,
		MASCOT_GUN_SHOT_MS,
		MASCOT_GUN_START_MS,
		MASCOT_GUN_STAT_IDLE_MS,
		MASCOT_LOAD_MS,
	} from '../game/mascotHtmlSpine';
	import { SYMBOL_DEV_PREVIEW_GROUPS } from '../game/symbolDevPreview';
	import {
		BOARD_DIMENSIONS,
		BULLET_DISAPPEAR_EARLY_MS,
		BULLET_FLY_CATCH_MS,
		BULLET_FLY_LEAD_MS,
	} from '../game/constants';
	import {
		getDrumLastFilledChamberIndex,
		withDrumBulletOrient,
	} from '../game/revolverDrumLayout';
	import { fillDrumForPreview, isDrumFullySpent, alignDrumForNextShot, playDrumChamberShot, advanceDrumAfterShot, syncDrumLoadRotation } from '../game/drumShoot';
	import {
		getRawUrlLang,
		INVALID_LANG_LABELS,
		INVALID_TEST_LOCALES,
		isInvalidTestLang,
		LANG_LABELS,
		setGameLanguage,
		STAKE_LOCALES,
	} from '../game/devLang';
	import { setGameSocialMode } from '../game/devSocial';
	import { pixiMemoryHud, setRamOverlayVisible } from '../game/pixiTextureMemoryHud.svelte';
	import DevAccordion from './DevAccordion.svelte';
	import baseEvents from '../stories/data/base_events';
	import baseBooks from '../stories/data/base_books';
	import bonusBooks from '../stories/data/bonus_books';
	import bonusBoostBooks from '../stories/data/books_bonus_boost';
	import bonusSuperBooks from '../stories/data/books_bonus_super';
	import bonusDuelBooks from '../stories/data/books_bonus_duel';
	import {
		SW_DEMO_VISIBLE_BOARD,
		superWildExpandDemo,
		freeSpinTargetPickDemo,
		targetShootRoundDemo,
	} from '../stories/data/catmafia_events';
	import type { WinLevel } from '../game/winLevelMap';
	import type { BookEvent } from '../game/typesBookEvent';
	import type { GameType, RawSymbol, SymbolName } from '../game/types';
	import { evalDevMathBoard } from '../game/evalDevMathBoard';
	import config from '../game/config';
	import {
		getDuelInitialVisibleBoard,
		resetDuelState,
		stateDuel,
	} from '../game/stateDuel.svelte';
	import {
		getDuelBoardStack,
		getDuelPaddingBoard,
		padDuelBoardForPixi,
	} from '../game/stateDuelBoards.svelte';

	let open = $state(false);
	let busy = $state(false);
	let menuQuery = $state('');
	let langDrawer = $state(false);
	const ACCORDION_KEY = 'catmafia.dev.accordions';
	const DEFAULT_OPEN_ACCORDIONS = ['books'] as const;

	type AccordionId =
		| 'books'
		| 'paws'
		| 'superwild'
		| 'board'
		| 'characters'
		| 'stage'
		| 'wins'
		| 'ui';

	const ACCORDION_META: { id: AccordionId; title: string; keys: string }[] = [
		{ id: 'books', title: 'Math books', keys: 'book spin bonus duel boost bullet shoot fs tour' },
		{ id: 'paws', title: 'Paw coins', keys: 'paw pb ps pg coin hat' },
		{ id: 'superwild', title: 'Super Wild', keys: 'sw curtain sticky wild column drum' },
		{ id: 'board', title: 'Board', keys: 'reel speed bonus outline' },
		{ id: 'characters', title: 'Characters', keys: 'cat dog mascot symbol anim clip' },
		{ id: 'stage', title: 'Stage', keys: 'frame chrome duel target shoot cabinet bullet fly drum' },
		{ id: 'wins', title: 'Wins', keys: 'win level precision hud stack payline coin' },
		{ id: 'ui', title: 'UI & loading', keys: 'loading cards progress fs intro outro modal funds' },
	];

	const readOpenAccordions = (): Set<AccordionId> => {
		try {
			const raw = globalThis.localStorage?.getItem(ACCORDION_KEY);
			if (!raw) return new Set(DEFAULT_OPEN_ACCORDIONS);
			const parsed = JSON.parse(raw) as unknown;
			if (!Array.isArray(parsed)) return new Set(DEFAULT_OPEN_ACCORDIONS);
			const allowed = new Set(ACCORDION_META.map((m) => m.id));
			const next = parsed.filter((id): id is AccordionId => allowed.has(id as AccordionId));
			return new Set(next);
		} catch {
			return new Set(DEFAULT_OPEN_ACCORDIONS);
		}
	};

	let openAccordions = $state<Set<AccordionId>>(readOpenAccordions());

	const persistAccordions = (next: Set<AccordionId>) => {
		try {
			globalThis.localStorage?.setItem(ACCORDION_KEY, JSON.stringify([...next]));
		} catch {
			/* ignore */
		}
	};

	const isAccOpen = (id: AccordionId) => openAccordions.has(id);

	const toggleAccordion = (id: AccordionId) => {
		const next = new Set(openAccordions);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		openAccordions = next;
		persistAccordions(next);
	};

	const setAllAccordions = (expanded: boolean) => {
		openAccordions = expanded
			? new Set(ACCORDION_META.map((m) => m.id))
			: new Set();
		persistAccordions(openAccordions);
	};

	const menuQueryNorm = $derived(menuQuery.trim().toLowerCase());
	const accordionVisible = $derived(
		ACCORDION_META.filter(
			(m) =>
				!menuQueryNorm ||
				m.title.toLowerCase().includes(menuQueryNorm) ||
				m.keys.includes(menuQueryNorm) ||
				m.id.includes(menuQueryNorm),
		),
	);
	const showAccordion = (id: AccordionId) =>
		accordionVisible.some((m) => m.id === id);
	const accordionForcedOpen = $derived(menuQueryNorm.length > 0);

	const currentLangLabel = $derived(
		isInvalidTestLang(getRawUrlLang())
			? `${getRawUrlLang().toUpperCase()}→EN`
			: stateI18n.i18n.locale.toUpperCase(),
	);
	const socialOn = $derived(stateUrlDerived.social());
	const rawUrlLang = $derived(getRawUrlLang());
	let fsCounterPreview = $state(false);
	/** Selected symbol in Symbol Anims section (clips shown below). */
	let symbolAnimGroupId = $state<string | null>('L1');

	const selectedSymbolGroup = $derived(
		SYMBOL_DEV_PREVIEW_GROUPS.find((g) => g.id === symbolAnimGroupId) ?? null,
	);

	/** Fill the visible board with `symbolName` so clip preview plays in-place. */
	const paintBoardWithSymbol = (symbolName: SymbolName) => {
		const visible = Array.from({ length: BOARD_DIMENSIONS.x }, () =>
			Array.from({ length: BOARD_DIMENSIONS.y }, () => ({ name: symbolName })),
		);
		stateGameDerived.enhancedBoard.settle(padBoard(visible, 'basegame'));
		for (const reel of stateGame.board) {
			for (const sym of reel.reelState.symbols) {
				sym.symbolState = 'static';
			}
		}
	};

	const playSymbolClip = (groupId: string, clipId: string) => {
		const current = devPreview.symbolAnim;
		const same = current?.groupId === groupId && current?.clipId === clipId;
		devPreview.symbolAnim = {
			groupId,
			clipId,
			nonce: same ? current.nonce + 1 : 0,
		};
		paintBoardWithSymbol(groupId as SymbolName);
	};

	/** Pick symbol group and auto-play its first clip on the board. */
	const selectSymbolGroup = (groupId: string) => {
		symbolAnimGroupId = groupId;
		const group = SYMBOL_DEV_PREVIEW_GROUPS.find((g) => g.id === groupId);
		const firstClip = group?.clips[0];
		if (firstClip) playSymbolClip(groupId, firstClip.id);
	};

	const closeSymbolAnimPreview = () => {
		devPreview.symbolAnim = null;
	};

	/** Desktop fly: N cartridges → cat hand → gun_start (same as bulletCollect). */
	const DRUM_MAX_PREVIEW = 6;
	let bulletFlyBusy = $state(false);

	const previewBoardFramePulse = () => {
		eventEmitter.broadcast({ type: 'boardFramePulse' });
	};

	const previewBulletFly = async (count = 1) => {
		if (bulletFlyBusy) return;
		bulletFlyBusy = true;
		devPreview.forceShowDrum = true;
		devPreview.symbolAnim = null;

		const n = Math.max(1, Math.min(3, count));
		const launchRow = 2; // 1-based visible row
		// Center the launch reels around mid board (0..4).
		const mid = 2;
		const launchReels = Array.from({ length: n }, (_, i) => mid - Math.floor((n - 1) / 2) + i);

		const visible = Array.from({ length: BOARD_DIMENSIONS.x }, (_, reel) =>
			Array.from({ length: BOARD_DIMENSIONS.y }, (_, row) =>
				launchReels.includes(reel) && row === launchRow - 1
					? ({ name: 'BT' } as RawSymbol)
					: ({ name: 'L2' } as RawSymbol),
			),
		);
		stateGameDerived.enhancedBoard.settle(padBoard(visible, 'basegame'));
		for (const reel of stateGame.board) {
			for (const sym of reel.reelState.symbols) {
				sym.symbolState = 'static';
			}
		}

		const baseKey = Date.now();
		const startChamber = stateGame.drumCount % DRUM_MAX_PREVIEW;
		stateGame.bulletFly = launchReels.map((reel, i) => ({
			reel,
			row: launchRow,
			chamber: (startChamber + i) % DRUM_MAX_PREVIEW,
			key: baseKey + i,
		}));
		await new Promise((r) => setTimeout(r, BULLET_FLY_LEAD_MS));

		stateGame.mascotPose = 'gunStart';
		const gunStarted = performance.now();
		await new Promise((r) =>
			setTimeout(r, Math.max(0, BULLET_FLY_CATCH_MS - BULLET_DISAPPEAR_EARLY_MS)),
		);

		stateGame.bulletFly = null;
		const gunElapsed = performance.now() - gunStarted;
		if (gunElapsed < MASCOT_GUN_START_MS) {
			await new Promise((r) => setTimeout(r, MASCOT_GUN_START_MS - gunElapsed));
		}

		// Seat drum UI when each clip finishes (`gun_start` = 1st, `load` = extras).
		const seatNextChamber = () => {
			stateGame.drumCount = Math.min(DRUM_MAX_PREVIEW, stateGame.drumCount + 1);
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

		for (let i = 1; i < n; i++) {
			stateGame.mascotPose = 'load';
			stateGame.mascotAnimToken += 1;
			await new Promise((r) => setTimeout(r, MASCOT_LOAD_MS));
			seatNextChamber();
		}
		stateGame.mascotPose = 'gunEndLoad';
		await new Promise((r) => setTimeout(r, MASCOT_GUN_END_LOAD_MS));
		stateGame.mascotPose = 'idle';
		await new Promise((r) => setTimeout(r, 400));
		bulletFlyBusy = false;
	};

	const resetBulletFlyPreview = () => {
		stateGame.bulletFly = null;
		stateGame.drumCount = 0;
		stateGame.drumRotationDeg = 0;
		stateGame.drumBulletOrientDeg = {};
		stateGame.drumSeatAnimKey = {};
		stateGame.drumSpentChambers = {};
		stateGame.drumShakeKey = 0;
		stateGame.drumFiringChamber = null;
		stateGame.drumShootActive = false;
		stateGame.mascotPose = 'idle';
		devPreview.forceShowDrum = false;
		bulletFlyBusy = false;
	};

	/** Remember basegame/freegame when toggling FS board chrome preview. */
	let fsChromePrevGameType: GameType | null = null;

	const toggleFsBoardChromePreview = () => {
		const next = !devPreview.forceShowFsBoardChrome;
		devPreview.forceShowFsBoardChrome = next;
		devPreview.symbolAnim = null;

		if (next) {
			if (devPreview.forceShowDuelLayout) toggleDuelLayoutPreview(false);
			fsChromePrevGameType = stateGame.gameType;
			stateGame.gameType = 'freegame';
			devPreview.forceShowDrum = true;
			eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
			eventEmitter.broadcast({
				type: 'freeSpinCounterUpdate',
				current: 3,
				total: 10,
			});
			stateGame.drumSpentChambers = {};
			stateGame.drumCount = 0;
			stateGame.drumBulletOrientDeg = {};
			stateGame.drumSeatAnimKey = {};
			fillDrumForPreview(3);
		} else {
			eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
			if (fsChromePrevGameType) {
				stateGame.gameType = fsChromePrevGameType;
				fsChromePrevGameType = null;
			}
			resetBulletFlyPreview();
		}
	};

	/** Dual-desk + bank scale layout without starting a Duel book. */
	const toggleDuelLayoutPreview = (force?: boolean) => {
		const next = force ?? !devPreview.forceShowDuelLayout;
		devPreview.forceShowDuelLayout = next;
		devPreview.symbolAnim = null;

		if (next) {
			if (devPreview.forceShowFsBoardChrome) toggleFsBoardChromePreview();
			if (devPreview.forceShowTargetBoard) toggleTargetBoardPreview(false);
			if (devPreview.forceShowTargetShoot) toggleTargetShootPreview(false);
			resetDuelState();
			stateDuel.active = true;
			stateDuel.phase = 'playing';
			stateDuel.playerSide = 'cat';
			stateDuel.totalSpinsPerSide = 10;
			stateDuel.dogSpinIndex = 4;
			stateDuel.catSpinIndex = 3;
			// Sample banks so the paw sits off-centre (dog slightly ahead).
			stateDuel.dogTotal = 180;
			stateDuel.catTotal = 120;
			stateDuel.activeSide = 'dog';
			stateGame.duelIntroActive = false;

			const pad = getDuelPaddingBoard(config.paddingReels.basegame);
			stateDuel.dogBoard = getDuelInitialVisibleBoard();
			stateDuel.catBoard = getDuelInitialVisibleBoard();
			for (const side of ['dog', 'cat'] as const) {
				const visible = side === 'dog' ? stateDuel.dogBoard : stateDuel.catBoard;
				getDuelBoardStack(side).enhancedBoard.settle(padDuelBoardForPixi(visible, pad));
				eventEmitter.broadcast({ type: 'paylineClearAll', side });
			}
		} else {
			resetDuelState();
		}
	};

	/** Designer target board (6 flip targets) — layout / click QA. */
	const toggleTargetBoardPreview = (force?: boolean) => {
		const next = force ?? !devPreview.forceShowTargetBoard;
		devPreview.forceShowTargetBoard = next;
		devPreview.symbolAnim = null;
		if (next) {
			if (devPreview.forceShowDuelLayout) toggleDuelLayoutPreview(false);
			if (devPreview.forceShowTargetShoot) toggleTargetShootPreview(false);
		}
	};

	/** Stage E 9-target cabinet in the gold frame — art / seat layout QA. */
	const toggleTargetShootPreview = (force?: boolean) => {
		const next = force ?? !devPreview.forceShowTargetShoot;
		devPreview.forceShowTargetShoot = next;
		devPreview.symbolAnim = null;
		if (next) {
			if (devPreview.forceShowDuelLayout) toggleDuelLayoutPreview(false);
			if (devPreview.forceShowTargetBoard) toggleTargetBoardPreview(false);
		}
	};

	/**
	 * Production freeSpinTargetPick path: board stays until steam covers
	 * (solo preview dismisses immediately after pick).
	 */
	const playTargetPickPreview = () =>
		guard(async () => {
			if (devPreview.forceShowTargetBoard) toggleTargetBoardPreview(false);
			if (devPreview.forceShowTargetShoot) toggleTargetShootPreview(false);
			await playBookEvent(asEvent(freeSpinTargetPickDemo), { bookEvents: [] });
			eventEmitter.broadcast({ type: 'targetPickDismiss' });
		});

	/** Production Stage E path: 9-target board + drum shots. */
	const playTargetShootPreview = () =>
		guard(async () => {
			if (devPreview.forceShowTargetBoard) toggleTargetBoardPreview(false);
			if (devPreview.forceShowTargetShoot) toggleTargetShootPreview(false);
			stateGame.gameType = 'freegame';
			stateGame.drumSpentChambers = {};
			stateGame.drumCount = 0;
			fillDrumForPreview(3);
			await playBookEvent(asEvent(targetShootRoundDemo), { bookEvents: [] });
		});

	const previewDrumShoot = async () => {
		if (bulletFlyBusy) return;
		bulletFlyBusy = true;
		devPreview.forceShowDrum = true;
		devPreview.symbolAnim = null;
		stateGame.drumShootActive = true;

		if (stateGame.drumCount <= 0 || isDrumFullySpent()) {
			stateGame.drumSpentChambers = {};
			if (stateGame.drumCount <= 0) fillDrumForPreview(DRUM_MAX_PREVIEW);
			else syncDrumLoadRotation();
		} else {
			syncDrumLoadRotation();
		}

		stateGame.mascotPose = 'gunStatIdle';
		await new Promise((r) => setTimeout(r, MASCOT_GUN_STAT_IDLE_MS));
		stateGame.mascotPose = 'aim';
		await new Promise((r) => setTimeout(r, MASCOT_GUN_SHOT_AIM_MS));

		while (!isDrumFullySpent()) {
			const chamber = await alignDrumForNextShot((ms) => new Promise((r) => setTimeout(r, ms)));
			if (chamber === null) break;

			stateGame.mascotPose = 'shoot';
			stateGame.mascotAnimToken += 1;
			await new Promise((r) => setTimeout(r, MASCOT_GUN_SHOT_MS));

			await playDrumChamberShot((ms) => new Promise((r) => setTimeout(r, ms)));
			await advanceDrumAfterShot((ms) => new Promise((r) => setTimeout(r, ms)));
		}

		stateGame.mascotPose = 'gunShotEnd';
		await new Promise((r) => setTimeout(r, MASCOT_GUN_SHOT_END_MS));
		stateGame.mascotPose = 'idle';
		stateGame.drumShootActive = false;
		bulletFlyBusy = false;
	};

	type BetModeKey = 'BASE' | 'bonus_boost' | 'bonus_normal' | 'bonus_super' | 'bonus_duel';

	type MathBook = {
		id: number;
		payoutMultiplier?: number;
		events: BookEvent[];
		[key: string]: unknown;
	};

	const asEvent = (raw: unknown) => raw as BookEvent;

	const padBoard = (visibleBoard: { name: string }[][], gameType: GameType): RawSymbol[][] => {
		const paddingReels = config.paddingReels[gameType];
		return visibleBoard.map((reel, reelIndex) => {
			const pad = paddingReels[reelIndex];
			return [pad[0], ...reel, pad[1]] as RawSymbol[];
		});
	};

	const reveal = (
		visibleBoard: { name: string }[][],
		gameType: GameType = 'basegame',
		paddingPositions: number[] = [10, 20, 5, 15, 8],
	) =>
		asEvent({
			type: 'reveal',
			board: padBoard(visibleBoard, gameType),
			paddingPositions,
			gameType,
			anticipation: [0, 0, 0, 0, 0],
		});

	const guard = async (fn: () => Promise<void>) => {
		if (busy) return;
		busy = true;
		try {
			await fn();
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error('[DEV] cheat failed:', error);
		} finally {
			busy = false;
		}
	};

	// === Math book helpers (real 0_0_cat_mafia books) ===

	const bookEvents = (book: MathBook) => book.events ?? [];

	const bookHas = (book: MathBook, type: string) =>
		bookEvents(book).some((e) => e?.type === type);

	const bookHasAll = (book: MathBook, types: string[]) => types.every((t) => bookHas(book, t));

	const modeForBook = (book: MathBook): BetModeKey => {
		// Prefer object identity — book ids collide across modes.
		if ((bonusSuperBooks as MathBook[]).includes(book)) return 'bonus_super';
		if ((bonusBooks as MathBook[]).includes(book)) return 'bonus_normal';
		if ((bonusBoostBooks as MathBook[]).includes(book)) return 'bonus_boost';
		if ((bonusDuelBooks as MathBook[]).includes(book)) return 'bonus_duel';
		return 'BASE';
	};

	const applyBetMode = (modeKey: BetModeKey) => {
		stateBet.activeBetModeKey = modeKey;
		stateGame.bonusMode =
			modeKey === 'bonus_super' ? 'super' : modeKey === 'bonus_normal' ? 'normal' : null;
		if (modeKey === 'bonus_boost') stateGame.activeFeature = 'bonus_boost';
		else if (modeKey === 'BASE' || modeKey === 'bonus_duel') stateGame.activeFeature = null;
	};

	const pickBook = (pool: MathBook[], predicate: (b: MathBook) => boolean, label: string) => {
		const matches = pool.filter(predicate);
		if (!matches.length) {
			// eslint-disable-next-line no-console
			console.warn(`[DEV] no books for "${label}" (pool=${pool.length})`);
			return null;
		}
		return matches[Math.floor(Math.random() * matches.length)];
	};

	const playMathBook = (book: MathBook | null, label: string, modeKey?: BetModeKey) =>
		guard(async () => {
			if (!book) return;
			devPreview.pawCoins = null;
			const mode = modeKey ?? modeForBook(book);
			applyBetMode(mode);
			// eslint-disable-next-line no-console
			console.log(
				`[DEV] ${label} id=${book.id} payoutMult=${book.payoutMultiplier} mode=${mode}`,
			);
			await playBet({ ...book, state: bookEvents(book) } as Parameters<typeof playBet>[0]);
		});

	const basePool = baseBooks as MathBook[];
	const boostPool = bonusBoostBooks as MathBook[];
	const normalPool = bonusBooks as MathBook[];
	const superPool = bonusSuperBooks as MathBook[];
	const duelPool = bonusDuelBooks as MathBook[];
	const allBooks = [...basePool, ...boostPool, ...normalPool, ...superPool, ...duelPool];

	const counts = {
		base: basePool.length,
		boost: boostPool.length,
		normal: normalPool.length,
		super: superPool.length,
		duel: duelPool.length,
		duelWin: duelPool.filter((b) => (b.payoutMultiplier ?? 0) > 0).length,
		duelLose: duelPool.filter((b) => (b.payoutMultiplier ?? 0) === 0).length,
		paw: basePool.filter((b) => bookHas(b, 'pawCoinResolve')).length,
		swBase: basePool.filter(
			(b) => bookHas(b, 'superWildExpand') && !bookHas(b, 'freeSpinTrigger'),
		).length,
		naturalFs: basePool.filter((b) => bookHas(b, 'freeSpinTargetPick')).length,
		bullet: allBooks.filter((b) => bookHas(b, 'bulletCollect')).length,
		shoot: allBooks.filter((b) => bookHas(b, 'targetShootRound')).length,
		fsSw: allBooks.filter((b) => bookHasAll(b, ['freeSpinTrigger', 'superWildExpand'])).length,
		tour: allBooks.filter((b) =>
			bookHasAll(b, ['freeSpinTargetPick', 'bulletCollect', 'targetShootRound']),
		).length,
	};

	/**
	 * Paw demos mirror real drops: random board, paw at a random cell, rows
	 * converted per paw kind (PB 1 / PS 2 / PG 3, clamped to the board). The
	 * paw cell itself pays nothing (coinTier 0); other cells take the tier of
	 * the symbol underneath (lows x1, H3/H4 x2, H1/H2 x3).
	 */
	const PAW_DEMO_POOL: SymbolName[] = ['L1', 'L2', 'L3', 'L4', 'H1', 'H2', 'H3', 'H4'];
	const PAW_DEMO_KIND = {
		PB: { kind: 'bronze' as const, rowCount: 1 },
		PS: { kind: 'silver' as const, rowCount: 2 },
		PG: { kind: 'gold' as const, rowCount: 3 },
	};

	const pawDemoCoinTier = (name: SymbolName): 1 | 2 | 3 => {
		if (name === 'H1' || name === 'H2') return 3;
		if (name === 'H3' || name === 'H4') return 2;
		return 1;
	};

	const pawDemoRows = (pawRow: number, rowCount: number): number[] => {
		const maxRow = BOARD_DIMENSIONS.y - 1;
		if (rowCount === 1) return [pawRow];
		if (rowCount === 2) {
			if (pawRow === 0) return [0, 1];
			if (pawRow === maxRow) return [maxRow - 1, maxRow];
			return Math.random() < 0.5 ? [pawRow - 1, pawRow] : [pawRow, pawRow + 1];
		}
		const start = Math.max(0, Math.min(pawRow - 1, BOARD_DIMENSIONS.y - 3));
		return [start, start + 1, start + 2];
	};

	const playSyntheticPawBook = (label: string, visibleBoard: { name: string }[][], resolve: unknown) =>
		guard(async () => {
			devPreview.pawCoins = null;
			applyBetMode('BASE');
			stateGame.gameType = 'basegame';
			stateGame.stickySwByReel = {};
			stateGame.stickySwOpened = false;
			stateGame.stickySwIntroPending = false;
			stateGame.swSpineHideReels = {};
			stateGame.bonusMode = null;
			const resolveEvent = asEvent(resolve);
			const total =
				resolveEvent.type === 'pawCoinResolve' ? resolveEvent.totalCoinWin : 0;
			const events = [
				reveal(visibleBoard),
				resolveEvent,
				asEvent({ type: 'setTotalWin', amount: total }),
				asEvent({ type: 'finalWin', amount: total }),
			];
			// eslint-disable-next-line no-console
			console.log(`[DEV] ${label} totalCoinWin=${total}`);
			await playBet({
				id: -1,
				payoutMultiplier: total,
				events,
				state: events,
			} as Parameters<typeof playBet>[0]);
		});

	const playPawKindDrop = (paw: keyof typeof PAW_DEMO_KIND) => {
		const unit = 100;
		const spec = PAW_DEMO_KIND[paw];
		const pawReel = Math.floor(Math.random() * BOARD_DIMENSIONS.x);
		const pawRow = Math.floor(Math.random() * BOARD_DIMENSIONS.y);
		const rows = pawDemoRows(pawRow, spec.rowCount);

		const randomCell = () => ({
			name: PAW_DEMO_POOL[Math.floor(Math.random() * PAW_DEMO_POOL.length)],
		});
		const board = Array.from({ length: BOARD_DIMENSIONS.x }, (_, reel) =>
			Array.from({ length: BOARD_DIMENSIONS.y }, (_, row) =>
				reel === pawReel && row === pawRow ? { name: paw as SymbolName } : randomCell(),
			),
		);

		// pawCoinResolve events carry PADDED rows (visible + 1), like the math
		// emitter with include_padding — the overlay subtracts the pad back.
		const ROW_PAD = 1;
		const eventRows = rows.map((visibleRow) => ({
			row: visibleRow + ROW_PAD,
			cells: Array.from({ length: BOARD_DIMENSIONS.x }, (_, reel) => {
				const isPaw = reel === pawReel && visibleRow === pawRow;
				const from = board[reel][visibleRow].name;
				const coinTier = (isPaw ? 0 : pawDemoCoinTier(from)) as 0 | 1 | 2 | 3;
				return { reel, from, coinTier, win: isPaw ? 0 : coinTier * unit };
			}),
		}));
		const total = eventRows.reduce(
			(sum, r) => sum + r.cells.reduce((s, cell) => s + cell.win, 0),
			0,
		);
		return playSyntheticPawBook(`Paw ${paw}`, board, {
			type: 'pawCoinResolve',
			paws: [{ reel: pawReel, row: pawRow + ROW_PAD, kind: spec.kind }],
			rows: eventRows,
			totalCoinWin: total,
		});
	};

	/**
	 * SW demos: lying Super Wilds on chosen column(s) → phase-1 line → curtain.
	 * `cols1` = 1-based column numbers (any subset of 1..BOARD_DIMENSIONS.x).
	 *
	 * Additive payout (matches math):
	 *   reveal (lying SW cloaked ×1) → winInfo(p1) → setWin(p1) → setTotalWin(p1)
	 *   → superWildExpand → winInfo(p2) → setWin(p2) → setTotalWin(p1+p2) → finalWin
	 * HUD ends on cumulative; phase-2 payline label stays phase2-only.
	 * Works in BASE / bonus_normal / bonus_super (same under-board WIN count-up).
	 */
	const SW_DEMO_POOL: SymbolName[] = ['L1', 'L2', 'L3', 'L4', 'H1', 'H2', 'H3', 'H4'];
	const SW_DEMO_MULTS = [2, 4, 6, 8, 25, 50, 75] as const;
	const SW_DEMO_WHEEL_COL = 3;
	const SW_DEMO_SINGLE_COLS = Array.from({ length: BOARD_DIMENSIONS.x }, (_, i) => i + 1);
	const SW_DEMO_PRESETS: { label: string; cols: number[] }[] = [
		{ label: '2 3', cols: [2, 3] },
		{ label: '1 2 3', cols: [1, 2, 3] },
		{ label: '3 4 5', cols: [3, 4, 5] },
		{
			label: `All 1–${BOARD_DIMENSIONS.x}`,
			cols: Array.from({ length: BOARD_DIMENSIONS.x }, (_, i) => i + 1),
		},
	];
	/** Lying SW rows per column (never full height so curtain always runs). */
	const SW_DEMO_LIE_COUNT = 1;

	const swDemoRows = (): number[] => {
		const count = SW_DEMO_LIE_COUNT;
		const start = Math.max(
			0,
			Math.min(Math.floor((BOARD_DIMENSIONS.y - count) / 2), BOARD_DIMENSIONS.y - count),
		);
		return Array.from({ length: count }, (_, i) => start + i);
	};

	const playSwDrop = (
		cols1: number[],
		forcedMult?: (typeof SW_DEMO_MULTS)[number],
		mode: BetModeKey = 'BASE',
	) =>
		guard(async () => {
			applyBetMode(mode);
			const isFs = mode === 'bonus_normal' || mode === 'bonus_super';
			stateGame.gameType = isFs ? 'freegame' : 'basegame';
			stateGame.stickySwByReel = {};
			stateGame.stickySwOpened = mode === 'bonus_super';
			stateGame.stickySwIntroPending = false;
			stateGame.swSpineHideReels = {};
			if (!isFs) stateGame.bonusMode = null;
			// Keep cumulative FS HUD when demoing mid-bonus; reset only on base.
			if (!isFs) stateBet.winBookEventAmount = 0;

			const unit = 100;
			const mult =
				forcedMult ?? SW_DEMO_MULTS[Math.floor(Math.random() * SW_DEMO_MULTS.length)];
			const swReels = [
				...new Set(
					cols1
						.map((c) => c - 1)
						.filter((r) => r >= 0 && r < BOARD_DIMENSIONS.x),
				),
			].sort((a, b) => a - b);
			if (!swReels.length) return;

			const rows = swDemoRows();
			const lineRow = rows[Math.floor(rows.length / 2)];
			const ROW_PAD = 1;

			const randomCell = () => ({
				name: SW_DEMO_POOL[Math.floor(Math.random() * SW_DEMO_POOL.length)],
			});
			const board = Array.from({ length: BOARD_DIMENSIONS.x }, (_, reel) =>
				Array.from({ length: BOARD_DIMENSIONS.y }, (_, row) => {
					if (swReels.includes(reel) && rows.includes(row)) {
						// Lying SW is a plain wild until the curtain (math cloaks ×N).
						return { name: 'SW' as const, wild: true as const, multiplier: 1 };
					}
					// Fill the payline with H2 so phase-1 lights the lying SW.
					if (row === lineRow) return { name: 'H2' as const };
					return randomCell();
				}),
			);

			const phase1Amount = 5 * unit;
			const phase2Amount = phase1Amount * mult;
			const spinPayout = phase1Amount + phase2Amount;
			const hudBefore = stateBet.winBookEventAmount;
			const phase1Hud = hudBefore + phase1Amount;
			const spinHud = hudBefore + spinPayout;
			const linePositions = Array.from({ length: BOARD_DIMENSIONS.x }, (_, reel) => ({
				reel,
				row: lineRow + ROW_PAD,
			}));

			const phase1Win = {
				type: 'winInfo' as const,
				totalWin: phase1Amount,
				wins: [
					{
						symbol: 'H2',
						kind: 5,
						win: phase1Amount,
						positions: linePositions,
						meta: {
							lineIndex: 1,
							multiplier: 1,
							winWithoutMult: phase1Amount,
							globalMult: 1,
							lineMultiplier: 1.0,
						},
					},
				],
			};

			const phase2Win = {
				type: 'winInfo' as const,
				totalWin: phase2Amount,
				wins: [
					{
						symbol: 'H2',
						kind: 5,
						win: phase2Amount,
						positions: linePositions,
						meta: {
							lineIndex: 1,
							multiplier: mult,
							winWithoutMult: phase1Amount,
							globalMult: 1,
							lineMultiplier: mult,
						},
					},
				],
			};

			const expand = {
				type: 'superWildExpand' as const,
				// Hinge on the topmost lying SW so the curtain rises from that cell.
				expands: swReels.map((reel) => ({
					reel,
					row: Math.min(...rows) + ROW_PAD,
					mult,
				})),
				productMult: mult,
			};

			const colLabel = swReels.map((r) => r + 1).join('+');
			const modeLabel =
				mode === 'bonus_super' ? 'Super FS' : mode === 'bonus_normal' ? 'Normal FS' : 'Base';
			// eslint-disable-next-line no-console
			console.log(
				`[DEV] ${modeLabel} SW additive cols=[${colLabel}] ×${mult}: ` +
					`phase1=${phase1Amount} → curtain → phase2=${phase2Amount} → ` +
					`spin_payout=${spinPayout} (HUD ${hudBefore}→${spinHud})`,
			);
			const events = [
				reveal(board, isFs ? 'freegame' : 'basegame'),
				asEvent(phase1Win),
				asEvent({ type: 'setWin', amount: phase1Amount, winLevel: 5 }),
				asEvent({ type: 'setTotalWin', amount: phase1Hud }),
				asEvent(expand),
				asEvent(phase2Win),
				// setWin / Big Win = phase-2 beat only; HUD / finalWin = cumulative.
				asEvent({ type: 'setWin', amount: phase2Amount, winLevel: 6 }),
				asEvent({ type: 'setTotalWin', amount: spinHud }),
				asEvent({ type: 'finalWin', amount: spinHud }),
			];
			await playBet({
				id: -1,
				payoutMultiplier: spinHud,
				events,
				state: events,
			} as Parameters<typeof playBet>[0]);
		});

	type SwQaCell = { name: string; wild?: boolean; multiplier?: number };
	type SwQaLine = {
		symbol: string;
		kind: number;
		lineIndex: number;
		/** Visible [reel, row] cells that pay. */
		vis: [number, number][];
	};
	type SwQaSpec = {
		id: string;
		label: string;
		title: string;
		mode?: BetModeKey;
		board: SwQaCell[][];
		/** Already-open sticky reels (0-based) — painted full-column SW before the spin. */
		stickyReels?: { reel: number; mult: number }[];
		/** New lying SW that should open a curtain this spin. */
		expand?: { reel: number; row: number; mult: number }[];
		phase1: SwQaLine[];
		phase2: SwQaLine[];
	};

	const swCell = (name: string, wild = false): SwQaCell =>
		wild ? { name: 'SW', wild: true, multiplier: 1 } : { name };

	const swCol = (names: string[]): SwQaCell[] => names.map((n) => swCell(n, n === 'SW'));

	const SW_QA_H2_TOP: SwQaLine = {
		symbol: 'H2',
		kind: 5,
		lineIndex: 1,
		vis: [0, 1, 2, 3, 4].map((reel) => [reel, 0]),
	};
	const SW_QA_JACK_V: SwQaLine = {
		symbol: 'L4',
		kind: 3,
		lineIndex: 7,
		vis: [
			[0, 3],
			[1, 2],
			[2, 1],
		],
	};
	const SW_QA_H2_STEP: SwQaLine = {
		symbol: 'H2',
		kind: 3,
		lineIndex: 15,
		vis: [
			[0, 0],
			[1, 0],
			[2, 1],
		],
	};

	/** Screenshot-style 5×4: guns on top, Jacks on payline 7, SW on reel 2. */
	const swShotBoard = (reel2: string[]): SwQaCell[][] => [
		swCol(['H2', 'L1', 'L3', 'L4']),
		swCol(['H2', 'L2', 'L4', 'L1']),
		swCol(reel2),
		swCol(['H2', 'L4', 'L1', 'L3']),
		swCol(['H2', 'L4', 'L2', 'H4']),
	];

	const SW_CURTAIN_QA: SwQaSpec[] = [
		{
			id: 'extra-lines',
			label: 'Curtain · extra lines',
			title: 'Screenshot: phase-1 only top H2×5. After curtain, Jack V (7) + extra H2 (15) must play.',
			board: swShotBoard(['SW', 'L2', 'L3', 'L4']),
			expand: [{ reel: 2, row: 0, mult: 4 }],
			phase1: [SW_QA_H2_TOP],
			phase2: [SW_QA_H2_TOP, SW_QA_JACK_V, SW_QA_H2_STEP],
		},
		{
			id: 'middle-lie',
			label: 'Lie · middle row',
			title: 'SW sits on row 2: phase-1 is Jack V + H2 step. After curtain the top H2×5 appears.',
			board: swShotBoard(['L2', 'SW', 'L3', 'L4']),
			expand: [{ reel: 2, row: 1, mult: 4 }],
			phase1: [SW_QA_JACK_V, SW_QA_H2_STEP],
			phase2: [SW_QA_H2_TOP, SW_QA_JACK_V, SW_QA_H2_STEP],
		},
		{
			id: 'bottom-lie',
			label: 'Lie · bottom row',
			title: 'SW on the bottom of col 3, on payline 4. After curtain the top H2×5 appears.',
			board: [
				swCol(['H2', 'L1', 'L3', 'L4']),
				swCol(['H2', 'L2', 'L4', 'L4']),
				swCol(['L2', 'L2', 'L3', 'SW']),
				swCol(['H2', 'L4', 'L1', 'L3']),
				swCol(['H2', 'L4', 'L2', 'H4']),
			],
			expand: [{ reel: 2, row: 3, mult: 2 }],
			phase1: [
				{
					symbol: 'L4',
					kind: 3,
					lineIndex: 4,
					vis: [
						[0, 3],
						[1, 3],
						[2, 3],
					],
				},
			],
			phase2: [
				SW_QA_H2_TOP,
				SW_QA_JACK_V,
				{
					symbol: 'L4',
					kind: 3,
					lineIndex: 4,
					vis: [
						[0, 3],
						[1, 3],
						[2, 3],
					],
				},
			],
		},
		{
			id: 'base-no-expand',
			label: 'Base · no curtain',
			title: 'Control: SW is off every winning line. Curtain must NOT open, Jack V must NOT play.',
			board: swShotBoard(['L2', 'L2', 'L3', 'SW']),
			phase1: [],
			phase2: [],
		},
		{
			id: 'col1',
			label: 'Col 1 · extra',
			title: 'Leftmost SW: phase-1 is top H2. After curtain, row 2 becomes a full L3 line.',
			board: [
				swCol(['SW', 'L1', 'H4', 'L4']),
				swCol(['H2', 'L2', 'L3', 'L1']),
				swCol(['H2', 'L4', 'L3', 'L4']),
				swCol(['H2', 'L4', 'L3', 'L3']),
				swCol(['H2', 'L4', 'L3', 'H4']),
			],
			expand: [{ reel: 0, row: 0, mult: 4 }],
			phase1: [SW_QA_H2_TOP],
			phase2: [
				SW_QA_H2_TOP,
				{
					symbol: 'L3',
					kind: 5,
					lineIndex: 3,
					vis: [0, 1, 2, 3, 4].map((reel) => [reel, 2]),
				},
			],
		},
		{
			id: 'col5',
			label: 'Col 5 · extra',
			title: 'Rightmost SW: phase-1 top H2×5 + Jacks ×4. After curtain Jacks grow to ×5.',
			board: [
				swCol(['H2', 'L4', 'L3', 'L1']),
				swCol(['H2', 'L4', 'L3', 'L2']),
				swCol(['H2', 'L4', 'L3', 'L4']),
				swCol(['H2', 'L4', 'L3', 'L3']),
				swCol(['SW', 'L2', 'L1', 'H4']),
			],
			expand: [{ reel: 4, row: 0, mult: 4 }],
			phase1: [
				SW_QA_H2_TOP,
				{
					symbol: 'L4',
					kind: 4,
					lineIndex: 2,
					vis: [0, 1, 2, 3].map((reel) => [reel, 1]),
				},
			],
			phase2: [
				SW_QA_H2_TOP,
				{
					symbol: 'L4',
					kind: 5,
					lineIndex: 2,
					vis: [0, 1, 2, 3, 4].map((reel) => [reel, 1]),
				},
			],
		},
		{
			id: 'normal-fs',
			label: 'Normal FS · extra',
			title: 'Same screenshot extra-lines case inside Normal FS.',
			mode: 'bonus_normal',
			board: swShotBoard(['SW', 'L2', 'L3', 'L4']),
			expand: [{ reel: 2, row: 0, mult: 4 }],
			phase1: [SW_QA_H2_TOP],
			phase2: [SW_QA_H2_TOP, SW_QA_JACK_V, SW_QA_H2_STEP],
		},
		{
			id: 'super-ungated',
			label: 'Super · no phase-1',
			title: 'Super Bonus: SW not on a phase-1 line, curtain still opens, then full-column lines play.',
			mode: 'bonus_super',
			board: swShotBoard(['L2', 'L2', 'L3', 'SW']),
			expand: [{ reel: 2, row: 3, mult: 4 }],
			phase1: [],
			phase2: [SW_QA_H2_TOP, SW_QA_JACK_V, SW_QA_H2_STEP],
		},
		{
			id: 'sticky-open',
			label: 'Sticky · all rows',
			title: 'Sticky column already open: first winInfo already uses all 4 rows as wild.',
			mode: 'bonus_super',
			board: swShotBoard(['SW', 'SW', 'SW', 'SW']),
			stickyReels: [{ reel: 2, mult: 4 }],
			phase1: [],
			phase2: [SW_QA_H2_TOP, SW_QA_JACK_V, SW_QA_H2_STEP],
		},
		{
			id: 'sticky-plus-new',
			label: 'Sticky + new SW',
			title: 'Col 3 already sticky. New SW on col 5 opens; phase-2 must use both full columns.',
			mode: 'bonus_super',
			board: [
				swCol(['H2', 'L4', 'L3', 'L1']),
				swCol(['H2', 'L4', 'L3', 'L2']),
				swCol(['SW', 'SW', 'SW', 'SW']),
				swCol(['H2', 'L4', 'L3', 'L3']),
				swCol(['SW', 'L2', 'L1', 'H4']),
			],
			stickyReels: [{ reel: 2, mult: 2 }],
			expand: [{ reel: 4, row: 0, mult: 4 }],
			phase1: [
				SW_QA_H2_TOP,
				{
					symbol: 'L4',
					kind: 4,
					lineIndex: 2,
					vis: [0, 1, 2, 3].map((reel) => [reel, 1]),
				},
			],
			phase2: [
				SW_QA_H2_TOP,
				{
					symbol: 'L4',
					kind: 5,
					lineIndex: 2,
					vis: [0, 1, 2, 3, 4].map((reel) => [reel, 1]),
				},
			],
		},
		{
			id: 'two-curtains',
			label: 'Two curtains',
			title: 'Two new SW columns (2 and 4) on the top line. After both open, Jacks through the middle.',
			mode: 'bonus_normal',
			board: [
				swCol(['H2', 'L1', 'L3', 'L4']),
				swCol(['SW', 'L2', 'L4', 'L1']),
				swCol(['H2', 'L4', 'L3', 'L4']),
				swCol(['SW', 'L4', 'L1', 'L3']),
				swCol(['H2', 'L4', 'L2', 'H4']),
			],
			expand: [
				{ reel: 1, row: 0, mult: 2 },
				{ reel: 3, row: 0, mult: 4 },
			],
			phase1: [SW_QA_H2_TOP],
			phase2: [
				SW_QA_H2_TOP,
				{
					symbol: 'L4',
					kind: 4,
					lineIndex: 7,
					vis: [
						[0, 3],
						[1, 2],
						[2, 1],
						[3, 2],
					],
				},
			],
		},
		{
			id: 'v-shape',
			label: 'V-line · then more',
			title: 'Phase-1 is payline 5 (V through SW). After curtain, the flat top H2×5 must also play.',
			board: [
				swCol(['H2', 'L1', 'L3', 'L4']),
				swCol(['H2', 'H2', 'L4', 'L1']),
				swCol(['L2', 'L3', 'SW', 'L4']),
				swCol(['H2', 'H2', 'L1', 'L3']),
				swCol(['H2', 'L4', 'L2', 'H4']),
			],
			expand: [{ reel: 2, row: 2, mult: 4 }],
			phase1: [
				{
					symbol: 'H2',
					kind: 5,
					lineIndex: 5,
					vis: [
						[0, 0],
						[1, 1],
						[2, 2],
						[3, 1],
						[4, 0],
					],
				},
			],
			phase2: [
				{
					symbol: 'H2',
					kind: 5,
					lineIndex: 5,
					vis: [
						[0, 0],
						[1, 1],
						[2, 2],
						[3, 1],
						[4, 0],
					],
				},
				SW_QA_H2_TOP,
			],
		},
		{
			id: 'super-gated',
			label: 'Super · extra lines',
			title: 'Same screenshot extra-lines case inside Super FS (phase-1 gates, then full column).',
			mode: 'bonus_super',
			board: swShotBoard(['SW', 'L2', 'L3', 'L4']),
			expand: [{ reel: 2, row: 0, mult: 4 }],
			phase1: [SW_QA_H2_TOP],
			phase2: [SW_QA_H2_TOP, SW_QA_JACK_V, SW_QA_H2_STEP],
		},
		{
			id: 'two-sticky',
			label: 'Two sticky',
			title: 'Cols 2 and 4 already open: first winInfo already uses both full columns as wild.',
			mode: 'bonus_super',
			board: [
				swCol(['H2', 'L4', 'L3', 'L1']),
				swCol(['SW', 'SW', 'SW', 'SW']),
				swCol(['H2', 'L4', 'L3', 'L4']),
				swCol(['SW', 'SW', 'SW', 'SW']),
				swCol(['H2', 'L4', 'L3', 'H4']),
			],
			stickyReels: [
				{ reel: 1, mult: 2 },
				{ reel: 3, mult: 4 },
			],
			phase1: [],
			phase2: [
				SW_QA_H2_TOP,
				{
					symbol: 'L4',
					kind: 5,
					lineIndex: 2,
					vis: [0, 1, 2, 3, 4].map((reel) => [reel, 1]),
				},
			],
		},
		{
			id: 'flat-row2',
			label: 'Lie · row 3 flat',
			title: 'SW on payline 3 (flat row 3). After curtain the top H2×5 must also play.',
			board: [
				swCol(['H2', 'L1', 'L3', 'L4']),
				swCol(['H2', 'L2', 'L3', 'L1']),
				swCol(['L2', 'L4', 'SW', 'L4']),
				swCol(['H2', 'L4', 'L3', 'L3']),
				swCol(['H2', 'L4', 'L3', 'H4']),
			],
			expand: [{ reel: 2, row: 2, mult: 4 }],
			phase1: [
				{
					symbol: 'L3',
					kind: 5,
					lineIndex: 3,
					vis: [0, 1, 2, 3, 4].map((reel) => [reel, 2]),
				},
			],
			phase2: [
				SW_QA_H2_TOP,
				{
					symbol: 'L3',
					kind: 5,
					lineIndex: 3,
					vis: [0, 1, 2, 3, 4].map((reel) => [reel, 2]),
				},
			],
		},
	];

	const playSwCurtainQa = (spec: SwQaSpec) =>
		guard(async () => {
			const mode: BetModeKey = spec.mode ?? 'BASE';
			applyBetMode(mode);
			const isFs = mode === 'bonus_normal' || mode === 'bonus_super';
			stateGame.gameType = isFs ? 'freegame' : 'basegame';
			stateGame.stickySwByReel = Object.fromEntries(
				(spec.stickyReels ?? []).map((s) => [s.reel, s.mult]),
			);
			stateGame.stickySwOpened =
				(spec.stickyReels?.length ?? 0) > 0 || mode === 'bonus_super';
			stateGame.stickySwIntroPending = false;
			stateGame.swSpineHideReels = {};
			if (!isFs) stateGame.bonusMode = null;
			stateBet.winBookEventAmount = 0;

			const board = spec.board.map((reel) => reel.map((cell) => ({ ...cell })));
			const math = await evalDevMathBoard({
				board,
				mode,
				sticky: spec.stickyReels ?? [],
				expand: spec.expand ?? [],
			});
			const mathEvents = math.events.filter((e) => e.type !== 'reveal');
			const events: BookEvent[] = [
				reveal(board, isFs ? 'freegame' : 'basegame'),
				...mathEvents.map((e, i) => asEvent({ ...e, index: i + 1 })),
			];
			// eslint-disable-next-line no-console
			console.log(
				`[DEV] SW curtain QA math (${spec.id}): ${spec.title} ` +
					`p1=[${math.lines.phase1.join(',')}] p2=[${math.lines.phase2.join(',')}] ` +
					`payout=${math.payoutMultiplier}`,
			);

			await playBet({
				id: -1,
				payoutMultiplier: math.payoutMultiplier,
				events,
				state: events,
			} as Parameters<typeof playBet>[0]);
		});

	const playSwBaseBook = () =>
		playMathBook(
			pickBook(
				basePool,
				(b) => bookHas(b, 'superWildExpand') && !bookHas(b, 'freeSpinTrigger'),
				'SW base',
			),
			'SW base book',
			'BASE',
		);

	const playDuelSwBook = () =>
		playMathBook(
			pickBook(
				duelPool,
				(b) =>
					bookHas(b, 'superWildExpand') ||
					(b.events ?? []).some(
						(e) => e && typeof e === 'object' && (e as { swTwoBeat?: boolean }).swTwoBeat,
					),
				'Duel SW',
			),
			'Duel SW book',
			'bonus_duel',
		);

	const playNaturalFsBook = () =>
		playMathBook(
			pickBook(basePool, (b) => bookHas(b, 'freeSpinTargetPick'), 'Natural FS'),
			'Natural FS book',
			'BASE',
		);

	const playBuyNormalBook = () =>
		playMathBook(pickBook(normalPool, () => true, 'Buy Normal'), 'Buy Normal book', 'bonus_normal');

	const playBuySuperBook = () =>
		playMathBook(pickBook(superPool, () => true, 'Buy Super'), 'Buy Super book', 'bonus_super');

	const playDuelBook = (outcome: 'cat' | 'dog' | 'any') => {
		const label =
			outcome === 'cat' ? 'Duel Cat Wins' : outcome === 'dog' ? 'Duel Dog Wins' : 'Duel random';
		const pred =
			outcome === 'cat'
				? (b: MathBook) => (b.payoutMultiplier ?? 0) > 0
				: outcome === 'dog'
					? (b: MathBook) => (b.payoutMultiplier ?? 0) === 0
					: () => true;
		playMathBook(pickBook(duelPool, pred, label), label, 'bonus_duel');
	};

	const playBoostBook = () =>
		playMathBook(pickBook(boostPool, () => true, 'Bonus Boost'), 'Bonus Boost book', 'bonus_boost');

	const playBulletBook = () =>
		playMathBook(
			pickBook(allBooks, (b) => bookHas(b, 'bulletCollect'), 'Bullets'),
			'Bullet book',
		);

	const playShootBook = () =>
		playMathBook(
			pickBook(allBooks, (b) => bookHas(b, 'targetShootRound'), 'Final Shoot'),
			'Final Shoot book',
		);

	const playFsWithSwBook = () =>
		playMathBook(
			pickBook(allBooks, (b) => bookHasAll(b, ['freeSpinTrigger', 'superWildExpand']), 'FS + SW'),
			'FS + SW book',
		);

	const playFullFeatureBook = () =>
		playMathBook(
			pickBook(
				allBooks,
				(b) => bookHasAll(b, ['freeSpinTargetPick', 'bulletCollect', 'targetShootRound']),
				'Full FS tour',
			),
			'Full FS tour book',
		);

	const playRandomBaseBook = () =>
		playMathBook(pickBook(basePool, () => true, 'Random base'), 'Random base', 'BASE');

	const playRandomBonusBook = () =>
		playMathBook(
			pickBook(normalPool, () => true, 'Random bonus'),
			'Random bonus normal',
			'bonus_normal',
		);

	// === Win Levels ===
	const x = 100;
	const WIN_LEVEL_PRESETS: Array<{ level: WinLevel; amount: number; label: string }> = [
		{ level: 6, amount: 30 * x, label: 'BIG WIN (30x)' },
		{ level: 7, amount: 75 * x, label: 'SUPER WIN (75x)' },
		{ level: 8, amount: 175 * x, label: 'EPIC WIN (175x)' },
		{ level: 9, amount: 1000 * x, label: 'SENSATIONAL (1000x)' },
	];

	const playSetWin = (level: WinLevel, amount: number) =>
		guard(async () => {
			stateBet.winBookEventAmount = amount;
			await playBookEvent(asEvent({ type: 'setWin', amount, winLevel: level }), {
				bookEvents: [],
			});
		});

	const playSmallWin = () => playSetWin(3, 5 * x);

	const playWinPrecisionDemo = (bookAmount: number, label: string) =>
		guard(async () => {
			stateBetDerived.setBetAmount(1);
			stateBet.wageredBetAmount = 1;
			const winInfo = {
				type: 'winInfo' as const,
				totalWin: bookAmount,
				wins: [
					{
						symbol: 'H1',
						kind: 3,
						win: bookAmount,
						positions: [
							{ reel: 0, row: 1 },
							{ reel: 1, row: 1 },
							{ reel: 2, row: 1 },
						],
						meta: {
							lineIndex: 1,
							multiplier: 1,
							winWithoutMult: bookAmount,
							globalMult: 1,
							lineMultiplier: 1.0,
						},
					},
				],
			};
			// eslint-disable-next-line no-console
			console.log(`[DEV] ${label}: bet=$1 book=${bookAmount}`);
			await playBookEvents([reveal(LINE_WIN_BOARD), asEvent(winInfo)]);
			stateBet.winBookEventAmount = bookAmount;
			await playBookEvent(asEvent({ type: 'setWin', amount: bookAmount, winLevel: 3 }), {
				bookEvents: [],
			});
		});

	/**
	 * Under-board WIN stacker debug — FS HUD tween via `forceWinHudCountUp`,
	 * without flipping `gameType` (that would load bonus GPU / white cat).
	 * Bet $0.50 → 1 book = $0.005 (useful with forced 3dp).
	 */
	const WIN_STACK_DEBUG_BET = 0.5;
	/** Book step per press — enough to cross many cent / sub-cent boundaries. */
	const WIN_STACK_DEBUG_ADD = 40;

	const playWinHudStackCountUp = (fractionDigits: number | null = null) =>
		guard(async () => {
			devPreview.winForceFractionDigits = fractionDigits;
			stateBetDerived.setBetAmount(WIN_STACK_DEBUG_BET);
			stateBet.wageredBetAmount = WIN_STACK_DEBUG_BET;
			if (stateGame.gameType === 'freegame' && !stateGame.bonusMode && !stateDuel.active) {
				stateGame.gameType = 'basegame';
			}
			const from = stateBet.winBookEventAmount;
			const to = from + WIN_STACK_DEBUG_ADD;
			const dpLabel = fractionDigits == null ? 'currency-dp' : `${fractionDigits}dp`;
			// eslint-disable-next-line no-console
			console.log(
				`[DEV] WIN stack count-up (${dpLabel}): bet=$${WIN_STACK_DEBUG_BET} book ${from}→${to} ` +
					`(1 book=$${WIN_STACK_DEBUG_BET / 100})`,
			);
			devPreview.forceWinHudCountUp = true;
			try {
				await playBookEvent(asEvent({ type: 'setTotalWin', amount: to }), {
					bookEvents: [],
				});
			} finally {
				devPreview.forceWinHudCountUp = false;
			}
		});

	const resetWinHudStack = () => {
		stateGame.winHudCountUpPending = false;
		stateBet.winBookEventAmount = 0;
		devPreview.winForceFractionDigits = null;
		devPreview.forceWinHudCountUp = false;
		if (stateGame.gameType === 'freegame' && !stateGame.bonusMode && !stateDuel.active) {
			stateGame.gameType = 'basegame';
		}
		// eslint-disable-next-line no-console
		console.log('[DEV] WIN stack reset');
	};

	// === Board wins (5×4 synthetic QA — not math books) ===
	const reel = (symbols: string[]) => symbols.map((name) => ({ name }));

	const LINE_WIN_BOARD = [
		reel(['H1', 'L2', 'L4', 'H2']),
		reel(['H1', 'L4', 'L2', 'H3']),
		reel(['H1', 'L1', 'L3', 'H4']),
		reel(['L2', 'H3', 'L4', 'L2']),
		reel(['H3', 'L3', 'L4', 'H1']),
	];

	const V_SHAPE_BOARD = [
		reel(['L2', 'L1', 'L4', 'H2']),
		reel(['H1', 'L4', 'L1', 'H3']),
		reel(['L3', 'L2', 'L3', 'L1']),
		reel(['H4', 'H3', 'L1', 'L2']),
		reel(['H3', 'L1', 'L4', 'H1']),
	];

	const ALL_L1_BOARD = Array.from({ length: 5 }, () => reel(['L1', 'L1', 'L1', 'L1']));

	const buildPaylinesWinInfo = (lineIndices: number[], perLineWin = 50) => {
		const wins = lineIndices.map((lineIndex) => {
			const rows = config.paylines[String(lineIndex) as keyof typeof config.paylines];
			const positions = rows.map((visibleRow, r) => ({
				reel: r,
				row: visibleRow + 1,
			}));
			return {
				symbol: 'L1',
				kind: 5,
				win: perLineWin,
				positions,
				meta: {
					lineIndex,
					multiplier: 1,
					winWithoutMult: perLineWin,
					globalMult: 1,
					lineMultiplier: 1.0,
				},
			};
		});
		return {
			type: 'winInfo' as const,
			totalWin: perLineWin * wins.length,
			wins,
		};
	};

	const ALL_PAYLINE_INDICES = Object.keys(config.paylines).map(Number);

	const playBoardSmallWin = () =>
		guard(async () => {
			await playBookEvents([reveal(LINE_WIN_BOARD), asEvent(baseEvents.winInfo)]);
			stateBet.winBookEventAmount = 5 * x;
			await playBookEvent(asEvent({ type: 'setWin', amount: 5 * x, winLevel: 3 }), {
				bookEvents: [],
			});
		});

	const playLineWin = () =>
		guard(async () => {
			await playBookEvents([reveal(LINE_WIN_BOARD), asEvent(baseEvents.winInfo)]);
		});

	const playVShapeWin = () =>
		guard(async () => {
			// payline 6 = [1,2,3,2,1] on 5×4
			await playBookEvents([
				reveal(V_SHAPE_BOARD),
				asEvent({
					type: 'winInfo',
					totalWin: 100,
					wins: [
						{
							symbol: 'L1',
							kind: 5,
							win: 100,
							positions: [
								{ reel: 0, row: 2 },
								{ reel: 1, row: 3 },
								{ reel: 2, row: 4 },
								{ reel: 3, row: 3 },
								{ reel: 4, row: 2 },
							],
							meta: {
								lineIndex: 6,
								multiplier: 1,
								winWithoutMult: 100,
								globalMult: 1,
								lineMultiplier: 1.0,
							},
						},
					],
				}),
			]);
		});

	const playMultiPaylinesWin = () =>
		guard(async () => {
			await playBookEvents([
				reveal(ALL_L1_BOARD),
				asEvent(buildPaylinesWinInfo(ALL_PAYLINE_INDICES, 30)),
			]);
		});

	const playBoardWithCoins = (level: WinLevel, amount: number) =>
		guard(async () => {
			await playBookEvents([reveal(LINE_WIN_BOARD), asEvent(baseEvents.winInfo)]);
			stateBet.winBookEventAmount = amount;
			await playBookEvent(asEvent({ type: 'setWin', amount, winLevel: level }), {
				bookEvents: [],
			});
		});

	/** Base SW two-beat additive: board + BIG → curtain → SUPER; HUD = p1+p2. */
	const playSwDoubleBigWin = () =>
		guard(async () => {
			stateGame.gameType = 'basegame';
			stateGame.stickySwByReel = {};
			stateGame.stickySwOpened = false;
			stateGame.stickySwIntroPending = false;
			stateGame.swSpineHideReels = {};
			stateGame.bonusMode = null;
			stateBet.winBookEventAmount = 0;

			const phase1Amount = 30 * x;
			const phase2Amount = 75 * x;
			const spinPayout = phase1Amount + phase2Amount;
			const swBoard = [...SW_DEMO_VISIBLE_BOARD].map((r) =>
				r.map((s) =>
					s.name === 'SW'
						? { name: 'SW', wild: true as const, multiplier: 1 }
						: { ...s },
				),
			) as { name: string }[][];

			const phase1Win = {
				type: 'winInfo' as const,
				totalWin: phase1Amount,
				wins: [
					{
						symbol: 'H2',
						kind: 5,
						win: phase1Amount,
						positions: [
							{ reel: 0, row: 1 },
							{ reel: 1, row: 1 },
							{ reel: 2, row: 1 },
							{ reel: 3, row: 1 },
							{ reel: 4, row: 1 },
						],
						meta: {
							lineIndex: 1,
							multiplier: 1,
							winWithoutMult: phase1Amount,
							globalMult: 1,
							lineMultiplier: 1.0,
						},
					},
				],
			};

			const phase2Win = {
				type: 'winInfo' as const,
				totalWin: phase2Amount,
				wins: [
					{
						symbol: 'H2',
						kind: 5,
						win: Math.floor(phase2Amount * 0.55),
						positions: [
							{ reel: 0, row: 1 },
							{ reel: 1, row: 1 },
							{ reel: 2, row: 1 },
							{ reel: 3, row: 1 },
							{ reel: 4, row: 1 },
						],
						meta: {
							lineIndex: 1,
							multiplier: 4,
							winWithoutMult: Math.floor(phase2Amount * 0.55) / 4,
							globalMult: 1,
							lineMultiplier: 4.0,
						},
					},
					{
						symbol: 'H2',
						kind: 5,
						win: Math.floor(phase2Amount * 0.45),
						positions: [
							{ reel: 0, row: 1 },
							{ reel: 1, row: 2 },
							{ reel: 2, row: 2 },
							{ reel: 3, row: 2 },
							{ reel: 4, row: 1 },
						],
						meta: {
							lineIndex: 5,
							multiplier: 4,
							winWithoutMult: Math.floor(phase2Amount * 0.45) / 4,
							globalMult: 1,
							lineMultiplier: 4.0,
						},
					},
				],
			};

			// eslint-disable-next-line no-console
			console.log(
				`[DEV] SW dual Big Win: phase1 BIG ${phase1Amount} → curtain → phase2 SUPER ${phase2Amount} → HUD ${spinPayout}`,
			);
			await playBookEvents([
				reveal(swBoard),
				asEvent(phase1Win),
				// Before curtain: Big Win shows phase1 only.
				asEvent({ type: 'setWin', amount: phase1Amount, winLevel: 6 }),
				asEvent({ type: 'setTotalWin', amount: phase1Amount }),
				asEvent(superWildExpandDemo),
				asEvent(phase2Win),
				// After curtain: Super Win shows phase2 only (not phase1+phase2).
				asEvent({ type: 'setWin', amount: phase2Amount, winLevel: 7 }),
				asEvent({ type: 'setTotalWin', amount: spinPayout }),
				asEvent({ type: 'finalWin', amount: spinPayout }),
			]);
		});

	/** Dual Big Win: BIG phase1 → curtain → SUPER phase2 (different overlay amounts). */
	const playBaseSwAdditiveDemo = () => playSwDoubleBigWin();

	// === FS UI previews (not full books) ===
	const playFsEnd = (winLevel: WinLevel, amount: number) =>
		guard(() =>
			playBookEvent(asEvent({ type: 'freeSpinEnd', amount, winLevel }), { bookEvents: [] }),
		);

	const playFsIntroPreview = (totalFreeSpins = 8) =>
		guard(async () => {
			eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
			await eventEmitter.broadcastAsync({
				type: 'freeSpinIntroUpdate',
				totalFreeSpins,
			});
			eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		});

	const playFsExtraIntroPreview = () =>
		guard(async () => {
			eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
			await eventEmitter.broadcastAsync({
				type: 'freeSpinIntroUpdate',
				totalFreeSpins: 3,
				mode: 'extra',
			});
			eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		});

	let loaderProgressTimer: ReturnType<typeof setInterval> | null = null;

	const stopLoaderProgressTimer = () => {
		if (loaderProgressTimer) {
			clearInterval(loaderProgressTimer);
			loaderProgressTimer = null;
		}
	};

	/** Stage A: spine logo-loader + progress bar under the animation. */
	const showLoaderProgressPreview = () => {
		stopLoaderProgressTimer();
		stateLayout.showLoadingScreen = false;
		gameEntrance.loadingCardsVisible = false;
		gameEntrance.loaderExitActive = false;
		gameEntrance.introFading = false;
		gameEntrance.liftComplete = true;
		gameEntrance.bootstrapDismissed = false;
		gameEntrance.preloadContent = true;
		gameEntrance.showContent = false;
		devPreview.loaderProgress = true;
		devPreview.loaderProgressValue = 0;
		loaderProgressTimer = setInterval(() => {
			if (devPreview.loaderProgressValue >= 100) {
				stopLoaderProgressTimer();
				return;
			}
			devPreview.loaderProgressValue = Math.min(100, devPreview.loaderProgressValue + 2);
		}, 40);
	};

	/** Stage B: info cards + Press to Continue. */
	const showLoadingCardsPreview = () => {
		stopLoaderProgressTimer();
		devPreview.loaderProgress = false;
		devPreview.loaderProgressValue = 0;
		gameEntrance.showContent = false;
		gameEntrance.loadingCardsVisible = true;
		gameEntrance.loaderExitActive = false;
		gameEntrance.introFading = false;
		gameEntrance.liftComplete = false;
		gameEntrance.bootstrapDismissed = true;
		gameEntrance.preloadContent = true;
		stateLayout.showLoadingScreen = true;
	};

	const hideLoadingScreenPreview = () => {
		stopLoaderProgressTimer();
		devPreview.loaderProgress = false;
		devPreview.loaderProgressValue = 0;
		gameEntrance.preloadContent = true;
		gameEntrance.showContent = true;
		gameEntrance.loadingCardsVisible = false;
		gameEntrance.loaderExitActive = false;
		gameEntrance.introFading = false;
		gameEntrance.liftComplete = true;
		gameEntrance.bootstrapDismissed = true;
		stateLayout.showLoadingScreen = false;
	};

	const playFsCounterPreview = () =>
		guard(async () => {
			fsCounterPreview = !fsCounterPreview;
			if (fsCounterPreview) {
				eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
				stateUi.freeSpinCounterShow = true;
				eventEmitter.broadcast({
					type: 'freeSpinCounterUpdate',
					current: 3,
					total: 10,
				});
				stateUi.freeSpinCounterCurrent = 3;
				stateUi.freeSpinCounterTotal = 10;
			} else {
				eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
				stateUi.freeSpinCounterShow = false;
			}
		});

	onMount(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.shiftKey && e.code === 'KeyD') {
				e.preventDefault();
				open = !open;
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});
</script>

<div class="dev-panel" class:dev-panel--open={open} class:dev-panel--hidden={!SHOW_DEV_PANEL}>
	<button
		class="dev-toggle"
		onclick={() => (open = !open)}
		type="button"
		title="Shift+D"
		aria-expanded={open}
	>
		<span>DEV {open ? '▴' : '▾'}</span>
		<span class="dev-toggle__meta">
			{currentLangLabel}
			·
			{socialOn ? 'SOC' : 'CASH'}
			{#if pixiMemoryHud.overlay}
				· RAM
			{/if}
		</span>
	</button>

	{#if open}
		<div class="dev-body" onwheel={(e) => e.stopPropagation()}>
			<div class="dev-stick">
			<div class="dev-chrome">
				<button
					type="button"
					class:active={pixiMemoryHud.overlay}
					title="Pin GPU memory HUD in the top-right. Tap its header to expand or collapse the list."
					onclick={() => setRamOverlayVisible(!pixiMemoryHud.overlay)}
				>
					RAM {pixiMemoryHud.overlay ? 'ON' : 'OFF'}
				</button>
				<button
					type="button"
					class:active={socialOn}
					title="Toggle ?social=true (Stake.us social casino strings). Reloads."
					onclick={() => setGameSocialMode(!socialOn)}
				>
					Social {socialOn ? 'ON' : 'OFF'}
				</button>
				<button
					type="button"
					class:active={langDrawer}
					title="Switch locale via ?lang=. Reloads."
					onclick={() => (langDrawer = !langDrawer)}
				>
					{currentLangLabel} {langDrawer ? '▴' : '▾'}
				</button>
			</div>
			{#if langDrawer}
				<div class="grid grid--4 lang-drawer">
					{#each STAKE_LOCALES as lang (lang)}
						<button
							type="button"
							class:active={!isInvalidTestLang(rawUrlLang) && stateI18n.i18n.locale === lang}
							onclick={() => setGameLanguage(lang)}
						>
							{LANG_LABELS[lang]}
						</button>
					{/each}
					{#each INVALID_TEST_LOCALES as lang (lang)}
						<button
							type="button"
							class:active={rawUrlLang === lang}
							title="Unsupported locale — should fall back to English"
							onclick={() => setGameLanguage(lang)}
						>
							{INVALID_LANG_LABELS[lang]}
						</button>
					{/each}
				</div>
			{/if}
			<div class="dev-toolbar">
				<label class="dev-search">
					<span class="sr-only">Filter tools</span>
					<input
						type="search"
						placeholder="Filter tools…"
						bind:value={menuQuery}
						autocomplete="off"
						spellcheck="false"
					/>
				</label>
				<button type="button" class="dev-toolbar__btn" onclick={() => setAllAccordions(true)}>
					All
				</button>
				<button type="button" class="dev-toolbar__btn" onclick={() => setAllAccordions(false)}>
					None
				</button>
			</div>
			</div>

			{#if accordionVisible.length === 0}
				<p class="subhint">No matching tools</p>
			{/if}

			{#if showAccordion('books')}
				<DevAccordion
					title="Math books"
					badge={String(allBooks.length)}
					open={accordionForcedOpen || isAccOpen('books')}
					onToggle={() => toggleAccordion('books')}
				>
			<section>
				<h4>Meowfia Books</h4>
				<p class="subhint">Real math books via playBet ({allBooks.length} total)</p>
				<div class="grid">
					<button
						type="button"
						disabled={busy || counts.swBase === 0}
						title={`Base SW expand, no FS (${counts.swBase})`}
						onclick={playSwBaseBook}
					>
						SW Base ({counts.swBase})
					</button>
					<button
						type="button"
						disabled={busy || counts.naturalFs === 0}
						title={`Natural trigger → target pick → full FS (${counts.naturalFs})`}
						onclick={playNaturalFsBook}
					>
						Natural FS ({counts.naturalFs})
					</button>
					<button
						type="button"
						disabled={busy || counts.normal === 0}
						title={`Buy Normal 100× full bonus (${counts.normal})`}
						onclick={playBuyNormalBook}
					>
						Buy Normal
					</button>
					<button
						type="button"
						disabled={busy || counts.super === 0}
						title={`Buy Super 200× — SW pre-open (${counts.super})`}
						onclick={playBuySuperBook}
					>
						Buy Super
					</button>
					<button
						type="button"
						disabled={busy || counts.duelWin === 0}
						title={`Duel math book — Cat wins (${counts.duelWin})`}
						onclick={() => playDuelBook('cat')}
					>
						Duel Cat Wins
					</button>
					<button
						type="button"
						disabled={busy || counts.duelLose === 0}
						title={`Duel math book — Dog wins (${counts.duelLose})`}
						onclick={() => playDuelBook('dog')}
					>
						Duel Dog Wins
					</button>
					<button
						type="button"
						disabled={busy || counts.boost === 0}
						title={`Bonus Boost 2× spin (${counts.boost})`}
						onclick={playBoostBook}
					>
						Bonus Boost
					</button>
					<button
						type="button"
						disabled={busy || counts.bullet === 0}
						title={`FS book with bulletCollect (${counts.bullet})`}
						onclick={playBulletBook}
					>
						Bullets ({counts.bullet})
					</button>
					<button
						type="button"
						disabled={busy || counts.shoot === 0}
						title={`FS book with targetShootRound (${counts.shoot})`}
						onclick={playShootBook}
					>
						Final Shoot
					</button>
					<button
						type="button"
						disabled={busy || counts.fsSw === 0}
						title={`FS session with Super Wild expand (${counts.fsSw})`}
						onclick={playFsWithSwBook}
					>
						FS + SW ({counts.fsSw})
					</button>
					<button
						type="button"
						disabled={busy || counts.tour === 0}
						title={`Target pick + bullets + final shoot (${counts.tour})`}
						onclick={playFullFeatureBook}
					>
						Full FS Tour ({counts.tour})
					</button>
					<button
						type="button"
						disabled={busy || counts.base === 0}
						title={`${counts.base} base books`}
						onclick={playRandomBaseBook}
					>
						Random Base
					</button>
					<button
						type="button"
						disabled={busy || counts.normal === 0}
						title={`${counts.normal} buy-normal books`}
						onclick={playRandomBonusBook}
					>
						Random Bonus
					</button>
				</div>
			</section>
				</DevAccordion>
			{/if}

			{#if showAccordion('paws')}
				<DevAccordion
					title="Paw coins"
					open={accordionForcedOpen || isAccOpen('paws')}
					onToggle={() => toggleAccordion('paws')}
				>
			<section>
				<h4>Paw Coins</h4>
				<p class="subhint">Random board each click — paw lands on a random cell, converts its rows (PB 1 / PS 2 / PG 3), coins fly to the hat. Tier per symbol: lows x1, H3/H4 x2, H1/H2 x3.</p>
				<div class="grid">
					<button
						type="button"
						disabled={busy}
						title="Bronze paw: random drop, converts 1 row"
						onclick={() => playPawKindDrop('PB')}
					>
						PB · 1 row
					</button>
					<button
						type="button"
						disabled={busy}
						title="Silver paw: random drop, converts 2 rows"
						onclick={() => playPawKindDrop('PS')}
					>
						PS · 2 rows
					</button>
					<button
						type="button"
						disabled={busy}
						title="Gold paw: random drop, converts 3 rows"
						onclick={() => playPawKindDrop('PG')}
					>
						PG · 3 rows
					</button>
				</div>
			</section>
				</DevAccordion>
			{/if}

			{#if showAccordion('superwild')}
				<DevAccordion
					title="Super Wild"
					open={accordionForcedOpen || isAccOpen('superwild')}
					onToggle={() => toggleAccordion('superwild')}
				>
			<section>
				<h4>Super Wild</h4>
				<p class="subhint">
					Two-beat additive: phase1 snap → curtain → phase2 count-up on HUD (base + FS). Duel banks do the same under each desk.
				</p>
				<p class="subhint" style="margin-top: 6px">
					Curtain QA plays the live math engine (`get_lines` + two-beat SW), not a hand-built win list.
				</p>
				<div class="grid">
					{#each SW_CURTAIN_QA as spec (spec.id)}
						<button
							type="button"
							disabled={busy}
							title={spec.title}
							onclick={() => playSwCurtainQa(spec)}
						>
							{spec.label}
						</button>
					{/each}
				</div>
				<div class="grid">
					<button
						type="button"
						disabled={busy}
						title="BIG phase1 → curtain → SUPER phase2 (разные суммы); HUD = сумма"
						onclick={playBaseSwAdditiveDemo}
					>
						Base SW · 2× Big Win
					</button>
					<button
						type="button"
						disabled={busy}
						title="Col 3 ×2: phase1 5.00 → curtain → phase2 10.00 → HUD 15.00"
						onclick={() => playSwDrop([SW_DEMO_WHEEL_COL], 2)}
					>
						Base SW · pay both
					</button>
					<button
						type="button"
						disabled={busy}
						title="Same additive SW demo inside Normal FS (HUD count-up after curtain)"
						onclick={() => playSwDrop([SW_DEMO_WHEEL_COL], 2, 'bonus_normal')}
					>
						Normal FS · SW
					</button>
					<button
						type="button"
						disabled={busy}
						title="Same additive SW demo inside Super FS (HUD count-up after curtain)"
						onclick={() => playSwDrop([SW_DEMO_WHEEL_COL], 2, 'bonus_super')}
					>
						Super FS · SW
					</button>
					<button
						type="button"
						disabled={busy}
						title="Math duel book with Super Wild expand / two-beat"
						onclick={playDuelSwBook}
					>
						Duel · SW book
					</button>
				</div>
				<p class="subhint" style="margin-top: 6px">
					Columns (1-based). Singles · presets · <b>All 1–{BOARD_DIMENSIONS.x}</b> — same additive payout.
				</p>
				<div class="grid grid--5">
					{#each SW_DEMO_SINGLE_COLS as col}
						<button
							type="button"
							disabled={busy}
							title={`SW column ${col} → curtain expand (additive HUD)`}
							onclick={() => playSwDrop([col])}
						>
							{col}
						</button>
					{/each}
				</div>
				<div class="grid" style="margin-top: 4px">
					{#each SW_DEMO_PRESETS as preset}
						<button
							type="button"
							disabled={busy}
							title={`SW columns ${preset.cols.join(', ')} → curtain (additive HUD)`}
							onclick={() => playSwDrop(preset.cols)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
				<p class="subhint" style="margin-top: 6px">
					Drum spin — column {SW_DEMO_WHEEL_COL}, fixed mult (×2…×75), additive HUD.
				</p>
				<div class="grid grid--3">
					{#each SW_DEMO_MULTS as mult}
						<button
							type="button"
							disabled={busy}
							title={`SW column ${SW_DEMO_WHEEL_COL} → curtain → drum ×${mult} → HUD p1+p2`}
							onclick={() => playSwDrop([SW_DEMO_WHEEL_COL], mult)}
						>
							×{mult}
						</button>
					{/each}
				</div>
			</section>
				</DevAccordion>
			{/if}

			{#if showAccordion('board')}
				<DevAccordion
					title="Board"
					open={accordionForcedOpen || isAccOpen('board')}
					onToggle={() => toggleAccordion('board')}
				>
			<section>
				<h4>Reel Speed</h4>
				<div class="grid">
					<button
						type="button"
						class:active={devPreview.slowReelScroll}
						title="Замедлить прокрутку барабанов до 0.5×"
						onclick={() => (devPreview.slowReelScroll = !devPreview.slowReelScroll)}
					>
						{devPreview.slowReelScroll ? 'Slow Reels: ON' : 'Slow Reels'}
					</button>
				</div>
			</section>

			<section>
				<h4>Bonus Reel</h4>
				<p class="subhint">
					Spine <code>assets/spines/bonusReel</code> — outline VFX on every column (in → idle).
				</p>
				<div class="grid">
					<button
						type="button"
						class:active={devPreview.forceShowBonusReelAllColumns}
						title="Pin bonusReel outline on all 5 columns for layout / VFX QA"
						onclick={() =>
							(devPreview.forceShowBonusReelAllColumns =
								!devPreview.forceShowBonusReelAllColumns)}
					>
						{devPreview.forceShowBonusReelAllColumns
							? 'Hide All Columns'
							: 'Show All Columns'}
					</button>
				</div>
			</section>
				</DevAccordion>
			{/if}

			{#if showAccordion('characters')}
				<DevAccordion
					title="Characters"
					open={accordionForcedOpen || isAccOpen('characters')}
					onToggle={() => toggleAccordion('characters')}
				>
			<section>
				<h4>Cat Mascot Anims</h4>
				<div class="grid">
					{#each MASCOT_DEV_PREVIEW_ITEMS as item (item.id)}
						<button
							type="button"
							class:active={devPreview.mascotAnimation === item.id}
							title={item.title}
							onclick={() => {
								devPreview.mascotDogAnimation = null;
								devPreview.mascotAnimation = item.id;
							}}
						>
							{item.label}
						</button>
					{/each}
					<button
						type="button"
						class:active={devPreview.mascotAnimation === null &&
							devPreview.mascotDogAnimation === null}
						title="Вернуть управление позами (idle/load/aim/…)"
						onclick={() => {
							devPreview.mascotAnimation = null;
							devPreview.mascotDogAnimation = null;
						}}
					>
						Reset Pose
					</button>
				</div>
			</section>

			<section>
				<h4>Dog Mascot Anims</h4>
				<p class="subhint">Replaces the cat on the primary slot.</p>
				<div class="grid">
					{#each MASCOT_DOG_DEV_PREVIEW_ITEMS as item (item.id)}
						<button
							type="button"
							class:active={devPreview.mascotDogAnimation === item.id}
							title={item.title}
							onclick={() => {
								devPreview.mascotAnimation = null;
								devPreview.mascotDogAnimation = item.id;
							}}
						>
							{item.label}
						</button>
					{/each}
					<button
						type="button"
						class:active={devPreview.mascotDogAnimation === null}
						title="Hide dog preview — restore cat pose control"
						onclick={() => {
							devPreview.mascotDogAnimation = null;
						}}
					>
						Reset Dog
					</button>
				</div>
			</section>

			<section>
				<h4>Symbol Anims</h4>
				<p class="subhint">Pick symbol → clip. Plays on the board. Re-click to replay.</p>
				<div class="grid grid--3">
					{#each SYMBOL_DEV_PREVIEW_GROUPS as group (group.id)}
						<button
							type="button"
							class:active={symbolAnimGroupId === group.id}
							title={group.title}
							onclick={() => selectSymbolGroup(group.id)}
						>
							{group.label}
						</button>
					{/each}
				</div>
				{#if selectedSymbolGroup}
					<div class="grid" style="margin-top: 4px">
						{#each selectedSymbolGroup.clips as clip (clip.id)}
							<button
								type="button"
								class:active={devPreview.symbolAnim?.groupId === selectedSymbolGroup.id &&
									devPreview.symbolAnim?.clipId === clip.id}
								title={`${selectedSymbolGroup.label} · ${clip.animationName}${clip.loop ? ' (loop)' : ''}`}
								onclick={() => playSymbolClip(selectedSymbolGroup.id, clip.id)}
							>
								{clip.label}
							</button>
						{/each}
						<button
							type="button"
							class:active={devPreview.symbolAnim === null}
							title="Stop forcing the clip (board stays as painted)"
							onclick={closeSymbolAnimPreview}
						>
							Close
						</button>
					</div>
				{/if}
			</section>
				</DevAccordion>
			{/if}

			{#if showAccordion('stage')}
				<DevAccordion
					title="Stage"
					open={accordionForcedOpen || isAccOpen('stage')}
					onToggle={() => toggleAccordion('stage')}
				>
			<section>
				<h4>Board Frame</h4>
				<p class="subhint">Desk crest glow (`animation`) — same pulse as lines / BT / paw.</p>
				<div class="grid">
					<button
						type="button"
						title="Play boardFramePulse once"
						onclick={previewBoardFramePulse}
					>
						Pulse Once
					</button>
					<button
						type="button"
						title="Play boardFramePulse three times with a short gap"
						onclick={() => {
							eventEmitter.broadcast({ type: 'boardFramePulse', times: 3 });
						}}
					>
						Pulse ×3
					</button>
				</div>
			</section>

			<section>
				<h4>FS Board Chrome</h4>
				<p class="subhint">Desktop: spinboard (left) + barrel rim/drum (right). Phone: autoplay plaque top-centre, drum bottom-left.</p>
				<div class="grid">
					<button
						type="button"
						class:active={devPreview.forceShowFsBoardChrome}
						title="Toggle free-spin side plaques on the board (desktop)"
						onclick={toggleFsBoardChromePreview}
					>
						{devPreview.forceShowFsBoardChrome ? 'Hide FS Board' : 'Show FS Board'}
					</button>
				</div>
			</section>

			<section>
				<h4>Duel Layout</h4>
				<p class="subhint">Dual desks + VS scale + mascots — layout only, no book / spins.</p>
				<div class="grid">
					<button
						type="button"
						class:active={devPreview.forceShowDuelLayout}
						title="Toggle Duel dual-board layout without starting a duel"
						onclick={() => toggleDuelLayoutPreview()}
					>
						{devPreview.forceShowDuelLayout ? 'Hide Duel Layout' : 'Show Duel Layout'}
					</button>
				</div>
			</section>

			<section>
				<h4>Target Board</h4>
				<p class="subhint">Pick ×6 entry board · Shoot ×9 Stage E cabinet (background_9).</p>
				<div class="grid">
					<button
						type="button"
						class:active={devPreview.forceShowTargetBoard}
						title="Floating pick×6 board preview (designer target)"
						onclick={() => toggleTargetBoardPreview()}
					>
						{devPreview.forceShowTargetBoard ? 'Hide Target ×6' : 'Show Target ×6'}
					</button>
					<button
						type="button"
						class:active={devPreview.forceShowTargetShoot}
						title="Stage E 9-target cabinet in the gold frame (background_9.webp)"
						onclick={() => toggleTargetShootPreview()}
					>
						{devPreview.forceShowTargetShoot ? 'Hide Target ×9' : 'Show Target ×9'}
					</button>
					<button
						type="button"
						disabled={busy}
						title="freeSpinTargetPick: aim → click → shot → flip"
						onclick={playTargetPickPreview}
					>
						Play Target Pick
					</button>
					<button
						type="button"
						disabled={busy}
						title="targetShootRound: 9 seats + drum shots → extra FS"
						onclick={playTargetShootPreview}
					>
						Play Target Shoot
					</button>
				</div>
			</section>

			<section>
				<h4>Bullet Fly</h4>
				<p class="subhint">Desktop: cartridge(s) fly to cat hand together (gun_start catch); shoot swaps to spent art + shake.</p>
				<div class="grid">
					<button
						type="button"
						disabled={bulletFlyBusy}
						class:active={!!stateGame.bulletFly?.length || devPreview.forceShowDrum}
						title="Preview 1× BT → hand fly + gun_start"
						onclick={() => previewBulletFly(1)}
					>
						{bulletFlyBusy ? 'Flying…' : 'Fly ×1'}
					</button>
					<button
						type="button"
						disabled={bulletFlyBusy}
						class:active={!!stateGame.bulletFly?.length || devPreview.forceShowDrum}
						title="Preview 2× BT → hand together + gun_start"
						onclick={() => previewBulletFly(2)}
					>
						{bulletFlyBusy ? 'Flying…' : 'Fly ×2'}
					</button>
					<button
						type="button"
						disabled={bulletFlyBusy}
						class:active={!!stateGame.bulletFly?.length || devPreview.forceShowDrum}
						title="Preview 3× BT → hand together + gun_start"
						onclick={() => previewBulletFly(3)}
					>
						{bulletFlyBusy ? 'Flying…' : 'Fly ×3'}
					</button>
					<button
						type="button"
						disabled={bulletFlyBusy}
						title="Fire drum chambers one by one (bullet_2 + shake)"
						onclick={previewDrumShoot}
					>
						{bulletFlyBusy ? 'Shooting…' : 'Shoot Drum'}
					</button>
					<button
						type="button"
						title="Clear drum fill and hide drum overlay"
						onclick={resetBulletFlyPreview}
					>
						Reset Drum
					</button>
				</div>
			</section>
				</DevAccordion>
			{/if}

			{#if showAccordion('wins')}
				<DevAccordion
					title="Wins"
					open={accordionForcedOpen || isAccOpen('wins')}
					onToggle={() => toggleAccordion('wins')}
				>
			<section>
				<h4>Win Levels</h4>
				<div class="grid">
					<button type="button" disabled={busy} onclick={playSmallWin}>Small Win</button>
					{#each WIN_LEVEL_PRESETS as preset (preset.label)}
						<button
							type="button"
							disabled={busy}
							onclick={() => playSetWin(preset.level, preset.amount)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
			</section>

			<section>
				<h4>Win Precision (QA)</h4>
				<p class="subhint">
					FS count-up via setTotalWin. +40 = currency dp (USD 2). +40 · 3dp forces three
					fraction digits ($0.005 steps @ $0.50 bet) to verify L/R stability.
				</p>
				<div class="grid">
					<button
						type="button"
						disabled={busy}
						class:active={devPreview.winForceFractionDigits == null &&
							stateBet.winBookEventAmount > 0}
						title={`Count-up +${WIN_STACK_DEBUG_ADD} book @ $${WIN_STACK_DEBUG_BET} bet (currency decimals)`}
						onclick={() => playWinHudStackCountUp(null)}
					>
						WIN Stack +{WIN_STACK_DEBUG_ADD}
					</button>
					<button
						type="button"
						disabled={busy}
						class:active={devPreview.winForceFractionDigits === 3}
						title={`Count-up +${WIN_STACK_DEBUG_ADD} with forced 3 fraction digits (e.g. $0.005)`}
						onclick={() => playWinHudStackCountUp(3)}
					>
						WIN Stack +{WIN_STACK_DEBUG_ADD} · 3dp
					</button>
					<button
						type="button"
						title="Reset under-board WIN to 0 and clear forced decimals"
						onclick={resetWinHudStack}
					>
						Reset WIN
					</button>
					<button
						type="button"
						disabled={busy}
						onclick={() => playWinPrecisionDemo(7.5, 'Win $0.075')}
					>
						Win $0.075
					</button>
					<button
						type="button"
						disabled={busy}
						onclick={() => playWinPrecisionDemo(12.3456, 'Win $0.123456')}
					>
						Win $0.123456
					</button>
				</div>
			</section>

			<section>
				<h4>Board Wins (synthetic)</h4>
				<div class="grid">
					<button type="button" disabled={busy} onclick={playBoardSmallWin}>
						Board + Small
					</button>
					<button type="button" disabled={busy} onclick={playLineWin}>Line Win</button>
					<button type="button" disabled={busy} onclick={playVShapeWin}>V-Shape Win</button>
					<button type="button" disabled={busy} onclick={playMultiPaylinesWin}>
						All Paylines (×{ALL_PAYLINE_INDICES.length})
					</button>
					<button
						type="button"
						disabled={busy}
						onclick={() => playBoardWithCoins(6, 30 * x)}
					>
						Board + Coins
					</button>
					<button
						type="button"
						disabled={busy}
						onclick={() => playBoardWithCoins(9, 1000 * x)}
					>
						Board + Coin Rain
					</button>
				</div>
			</section>
				</DevAccordion>
			{/if}

			{#if showAccordion('ui')}
				<DevAccordion
					title="UI & loading"
					open={accordionForcedOpen || isAccOpen('ui')}
					onToggle={() => toggleAccordion('ui')}
				>
			<section>
				<h4>Loading</h4>
				<div class="grid">
					<button
						type="button"
						class:active={devPreview.loaderProgress}
						onclick={showLoaderProgressPreview}
					>
						Show Progress
					</button>
					<button type="button" onclick={showLoadingCardsPreview}>
						Show Cards
					</button>
					<button type="button" onclick={hideLoadingScreenPreview}>
						Hide Loading
					</button>
				</div>
			</section>

			<section>
				<h4>FS UI</h4>
				<div class="grid">
					<button
						type="button"
						disabled={busy}
						class:active={fsCounterPreview}
						onclick={playFsCounterPreview}
					>
						{fsCounterPreview ? 'FS Counter: ON' : 'FS Counter'}
					</button>
					<button type="button" disabled={busy} onclick={() => playFsIntroPreview(8)}>
						FS Intro (8)
					</button>
					<button type="button" disabled={busy} onclick={playFsExtraIntroPreview}>
						FS Extra Spins
					</button>
					<button type="button" disabled={busy} onclick={() => playFsEnd(3, 1200)}>
						FS End (Small)
					</button>
					<button type="button" disabled={busy} onclick={() => playFsEnd(6, 75_000)}>
						FS End (Big)
					</button>
				</div>
			</section>

			<section>
				<h4>Modals</h4>
				<div class="grid">
					<button
						type="button"
						onclick={() =>
							(stateModal.modal = { name: 'autoSpinMessage', message: 'insufficientFunds' })}
					>
						Insufficient Funds
					</button>
					<button
						type="button"
						onclick={() =>
							(stateModal.modal = { name: 'autoSpinMessage', message: 'lossLimitReached' })}
					>
						Loss Limit
					</button>
					<button
						type="button"
						onclick={() =>
							(stateModal.modal = {
								name: 'autoSpinMessage',
								message: 'singleWinLimitReached',
							})}
					>
						Win Limit
					</button>
				</div>
			</section>
				</DevAccordion>
			{/if}

			<p class="hint">Shift+D · tools from 0_0_cat_mafia</p>
		</div>
	{/if}
</div>

<style>
	.dev-panel {
		position: fixed;
		top: 8px;
		left: 8px;
		z-index: 99998;
		font-family: 'JetBrains Mono', 'Menlo', monospace;
		font-size: 11px;
		color: #fff;
		user-select: none;
	}

	.dev-panel--hidden {
		display: none;
	}

	.dev-toggle {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		background: rgba(37, 99, 235, 0.92);
		color: #fff;
		padding: 5px 10px;
		border: none;
		font-family: inherit;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.05em;
		border-radius: 6px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		cursor: pointer;
	}
	.dev-toggle:hover {
		background: rgba(29, 78, 216, 0.95);
	}
	.dev-toggle__meta {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.04em;
		opacity: 0.8;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.dev-body {
		margin-top: 6px;
		background: rgba(15, 23, 42, 0.94);
		border: 1px solid rgba(59, 130, 246, 0.45);
		border-radius: 8px;
		padding: 8px 10px 6px;
		width: min(340px, calc(100vw - 16px));
		max-height: calc(100vh - 56px);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-gutter: stable;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
	}

	.dev-body::-webkit-scrollbar {
		width: 8px;
	}
	.dev-body::-webkit-scrollbar-thumb {
		background: rgba(96, 165, 250, 0.55);
		border-radius: 4px;
	}

	.dev-stick {
		position: sticky;
		top: 0;
		z-index: 1;
		margin: -8px -10px 6px;
		padding: 8px 10px 6px;
		background: rgba(15, 23, 42, 0.97);
		border-bottom: 1px solid rgba(51, 65, 85, 0.85);
	}

	.dev-chrome {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 4px;
		margin-bottom: 6px;
	}

	.lang-drawer {
		margin-bottom: 6px;
	}

	.dev-toolbar {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 6px;
	}

	.dev-search {
		flex: 1;
		min-width: 0;
	}
	.dev-search input {
		width: 100%;
		box-sizing: border-box;
		background: rgba(15, 23, 42, 0.9);
		color: #e2e8f0;
		border: 1px solid rgba(71, 85, 105, 0.8);
		border-radius: 4px;
		padding: 5px 8px;
		font-family: inherit;
		font-size: 11px;
	}
	.dev-search input::placeholder {
		color: #64748b;
	}
	.dev-search input:focus {
		outline: none;
		border-color: rgba(96, 165, 250, 0.85);
	}

	.dev-toolbar__btn {
		flex: none;
		min-width: 40px;
	}

	.dev-body :global(.acc) {
		border-bottom: 1px solid rgba(51, 65, 85, 0.85);
	}
	.dev-body :global(.acc:last-of-type) {
		border-bottom: 0;
	}
	.dev-body :global(button.acc-head) {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		margin: 0;
		padding: 8px 2px;
		background: transparent;
		border: none;
		border-radius: 0;
		color: #93c5fd;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-align: left;
	}
	.dev-body :global(button.acc-head:hover:not(:disabled)) {
		background: rgba(59, 130, 246, 0.12);
		border-color: transparent;
	}
	.dev-body :global(.acc--open button.acc-head) {
		color: #bfdbfe;
	}
	.dev-body :global(.acc-head__title) {
		flex: 1;
		min-width: 0;
	}
	.dev-body :global(.acc-head__badge) {
		flex: none;
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: none;
		color: #94a3b8;
	}
	.dev-body :global(.acc-head__chevron) {
		flex: none;
		opacity: 0.7;
		font-size: 11px;
	}
	.dev-body :global(.acc-body) {
		padding: 0 0 10px;
	}

	.dev-body section {
		margin-bottom: 10px;
	}
	.dev-body section:last-of-type {
		margin-bottom: 0;
	}

	.dev-body h4 {
		margin: 8px 0 4px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #64748b;
	}
	.dev-body :global(.acc-body > h4:first-child),
	.dev-body section:first-child h4 {
		margin-top: 0;
	}

	.subhint {
		margin: 0 0 6px;
		font-size: 9px;
		color: #64748b;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
	}

	.grid--3 {
		grid-template-columns: 1fr 1fr 1fr;
	}

	.grid--4 {
		grid-template-columns: repeat(4, 1fr);
	}

	.grid--5 {
		grid-template-columns: repeat(5, 1fr);
	}

	.dev-body button {
		background: rgba(30, 41, 59, 0.95);
		color: #f1f5f9;
		border: 1px solid rgba(71, 85, 105, 0.7);
		padding: 6px 6px;
		font-family: inherit;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.02em;
		border-radius: 4px;
		cursor: pointer;
		transition:
			background 80ms,
			border-color 80ms;
		text-align: center;
	}
	.dev-body button:hover:not(:disabled) {
		background: rgba(59, 130, 246, 0.35);
		border-color: rgba(96, 165, 250, 0.85);
	}
	.dev-body button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.dev-body button.active {
		background: rgba(34, 197, 94, 0.45);
		border-color: rgba(74, 222, 128, 0.9);
		color: #fff;
	}

	.hint {
		margin: 6px 0 0;
		font-size: 9px;
		color: #64748b;
		text-align: center;
	}
</style>
