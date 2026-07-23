<!--
	DevButtons.svelte — Cat Mafia dev panel.

	Feature buttons play real math books (synced from 0_0_cat_mafia) via
	playBet — same path as Storybook / production book playback.

	Toggle: Shift+D
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
	import { stateGame } from '../game/stateGame.svelte';
	import { stateLayout } from '../game/stateLayout';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { MASCOT_DEV_PREVIEW_ITEMS } from '../game/mascotHtmlSpine';
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
	import baseEvents from '../stories/data/base_events';
	import baseBooks from '../stories/data/base_books';
	import bonusBooks from '../stories/data/bonus_books';
	import bonusBoostBooks from '../stories/data/books_bonus_boost';
	import bonusSuperBooks from '../stories/data/books_bonus_super';
	import {
		SW_DEMO_VISIBLE_BOARD,
		superWildExpandDemo,
	} from '../stories/data/catmafia_events';
	import type { WinLevel } from '../game/winLevelMap';
	import type { BookEvent } from '../game/typesBookEvent';
	import type { GameType, RawSymbol } from '../game/types';
	import config from '../game/config';

	let open = $state(false);
	let langOpen = $state(false);
	let busy = $state(false);
	let fsCounterPreview = $state(false);

	type BetModeKey = 'BASE' | 'bonus_boost' | 'bonus_normal' | 'bonus_super';

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
		return 'BASE';
	};

	const applyBetMode = (modeKey: BetModeKey) => {
		stateBet.activeBetModeKey = modeKey;
		stateGame.bonusMode =
			modeKey === 'bonus_super' ? 'super' : modeKey === 'bonus_normal' ? 'normal' : null;
		if (modeKey === 'bonus_boost') stateGame.activeFeature = 'bonus_boost';
		else if (modeKey === 'BASE') stateGame.activeFeature = null;
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
	const allBooks = [...basePool, ...boostPool, ...normalPool, ...superPool];

	const counts = {
		base: basePool.length,
		boost: boostPool.length,
		normal: normalPool.length,
		super: superPool.length,
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

	// Feature demos — full real books (same path as Storybook / live playBet)
	const playPawBook = () =>
		playMathBook(
			pickBook(basePool, (b) => bookHas(b, 'pawCoinResolve'), 'Paw'),
			'Paw book',
			'BASE',
		);

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

	/** Base SW two-beat: board + BIG → curtain expand → SUPER on re-eval. */
	const playSwDoubleBigWin = () =>
		guard(async () => {
			stateGame.gameType = 'basegame';
			stateGame.stickySwByReel = {};
			stateGame.stickySwOpened = false;
			stateGame.bonusMode = null;
			stateBet.winBookEventAmount = 0;

			const phase1Amount = 30 * x;
			const phase2Amount = 75 * x;
			const swBoard = [...SW_DEMO_VISIBLE_BOARD].map((r) => r.map((s) => ({ ...s }))) as {
				name: string;
			}[][];

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
			console.log('[DEV] SW double big: BIG → curtain → SUPER');
			await playBookEvents([
				reveal(swBoard),
				asEvent(phase1Win),
				asEvent({ type: 'setWin', amount: phase1Amount, winLevel: 6 }),
				asEvent({ type: 'setTotalWin', amount: phase1Amount }),
				asEvent(superWildExpandDemo),
				asEvent(phase2Win),
				asEvent({ type: 'setWin', amount: phase2Amount, winLevel: 7 }),
				asEvent({ type: 'setTotalWin', amount: phase2Amount }),
			]);
		});

	// === FS UI previews (not full books) ===
	const playFsEnd = (winLevel: WinLevel, amount: number) =>
		guard(() =>
			playBookEvent(asEvent({ type: 'freeSpinEnd', amount, winLevel }), { bookEvents: [] }),
		);

	const playFsIntroPreview = () =>
		guard(async () => {
			eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
			await eventEmitter.broadcastAsync({
				type: 'freeSpinIntroUpdate',
				totalFreeSpins: 10,
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
	<button class="dev-toggle" onclick={() => (open = !open)} type="button">
		{open ? 'DEV ▴' : 'DEV ▾'}
	</button>

	<button
		class="dev-toggle lang-toggle"
		class:lang-toggle--open={langOpen}
		type="button"
		onclick={() => (langOpen = !langOpen)}
	>
		LANG {langOpen ? '▴' : '▾'}
		{isInvalidTestLang(getRawUrlLang())
			? `${getRawUrlLang().toUpperCase()}→EN`
			: stateI18n.i18n.locale.toUpperCase()}
	</button>

	<button
		class="dev-toggle social-toggle"
		class:social-toggle--on={stateUrlDerived.social()}
		type="button"
		title="Toggle ?social=true (Stake.us social casino UI strings)"
		onclick={() => setGameSocialMode(!stateUrlDerived.social())}
	>
		SOCIAL {stateUrlDerived.social() ? 'ON' : 'OFF'}
	</button>

	{#if langOpen}
		{@const rawLang = getRawUrlLang()}
		<div class="lang-body">
			{#each STAKE_LOCALES as lang (lang)}
				<button
					type="button"
					class:active={!isInvalidTestLang(rawLang) && stateI18n.i18n.locale === lang}
					onclick={() => setGameLanguage(lang)}
				>
					{LANG_LABELS[lang]}
				</button>
			{/each}
			{#each INVALID_TEST_LOCALES as lang (lang)}
				<button
					type="button"
					class:active={rawLang === lang}
					title="Unsupported locale — should fall back to English"
					onclick={() => setGameLanguage(lang)}
				>
					{INVALID_LANG_LABELS[lang]}
				</button>
			{/each}
		</div>
	{/if}

	{#if open}
		<div class="dev-body" onwheel={(e) => e.stopPropagation()}>
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
				<h4>Cat Mafia Books</h4>
				<p class="subhint">Real math books via playBet ({allBooks.length} total)</p>
				<div class="grid">
					<button
						type="button"
						disabled={busy || counts.paw === 0}
						title={`Full book with pawCoinResolve (${counts.paw})`}
						onclick={playPawBook}
					>
						Paw ({counts.paw})
					</button>
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
				<h4>Mascot Anims</h4>
				<div class="grid">
					{#each MASCOT_DEV_PREVIEW_ITEMS as item (item.id)}
						<button
							type="button"
							class:active={devPreview.mascotAnimation === item.id}
							title={item.title}
							onclick={() => {
								devPreview.mascotAnimation = item.id;
							}}
						>
							{item.label}
						</button>
					{/each}
					<button
						type="button"
						class:active={devPreview.mascotAnimation === null}
						title="Вернуть управление позами (idle/load/aim/…)"
						onclick={() => {
							devPreview.mascotAnimation = null;
						}}
					>
						Reset Pose
					</button>
				</div>
			</section>

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
				<div class="grid">
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
					<button
						type="button"
						disabled={busy}
						title="Доска с SW×4: BIG WIN → штора → SUPER WIN (re-eval)"
						onclick={playSwDoubleBigWin}
					>
						SW ×2 Big Wins
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
					<button type="button" disabled={busy} onclick={playFsIntroPreview}>
						FS Intro
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

			<p class="hint">Shift+D — toggle · books from 0_0_cat_mafia</p>
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
		background: rgba(37, 99, 235, 0.92);
		color: #fff;
		padding: 4px 10px;
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

	.lang-toggle {
		display: block;
		margin-top: 4px;
		background: rgba(124, 58, 237, 0.92);
	}
	.lang-toggle:hover {
		background: rgba(109, 40, 217, 0.95);
	}
	.lang-toggle--open {
		background: rgba(91, 33, 182, 0.95);
	}

	.social-toggle {
		display: block;
		margin-top: 4px;
		background: rgba(5, 150, 105, 0.92);
	}
	.social-toggle:hover {
		background: rgba(4, 120, 87, 0.95);
	}
	.social-toggle--on {
		background: rgba(234, 88, 12, 0.92);
	}
	.social-toggle--on:hover {
		background: rgba(194, 65, 12, 0.95);
	}

	.lang-body {
		margin-top: 4px;
		background: rgba(15, 23, 42, 0.94);
		border: 1px solid rgba(167, 139, 250, 0.45);
		border-radius: 8px;
		padding: 6px;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		min-width: 240px;
		max-width: 280px;
		max-height: 200px;
		overflow-y: auto;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
	}

	.lang-body button {
		background: rgba(30, 41, 59, 0.95);
		color: #f1f5f9;
		border: 1px solid rgba(71, 85, 105, 0.7);
		padding: 5px 4px;
		font-family: inherit;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.04em;
		border-radius: 4px;
		cursor: pointer;
	}
	.lang-body button:hover {
		background: rgba(124, 58, 237, 0.35);
		border-color: rgba(167, 139, 250, 0.85);
	}
	.lang-body button.active {
		background: rgba(34, 197, 94, 0.45);
		border-color: rgba(74, 222, 128, 0.9);
	}

	.dev-body {
		margin-top: 6px;
		background: rgba(15, 23, 42, 0.94);
		border: 1px solid rgba(59, 130, 246, 0.45);
		border-radius: 8px;
		padding: 10px 10px 6px;
		min-width: 260px;
		max-width: 300px;
		/* Leave room for DEV / LANG / SOCIAL toggles above the panel. */
		max-height: calc(100vh - 120px);
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

	.dev-body section {
		margin-bottom: 10px;
	}
	.dev-body section:last-of-type {
		margin-bottom: 4px;
	}

	.dev-body h4 {
		margin: 0 0 4px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #93c5fd;
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
		margin: 4px 0 0;
		font-size: 9px;
		color: #64748b;
		text-align: center;
	}
</style>
