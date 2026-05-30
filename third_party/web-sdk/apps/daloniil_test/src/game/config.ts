// Cash Stacks (daloniil_test) — game config
// Lines-based slot, 5 reels x 5 rows, 25 paylines (smooth-only), 4 high + 4 low + Wild + Bonus.

const makePaddingReel = (symbols: string[]): { name: string }[] =>
	symbols.map((name) => ({ name }));

// Compact padding reels used only for spin animation (mock for Этап 1).
// Frequencies are illustrative — real reelstrips will come from math (Этап 2).
const BASE_PADDING_SYMBOLS: string[][] = [
	// reel 0
	['L1', 'L2', 'H4', 'L3', 'L4', 'H2', 'L1', 'L3', 'B', 'L2', 'H3', 'L4', 'L1', 'H1', 'L2', 'L3', 'L4', 'L1', 'H4', 'L2', 'L3', 'W', 'L1', 'L4', 'H3', 'L2', 'L1', 'L3', 'H2', 'L4'],
	// reel 1
	['L3', 'H2', 'L1', 'L4', 'L2', 'H3', 'L1', 'B', 'L3', 'L4', 'H1', 'L2', 'L1', 'L3', 'H4', 'L2', 'L4', 'L1', 'L3', 'H2', 'L2', 'W', 'L1', 'L4', 'H3', 'L3', 'L2', 'L4', 'L1', 'H1'],
	// reel 2
	['L2', 'L4', 'H1', 'L1', 'L3', 'H2', 'L2', 'L4', 'B', 'L1', 'H3', 'L3', 'L2', 'H4', 'L4', 'L1', 'L3', 'H1', 'L2', 'L4', 'W', 'L1', 'H2', 'L3', 'L2', 'L4', 'L1', 'H3', 'L3', 'L2'],
	// reel 3
	['L1', 'L3', 'H3', 'L2', 'L4', 'H1', 'L1', 'L3', 'B', 'L2', 'H2', 'L4', 'L1', 'L3', 'H4', 'L2', 'L4', 'L1', 'L3', 'H1', 'L2', 'W', 'L4', 'L1', 'H3', 'L3', 'L2', 'L4', 'H2', 'L1'],
	// reel 4
	['L2', 'H4', 'L4', 'L1', 'L3', 'H2', 'L2', 'L4', 'B', 'L1', 'H1', 'L3', 'L2', 'L4', 'H3', 'L1', 'L3', 'L2', 'L4', 'H4', 'L1', 'W', 'L3', 'L2', 'H2', 'L4', 'L1', 'L3', 'L2', 'H1'],
];

const FREE_PADDING_SYMBOLS: string[][] = [
	// FS reels — больше Bonus и Wild для retrigger через Ladder
	['L1', 'B', 'H3', 'L3', 'B', 'H1', 'L2', 'W', 'L4', 'B', 'H4', 'L1', 'L3', 'W', 'H2', 'L2', 'B', 'L4', 'H3', 'W', 'L1', 'L3', 'B', 'L2', 'H1', 'L4', 'W', 'L1', 'B', 'H4'],
	['L4', 'H2', 'B', 'L1', 'L3', 'B', 'H3', 'L2', 'W', 'L4', 'B', 'H1', 'L3', 'W', 'L1', 'H4', 'B', 'L2', 'W', 'L3', 'L4', 'B', 'L1', 'H2', 'W', 'L3', 'L2', 'B', 'H3', 'L4'],
	['L2', 'B', 'H1', 'L4', 'B', 'L1', 'H3', 'W', 'L3', 'B', 'H2', 'L2', 'W', 'H4', 'L4', 'B', 'L1', 'L3', 'W', 'B', 'H1', 'L2', 'W', 'L4', 'L1', 'B', 'H3', 'L3', 'W', 'L2'],
	['L3', 'H4', 'B', 'L2', 'B', 'L4', 'H1', 'W', 'L1', 'B', 'H2', 'L3', 'W', 'L2', 'L4', 'B', 'H3', 'L1', 'W', 'L3', 'B', 'L4', 'H4', 'W', 'L2', 'B', 'L1', 'L3', 'H1', 'W'],
	['L1', 'B', 'H2', 'L3', 'B', 'L2', 'H4', 'W', 'L4', 'B', 'H1', 'L1', 'W', 'L3', 'L2', 'B', 'H3', 'L4', 'W', 'L1', 'B', 'L3', 'H2', 'W', 'L2', 'B', 'L4', 'L1', 'H4', 'W'],
];

