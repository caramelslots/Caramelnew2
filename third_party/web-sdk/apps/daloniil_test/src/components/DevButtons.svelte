<!--
	DevButtons.svelte — дев-панель быстрых триггеров клиентских book-events.

	Использует те же примитивы, что и Storybook (см. ModeBase*Book*.stories.svelte):
	  - playBookEvent — одиночное событие (winInfo, setWin, freeSpinTrigger, …).
	  - playBet       — полный книжный сценарий (reveal → winInfo → setTotalWin …).
	  - playBookEvents — последовательность событий (reveal + winInfo вместе).

	Это НЕ ходит на RGS — события генерятся локально и идут прямо в
	bookEventHandlerMap, тот же путь что и при реальном спине. Поэтому Win
	панель, payline-оверлей, sound-effects, FS-intro/outro отрабатывают
	1:1 с продом.

	Toggle: Shift+D (раскладко-независимо через e.code). По умолчанию
	панель свёрнута до маленькой кнопки в верхнем-левом углу — чтобы не
	перекрывать игру. Дев-фича, мобильная вёрстка не оптимизирована.

	Совместима с DevCheats (Shift+E ×100 ускорение): можно ускорить ×100,
	потом нажать BIG WIN — count-up отыграет в 100 раз быстрее.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { stateBet, stateI18n } from 'state-shared';

	import { playBet, playBookEvent, playBookEvents } from '../game/utils';
	import { eventEmitter } from '../game/eventEmitter';
	import { devPreview } from '../game/devPreview.svelte';
	import { LANG_LABELS, setGameLanguage, STAKE_LOCALES } from '../game/devLang';
	import baseEvents from '../stories/data/base_events';
	import baseBooks from '../stories/data/base_books';
	import bonusBooks from '../stories/data/bonus_books';
	import { winLevelMap, type WinLevel } from '../game/winLevelMap';
	import type { BookEvent } from '../game/typesBookEvent';
	import type { GameType, RawSymbol } from '../game/types';
	import config from '../game/config';

	let open = $state(false);
	let langOpen = $state(false);
	let busy = $state(false);
	let fsCounterPreview = $state(false);

	/*
		Dev-only: bookEvents требует `index: number`, но storybook fixtures
		его не указывают, и handler-ы это поле не читают. Каст вместо ручной
		расстановки index по всем мокам.
	*/
	const asEvent = (raw: unknown) => raw as BookEvent;
	const asEvents = (raw: unknown[]) => raw.map(asEvent);

	/*
		Reel ожидает 7 ячеек (1 top padding + 5 visible + 1 bottom padding,
		см. INITIAL_BOARD в constants.ts и getSymbolY). Мок-события из
		base_events.ts/bonus_events.ts хранят только 5 visible — без обёртки
		символы рендерятся со сдвигом на 1 вверх, нижний ряд обрезается
		маской. padBoard добавляет padding-символы из config.paddingReels.

		Positions в мок-event'ах УЖЕ в padded-координатах (row=1..5 = visible
		0..4), так что после padding позиции совпадают с ячейками.
	*/
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

	/** bonusCollect для visible-доски (padded row = visibleRow + 1). */
	const bonusCollectForBoard = (visibleBoard: { name: string }[][]) => {
		const positions: { reel: number; row: number }[] = [];
		visibleBoard.forEach((reelSymbols, reelIndex) => {
			reelSymbols.forEach((sym, visibleRow) => {
				if (sym.name === 'B') positions.push({ reel: reelIndex, row: visibleRow + 1 });
			});
		});
		return asEvent({
			type: 'bonusCollect',
			positions,
			collectedTotal: positions.length,
			collectedDelta: positions.length,
		});
	};

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

	// === Win Levels (setWin) ===
	// Cash Stacks 4-tier rework: см. winLevelMap.ts и
	// math-sdk/games/0_0_daloniil_test/game_config.py (`get_win_level`).
	// `amount` — book-event units (BOOK_AMOUNT_MULTIPLIER=100 → 1x = 100).
	// Каждое демо-значение лежит в середине соответствующего диапазона
	// (по умолчанию проигрывается на ставке $1, так что 30x = $30 и т. д.).
	const x = 100; // 1x in book-event units
	const WIN_LEVEL_PRESETS: Array<{ level: WinLevel; amount: number; label: string }> = [
		{ level: 6, amount: 30 * x, label: 'BIG WIN (30x)' },
		{ level: 7, amount: 75 * x, label: 'SUPER WIN (75x)' },
		{ level: 8, amount: 175 * x, label: 'EPIC WIN (175x)' },
		{ level: 9, amount: 1000 * x, label: 'SENSATIONAL (1000x)' },
		{ level: 9, amount: 3000 * x, label: 'SENSATIONAL (3000x)' },
	];

	const playSetWin = (level: WinLevel, amount: number) =>
		guard(async () => {
			stateBet.winBookEventAmount = amount;
			await playBookEvent(asEvent({ type: 'setWin', amount, winLevel: level }), {
				bookEvents: [],
			});
		});

	// === Board reveal + payline win ===
	// 5×5 boards (visible only — paddingReels добавит padding через padBoard).
	// reveal сначала кладёт доску, потом winInfo рисует линию + анимирует
	// символы. Координаты в positions — padded (row=1..5 = visible 0..4).
	const reel = (symbols: string[]) => symbols.map((name) => ({ name }));

	// Top-row H1×3 (line 1 = [0,0,0,0,0] visible → padded row=1 на reels 0,1,2).
	const LINE_WIN_BOARD = [
		reel(['H1', 'L2', 'L4', 'H2', 'L1']),
		reel(['H1', 'L4', 'L2', 'H3', 'L4']),
		reel(['H1', 'L1', 'L3', 'H4', 'L4']),
		reel(['L2', 'H3', 'L4', 'L2', 'L1']),
		reel(['H3', 'L3', 'L4', 'H1', 'H1']),
	];

	// V-shape L1×5 (line 7 = [1,2,3,2,1] visible → padded [2,3,4,3,2]).
	// Доска специально подобрана так, чтобы L1 реально лежал на V-позициях.
	const V_SHAPE_BOARD = [
		reel(['L2', 'L1', 'L4', 'H2', 'L3']),
		reel(['H1', 'L4', 'L1', 'H3', 'L4']),
		reel(['L3', 'L2', 'L3', 'L1', 'H2']),
		reel(['H4', 'H3', 'L1', 'L2', 'L4']),
		reel(['H3', 'L1', 'L4', 'H1', 'L2']),
	];

	// 1×B по центру (reel 2, visible row=2 = padded row=3) — land-анимация.
	const SINGLE_BONUS_CAT_BOARD = [
		reel(['L2', 'L1', 'L4', 'H2', 'L1']),
		reel(['H1', 'L4', 'L2', 'H3', 'L4']),
		reel(['L3', 'L1', 'B', 'H4', 'L4']),
		reel(['H4', 'H3', 'L4', 'L2', 'L1']),
		reel(['H3', 'L3', 'L4', 'H1', 'H1']),
	];

	// Bonus-trigger: 3 × B (reels 0,1,2) → Normal Bonus FS.
	const FS_TRIGGER_BOARD = [
		reel(['L2', 'L1', 'B', 'H2', 'L1']),
		reel(['H1', 'B', 'L2', 'H3', 'L4']),
		reel(['L3', 'L1', 'L3', 'B', 'L4']),
		reel(['H4', 'H3', 'L4', 'L2', 'L1']),
		reel(['H3', 'L3', 'L4', 'H1', 'H1']),
	];

	// 4× B (reels 0..3) → Super Bonus FS (+ 1 starting mystery reel).
	const FS_TRIGGER_SUPER_BOARD = [
		reel(['L2', 'L1', 'B', 'H2', 'L1']),
		reel(['H1', 'B', 'L2', 'H3', 'L4']),
		reel(['L3', 'L1', 'L3', 'H4', 'B']),
		reel(['H4', 'H3', 'L4', 'L2', 'B']),
		reel(['H3', 'L3', 'L4', 'H1', 'H1']),
	];

	// 4×B для Bonus Collect (под Cash Stacks ladder-tier).
	const BONUS_COLLECT_BOARD = FS_TRIGGER_SUPER_BOARD;

	// 1 mystery reel (sticky на reel 0) — для mysteryReveal.
	const FS_MYSTERY_BOARD_1 = [
		reel(['M', 'M', 'M', 'M', 'M']),
		reel(['H1', 'L4', 'L2', 'H3', 'B']),
		reel(['L3', 'B', 'L3', 'H4', 'L4']),
		reel(['H4', 'H3', 'L4', 'L2', 'L1']),
		reel(['H3', 'L3', 'L4', 'H1', 'H1']),
	];

	// 3 sticky mystery reels — для super bonus mysteryReveal ×3.
	const FS_MYSTERY_BOARD_3 = [
		reel(['M', 'M', 'M', 'M', 'M']),
		reel(['M', 'M', 'M', 'M', 'M']),
		reel(['M', 'M', 'M', 'M', 'M']),
		reel(['H4', 'H3', 'L4', 'L2', 'L1']),
		reel(['H3', 'L3', 'L4', 'H1', 'H1']),
	];

	/*
		Mystery per-reel: M-стек кладётся только на указанный reelIndex,
		на остальных барабанах — нейтральная "обычная" комбинация без B,
		чтобы reveal не триггерил FS-intro и не было выигрышей по линиям.
		Каждая кнопка демонстрирует mysteryReveal на конкретной полосе.

		`revealedSymbol` подобран так, чтобы каждый reel раскрывался
		разным символом — полезно для визуальной проверки спайн-трэков
		`mid_multiplier_pay` (high/mid/low tier по MYSTERY_REVEAL_TIER).
	*/
	const NEUTRAL_REEL_FILL: string[][] = [
		['L1', 'L2', 'L3', 'L4', 'L1'],
		['L4', 'L3', 'L2', 'L1', 'L4'],
		['L2', 'L1', 'L4', 'L3', 'L2'],
		['L3', 'L4', 'L1', 'L2', 'L3'],
		['L1', 'L2', 'L3', 'L4', 'L1'],
	];

	const buildMysteryBoardForReel = (reelIndex: number) =>
		NEUTRAL_REEL_FILL.map((symbols, idx) =>
			idx === reelIndex ? reel(['M', 'M', 'M', 'M', 'M']) : reel(symbols),
		);

	// Тир раскрытия по reelIndex (см. MYSTERY_REVEAL_TIER в constants.ts).
	// 0→H2 (high), 1→H4 (high), 2→L1 (low), 3→W (high+wild_dynamite), 4→L3 (low).
	const MYSTERY_REVEAL_DEMO: Record<number, string> = {
		0: 'H2',
		1: 'H4',
		2: 'L1',
		3: 'W',
		4: 'L3',
	};
	const MYSTERY_REEL_INDICES = [0, 1, 2, 3, 4] as const;

	const playLineWin = () =>
		guard(async () => {
			await playBookEvents([reveal(LINE_WIN_BOARD), asEvent(baseEvents.winInfo)]);
		});

	const playVShapeWin = () =>
		guard(async () => {
			/*
				config.paylines['7'] = [1,2,3,2,1] — visible coords. PaylineOverlay
				добавляет +1 при отрисовке (см. PaylineOverlay.svelte:155). А
				positions в winInfo handler передаются как есть → должны быть в
				PADDED-координатах. Visible [1,2,3,2,1] = padded [2,3,4,3,2].
				В base_events.winInfoVShape positions расходятся с line 7 (там
				padded [1,2,3,2,1] = visible [0,1,2,1,0]) — поэтому линия и
				подсветка попадают на разные клетки. Строим event inline с
				корректными координатами.
			*/
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
								lineIndex: 7,
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

	// === Финальная доска + дождь монеток (для профайлинга лагов монеток) ===
	// reveal (доска с выигрышем) → winInfo (линия H1×3) → setWin (big win + монетки).
	// Используем тот же проверенный путь, что и playLineWin, плюс setWin, который
	// поднимает winShow/winUpdate → Win-панель с count-up и эмиттером WinCoins.
	// Sensational (level 9) — самый плотный и долгий дождь монеток
	// (presentDuration 30s, particle frequency 0.09), удобно ловить лаги.
	const playBoardWithCoins = (level: WinLevel, amount: number) =>
		guard(async () => {
			await playBookEvents([reveal(LINE_WIN_BOARD), asEvent(baseEvents.winInfo)]);
			stateBet.winBookEventAmount = amount;
			await playBookEvent(asEvent({ type: 'setWin', amount, winLevel: level }), {
				bookEvents: [],
			});
		});

	// === Free Spins ===
	const playFsTriggerNormal = () =>
		guard(async () => {
			await playBookEvents([
				reveal(FS_TRIGGER_BOARD),
				bonusCollectForBoard(FS_TRIGGER_BOARD),
				asEvent(baseEvents.freeSpinTrigger),
			]);
		});

	const playFsTriggerSuper = () =>
		guard(async () => {
			await playBookEvents([
				reveal(FS_TRIGGER_SUPER_BOARD),
				bonusCollectForBoard(FS_TRIGGER_SUPER_BOARD),
				asEvent({
					type: 'freeSpinTrigger',
					totalFs: 10,
					positions: [
						{ reel: 0, row: 3 },
						{ reel: 1, row: 2 },
						{ reel: 2, row: 5 },
						{ reel: 3, row: 5 },
					],
				}),
				asEvent(baseEvents.mysteryReelActivate),
			]);
		});

	const playFsCounterBump = () =>
		guard(() => playBookEvent(asEvent(baseEvents.updateFreeSpin), { bookEvents: [] }));

	const playFsEnd = (winLevel: WinLevel, amount: number) =>
		guard(() =>
			playBookEvent(asEvent({ type: 'freeSpinEnd', amount, winLevel }), { bookEvents: [] }),
		);

	/** Только доска «10 Free Spins» — без transition, звуков и смены UI. */
	const playFsIntroPreview = () =>
		guard(async () => {
			eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
			await eventEmitter.broadcastAsync({
				type: 'freeSpinIntroUpdate',
				totalFreeSpins: 10,
			});
			eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		});

	/** Toggle FS left counter panel (3 OF 10) for layout debug. */
	const playFsCounterPreview = () =>
		guard(() => {
			if (fsCounterPreview) {
				eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
				fsCounterPreview = false;
				return;
			}
			eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
			eventEmitter.broadcast({
				type: 'freeSpinCounterUpdate',
				current: 3,
				total: 10,
			});
			fsCounterPreview = true;
		});

	const playSingleBonusCat = () =>
		guard(async () => {
			await playBookEvent(reveal(SINGLE_BONUS_CAT_BOARD), { bookEvents: [] });
		});

	const playTripleBonusCat = () =>
		guard(async () => {
			await playBookEvents([
				reveal(FS_TRIGGER_BOARD),
				bonusCollectForBoard(FS_TRIGGER_BOARD),
			]);
		});

	const playQuadrupleBonusCat = () =>
		guard(async () => {
			await playBookEvents([
				reveal(FS_TRIGGER_SUPER_BOARD),
				bonusCollectForBoard(FS_TRIGGER_SUPER_BOARD),
			]);
		});

	// === Cash Stacks specifics ===
	const playBonusCollect = () =>
		guard(async () => {
			await playBookEvents([
				reveal(BONUS_COLLECT_BOARD),
				asEvent({
					type: 'bonusCollect',
					// padded coords: те же B-клетки, что в доске выше.
					positions: [
						{ reel: 0, row: 3 },
						{ reel: 1, row: 2 },
						{ reel: 2, row: 5 },
						{ reel: 3, row: 5 },
					],
					collectedTotal: 4,
					collectedDelta: 4,
				}),
			]);
		});

	const playLadderTierUp = () =>
		guard(() => playBookEvent(asEvent(baseEvents.ladderTierUp), { bookEvents: [] }));

	const playMysteryReelUnlockCelebration = () =>
		guard(() => playBookEvent(asEvent(baseEvents.mysteryReelUnlock), { bookEvents: [] }));

	const playMysteryReveal = () =>
		guard(async () => {
			await playBookEvents([
				reveal(FS_MYSTERY_BOARD_1, 'freegame'),
				asEvent(baseEvents.mysteryReveal),
			]);
		});

	const playMysteryRevealTriple = () =>
		guard(async () => {
			await playBookEvents([
				reveal(FS_MYSTERY_BOARD_3, 'freegame'),
				...asEvents(baseEvents.mysteryRevealTriple),
			]);
		});

	/*
		Один M-стек на выбранном барабане → mysteryReveal на нём же.
		Всё в padded-координатах (row 1..5 = visible 0..4); MYSTERY_REVEAL_TIER
		подбирает high/mid/low spine-clip автоматически по revealedSymbol.

		FS gameType (а не basegame) — потому что mysteryReveal handler в
		bookEventHandlerMap проигрывает spine-анимацию на reel mask, и в
		basegame reels-mask не активен (см. stateGame.mysteryReels).
	*/
	const playMysteryOnReel = (reelIndex: number) =>
		guard(async () => {
			const revealedSymbol = MYSTERY_REVEAL_DEMO[reelIndex] ?? 'H2';
			await playBookEvents([
				reveal(buildMysteryBoardForReel(reelIndex), 'freegame'),
				asEvent({
					type: 'mysteryReveal',
					revealedSymbol,
					positions: [1, 2, 3, 4, 5].map((row) => ({ reel: reelIndex, row })),
				}),
			]);
		});

	// === Full books (как Storybook MODE_BASE/book random) ===
	const playRandomBaseBook = () =>
		guard(async () => {
			const book = baseBooks[Math.floor(Math.random() * baseBooks.length)];
			// eslint-disable-next-line no-console
			console.log('[DEV] base book id=', book.id, 'payoutMult=', book.payoutMultiplier);
			await playBet({ ...book, state: book.events } as Parameters<typeof playBet>[0]);
		});

	const playRandomBonusBook = () =>
		guard(async () => {
			const book = bonusBooks[Math.floor(Math.random() * bonusBooks.length)];
			// eslint-disable-next-line no-console
			console.log('[DEV] bonus book id=', book.id, 'payoutMult=', book.payoutMultiplier);
			await playBet({ ...book, state: book.events } as Parameters<typeof playBet>[0]);
		});

	onMount(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			// Shift+D — раскладко-независимо через e.code.
			if (e.shiftKey && e.code === 'KeyD') {
				e.preventDefault();
				open = !open;
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});
</script>

<div class="dev-panel" class:dev-panel--open={open}>
	<button class="dev-toggle" onclick={() => (open = !open)} type="button">
		{open ? 'DEV ▴' : 'DEV ▾'}
	</button>

	<button
		class="dev-toggle lang-toggle"
		class:lang-toggle--open={langOpen}
		type="button"
		onclick={() => (langOpen = !langOpen)}
	>
		LANG {langOpen ? '▴' : '▾'} {stateI18n.i18n.locale.toUpperCase()}
	</button>

	{#if langOpen}
		<div class="lang-body">
			{#each STAKE_LOCALES as lang (lang)}
				<button
					type="button"
					class:active={stateI18n.i18n.locale === lang}
					onclick={() => setGameLanguage(lang)}
				>
					{LANG_LABELS[lang]}
				</button>
			{/each}
		</div>
	{/if}

	{#if open}
		<div class="dev-body">
			<section>
				<h4>Reel Speed</h4>
				<div class="grid">
					<button
						type="button"
						class:active={devPreview.slowReelScroll}
						title="Замедлить прокрутку барабанов до 0.5× (spin / pre-spin / bounce-back)"
						onclick={() => (devPreview.slowReelScroll = !devPreview.slowReelScroll)}
					>
						{devPreview.slowReelScroll ? 'Scroll: 0.5×' : 'Scroll: 1×'}
					</button>
				</div>
			</section>

			<section>
				<h4>Win Levels (setWin)</h4>
				<div class="grid">
					{#each WIN_LEVEL_PRESETS as preset (preset.label)}
						{@const meta = winLevelMap[preset.level]}
						<button
							type="button"
							disabled={busy}
							title={`level=${preset.level} alias=${meta.alias} type=${meta.type} amount=${preset.amount}`}
							onclick={() => playSetWin(preset.level, preset.amount)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
			</section>

			<section>
				<h4>Board Wins</h4>
				<div class="grid">
					<button
						type="button"
						disabled={busy}
						title="reveal → winInfo line 1 (H1×3 на верхнем ряду)"
						onclick={playLineWin}
					>
						Line Win (3-of-a-kind)
					</button>
					<button
						type="button"
						disabled={busy}
						title="reveal → winInfo line 7 (L1×5 V-shape)"
						onclick={playVShapeWin}
					>
						V-Shape Win (5-of-a-kind)
					</button>
				</div>
			</section>

			<section>
				<h4>Финальная доска + монетки (perf)</h4>
				<div class="grid">
					<button
						type="button"
						disabled={busy}
						title="reveal доски с выигрышем → дождь монеток (Sensational, ~30с) — для профайлинга лагов монеток"
						onclick={() => playBoardWithCoins(9, 1000 * x)}
					>
						Board + Coin Rain
					</button>
					<button
						type="button"
						disabled={busy}
						title="reveal доски с выигрышем → монетки (Big Win, ~7с)"
						onclick={() => playBoardWithCoins(6, 30 * x)}
					>
						Board + Coins (Big)
					</button>
				</div>
			</section>

			<section>
				<h4>Free Spins</h4>
				<div class="grid">
					<button
						type="button"
						disabled={busy}
						class:active={fsCounterPreview}
						title="Toggle FS left counter panel (3 OF 10)"
						onclick={playFsCounterPreview}
					>
						{fsCounterPreview ? 'FS Counter: ON' : 'FS Left Counter'}
					</button>
					<button
						type="button"
						disabled={busy}
						title="Только доска поздравления «10 Free Spins» (без transition и звуков)"
						onclick={playFsIntroPreview}
					>
						FS Intro Board
					</button>
					<button
						type="button"
						disabled={busy}
						title="3× B → Normal Bonus FS intro"
						onclick={playFsTriggerNormal}
					>
						FS Normal (3 B)
					</button>
					<button
						type="button"
						disabled={busy}
						title="4× B → Super Bonus FS intro + 1 mystery reel"
						onclick={playFsTriggerSuper}
					>
						FS Super (4 B)
					</button>
					<button
						type="button"
						disabled={busy}
						title="updateFreeSpin: current+1 / total"
						onclick={playFsCounterBump}
					>
						FS Counter +1
					</button>
					<button
						type="button"
						disabled={busy}
						title="freeSpinEnd с медленным count-up (level=3 small)"
						onclick={() => playFsEnd(3, 1200)}
					>
						FS End (Small)
					</button>
					<button
						type="button"
						disabled={busy}
						title="freeSpinEnd с big-win-анимацией (level=6)"
						onclick={() => playFsEnd(6, 75_000)}
					>
						FS End (B)
					</button>
				</div>
			</section>

			<section>
				<h4>Bonus Bar Preview</h4>
				<div class="grid">
					<button
						type="button"
						class:active={devPreview.ladder}
						title="Показать/скрыть прогресс-бар бонусов поверх игры (dev)"
						onclick={() => (devPreview.ladder = !devPreview.ladder)}
					>
						{devPreview.ladder ? 'Bonus Bar: ON' : 'Bonus Bar: OFF'}
					</button>
					<button
						type="button"
						disabled={!devPreview.ladder}
						title="Сколько котиков залито (0..4)"
						onclick={() => (devPreview.ladderFilled = (devPreview.ladderFilled + 1) % 5)}
					>
						Cats: {devPreview.ladderFilled}/4
					</button>
					<button
						type="button"
						disabled={!devPreview.ladder}
						class:active={devPreview.ladder && devPreview.ladderHorizontal}
						title="Переключить вертикальный / горизонтальный бар"
						onclick={() => (devPreview.ladderHorizontal = !devPreview.ladderHorizontal)}
					>
						{devPreview.ladderHorizontal ? 'Bar: Horizontal' : 'Bar: Vertical'}
					</button>
				</div>
			</section>

			<section>
				<h4>Cash Stacks</h4>
				<div class="grid">
					<button
						type="button"
						disabled={busy}
						title="reveal с 1× B по центру — land-анимация бонус-кота"
						onclick={playSingleBonusCat}
					>
						1× Bonus Cat
					</button>
					<button
						type="button"
						disabled={busy}
						title="reveal с 3× B — land-анимация (Normal Bonus trigger board)"
						onclick={playTripleBonusCat}
					>
						3× Bonus Cat
					</button>
					<button
						type="button"
						disabled={busy}
						title="reveal с 4× B — land-анимация (Super Bonus trigger board)"
						onclick={playQuadrupleBonusCat}
					>
						4× Bonus Cat
					</button>
					<button
						type="button"
						disabled={busy}
						title="reveal → bonusCollect ×4 (триггер ladder)"
						onclick={playBonusCollect}
					>
						Bonus Collect ×4
					</button>
					<button type="button" disabled={busy} onclick={playLadderTierUp}>Ladder Tier Up</button>
					<button
						type="button"
						disabled={busy}
						title="mysteryReelUnlock: поздравление +3 FS при tier-up Progress Ladder"
						onclick={playMysteryReelUnlockCelebration}
					>
						+3 FS Celebration
					</button>
					<button
						type="button"
						disabled={busy}
						title="1 sticky reel reveal → H2"
						onclick={playMysteryReveal}
					>
						Mystery Reveal (1 reel)
					</button>
					<button
						type="button"
						disabled={busy}
						title="3 sticky reels параллельный reveal (super bonus)"
						onclick={playMysteryRevealTriple}
					>
						Mystery Reveal ×3
					</button>
				</div>
			</section>

			<section>
				<h4>Mystery (per reel)</h4>
				<div class="grid">
					{#each MYSTERY_REEL_INDICES as reelIndex (reelIndex)}
						{@const revealedSymbol = MYSTERY_REVEAL_DEMO[reelIndex] ?? 'H2'}
						<button
							type="button"
							disabled={busy}
							title={`reveal с M-стеком на reel ${reelIndex} → mysteryReveal раскрывает ${revealedSymbol}`}
							onclick={() => playMysteryOnReel(reelIndex)}
						>
							Mystery {reelIndex + 1}
						</button>
					{/each}
				</div>
			</section>

			<section>
				<h4>Full Books</h4>
				<div class="grid">
					<button
						type="button"
						disabled={busy}
						title={`${baseBooks.length} base books`}
						onclick={playRandomBaseBook}
					>
						Random Base Book
					</button>
					<button
						type="button"
						disabled={busy}
						title={`${bonusBooks.length} bonus books (FS)`}
						onclick={playRandomBonusBook}
					>
						Random Bonus Book
					</button>
				</div>
			</section>

			<p class="hint">Shift+D — toggle · Shift+E — ×100 speed</p>
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
		min-width: 240px;
		max-width: 280px;
		max-height: calc(100vh - 60px);
		overflow-y: auto;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
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