export default {
	providerName: 'sample_provider',
	gameName: 'daloniil_test',
	gameID: '0_0_daloniil_test',
	rtp: 0.9601,
	numReels: 5,
	numRows: [5, 5, 5, 5, 5],

	betModes: {
		base: {
			cost: 1.0,
			feature: true,
			buyBonus: false,
			rtp: 0.9601,
			max_win: 50000.0,
		},
		bonus_boost: {
			cost: 2.0,
			feature: true,
			buyBonus: false,
			rtp: 0.9601,
			max_win: 50000.0,
		},
		special_spins: {
			cost: 30.0,
			feature: true,
			buyBonus: false,
			rtp: 0.9601,
			max_win: 50000.0,
		},
		bonus_normal: {
			cost: 100.0,
			feature: false,
			buyBonus: true,
			rtp: 0.9601,
			max_win: 50000.0,
		},
		bonus_super: {
			cost: 200.0,
			feature: false,
			buyBonus: true,
			rtp: 0.9601,
			max_win: 50000.0,
		},
	},

	// 25 paylines (5×5, rows 0..4) — **MUST mirror math `game_config.py:paylines`
	// key-for-key**. Math emits `meta.lineIndex` = this key; PaylineOverlay looks
	// up rows via `config.paylines[String(lineIndex)]` to draw the visual line
	// across all reels. Any divergence between math and this map produces a
	// payline drawn through wrong cells (e.g. diagonal rendered as swoosh).
	// See math `third_party/math-sdk/games/0_0_daloniil_test/game_config.py` и
	// MATH_REDESIGN_PLAN.md §2.1 — все линии smooth (|Δ row| ≤ 1).
	paylines: {
		// Группа 1: 5 горизонталей
		'1': [0, 0, 0, 0, 0],
		'2': [1, 1, 1, 1, 1],
		'3': [2, 2, 2, 2, 2],
		'4': [3, 3, 3, 3, 3],
		'5': [4, 4, 4, 4, 4],
		// Группа 2: V «улыбка»
		'6': [0, 1, 2, 1, 0],
		'7': [1, 2, 3, 2, 1],
		'8': [2, 3, 4, 3, 2],
		// Группа 3: ^ «бровь»
		'9': [4, 3, 2, 3, 4],
		'10': [3, 2, 1, 2, 3],
		'11': [2, 1, 0, 1, 2],
		// Группа 4: диагонали
		'12': [0, 1, 2, 3, 4],
		'13': [4, 3, 2, 1, 0],
		// Группа 5: hooks край → центр
		'14': [0, 1, 2, 2, 2],
		'15': [4, 3, 2, 2, 2],
		'16': [2, 2, 2, 1, 0],
		'17': [2, 2, 2, 3, 4],
		// Группа 6: ступеньки от края
		'18': [0, 0, 1, 2, 2],
		'19': [4, 4, 3, 2, 2],
		'20': [2, 2, 1, 0, 0],
		'21': [2, 2, 3, 4, 4],
		// Группа 7: горизонталь с провалом в центр
		'22': [0, 1, 1, 1, 0],
		'23': [4, 3, 3, 3, 4],
		'24': [1, 0, 0, 0, 1],
		'25': [3, 4, 4, 4, 3],
	},

	symbols: {
		// Low symbols — все 4 одинаковые. 3-OAK УДАЛЁН (MATH_REDESIGN_PLAN §2.2 Опция A).
		// Зеркалит math `game_config.py:paytable`.
		L1: {
			paytable: [{ '5': 3.0 }, { '4': 0.5 }],
		},
		L2: {
			paytable: [{ '5': 3.0 }, { '4': 0.5 }],
		},
		L3: {
			paytable: [{ '5': 3.0 }, { '4': 0.5 }],
		},
		L4: {
			paytable: [{ '5': 3.0 }, { '4': 0.5 }],
		},
		// High symbols
		H4: {
			paytable: [{ '5': 30.0 }, { '4': 3.0 }, { '3': 0.7 }],
		},
		H3: {
			paytable: [{ '5': 45.0 }, { '4': 4.5 }, { '3': 1.2 }],
		},
		H2: {
			paytable: [{ '5': 75.0 }, { '4': 7.5 }, { '3': 1.8 }],
		},
		H1: {
			paytable: [{ '5': 150.0 }, { '4': 15.0 }, { '3': 3.0 }],
		},
		// Wild — платит только на 5-of-a-kind
		W: {
			paytable: [{ '5': 225.0 }],
			special_properties: ['wild'],
		},
		// Bonus — триггер FS, без line-pay
		B: {
			paytable: null,
			special_properties: ['bonus_trigger', 'collectible'],
		},
		// Mystery — sticky reel mask, раскрывается через mysteryReveal book-event
		M: {
			paytable: null,
			special_properties: ['mystery'],
		},
	},

	paddingReels: {
		basegame: BASE_PADDING_SYMBOLS.map(makePaddingReel),
		freegame: FREE_PADDING_SYMBOLS.map(makePaddingReel),
	},
};
