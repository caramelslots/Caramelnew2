// Cash Stacks (daloniil_test) — mock book-events для Storybook.
// 5 reels × 5 rows. Padding-positions используются для spin-animation
// (stride внутри padding-reels из config.ts). Здесь — стартовые мок-значения.

const reel = (symbols: string[]) => symbols.map((name) => ({ name }));

// Стандартная стартовая доска (5×5).
const STARTING_BOARD = [
	reel(['L2', 'L1', 'L4', 'H2', 'L1']),
	reel(['H1', 'L4', 'L2', 'H3', 'L4']),
	reel(['L3', 'L1', 'L3', 'H4', 'L4']),
	reel(['H4', 'H3', 'L4', 'L2', 'L1']),
	reel(['H3', 'L3', 'L4', 'H1', 'H1']),
];

// Доска с 3-of-a-kind на line 1 (top row).
const BOARD_LINE_WIN = [
	reel(['H1', 'L2', 'L4', 'H2', 'L1']),
	reel(['H1', 'L4', 'L2', 'H3', 'L4']),
	reel(['H1', 'L1', 'L3', 'H4', 'L4']),
	reel(['L2', 'H3', 'L4', 'L2', 'L1']),
	reel(['H3', 'L3', 'L4', 'H1', 'H1']),
];

// Доска с триггером FS (3+ Bonus символов).
const BOARD_FS_TRIGGER = [
	reel(['L2', 'L1', 'B', 'H2', 'L1']),
	reel(['H1', 'B', 'L2', 'H3', 'L4']),
	reel(['L3', 'L1', 'L3', 'B', 'L4']),
	reel(['H4', 'H3', 'L4', 'L2', 'L1']),
	reel(['H3', 'L3', 'L4', 'H1', 'H1']),
];

// Доска во время FS с Mystery символами на 1 барабане (sticky).
const BOARD_FS_WITH_MYSTERY = [
	reel(['M', 'M', 'M', 'M', 'M']),
	reel(['H1', 'L4', 'L2', 'H3', 'B']),
	reel(['L3', 'B', 'L3', 'H4', 'L4']),
	reel(['H4', 'H3', 'L4', 'L2', 'L1']),
	reel(['H3', 'L3', 'L4', 'H1', 'H1']),
];

export default {
	reveal: {
		type: 'reveal',
		board: STARTING_BOARD,
		paddingPositions: [10, 20, 5, 15, 8],
		gameType: 'basegame',
		anticipation: [0, 0, 0, 0, 0],
	},
	revealLineWin: {
		type: 'reveal',
		board: BOARD_LINE_WIN,
		paddingPositions: [10, 20, 5, 15, 8],
		gameType: 'basegame',
		anticipation: [0, 0, 0, 0, 0],
	},
	revealFsTrigger: {
		type: 'reveal',
		board: BOARD_FS_TRIGGER,
		paddingPositions: [10, 20, 5, 15, 8],
		gameType: 'basegame',
		anticipation: [0, 0, 0, 0, 0],
	},
	revealFsMystery: {
		type: 'reveal',
		board: BOARD_FS_WITH_MYSTERY,
		paddingPositions: [10, 20, 5, 15, 8],
		gameType: 'freegame',
		anticipation: [0, 0, 0, 0, 0],
	},
	setTotalWin: {
		type: 'setTotalWin',
		amount: 1000,
	},
	finalWin: {
		type: 'finalWin',
		amount: 0,
	},
	freeSpinTrigger: {
		type: 'freeSpinTrigger',
		totalFs: 10,
		// padded coords: row=1..5 = visible rows 0..4 (см. SDK include_padding)
		positions: [
			{ reel: 0, row: 3 },
			{ reel: 1, row: 2 },
			{ reel: 2, row: 4 },
		],
	},
	updateFreeSpin: {
		type: 'updateFreeSpin',
		amount: 1,
		total: 10,
	},
	// Выигрыш по линии 1 (top horizontal): H1×3 на reels 0,1,2 visible row 0.
	// SDK math-events эмитят padded row (см. include_padding), поэтому row=1.
	winInfo: {
		type: 'winInfo',
		totalWin: 200,
		wins: [
			{
				symbol: 'H1',
				kind: 3,
				win: 200,
				positions: [
					{ reel: 0, row: 1 },
					{ reel: 1, row: 1 },
					{ reel: 2, row: 1 },
				],
				meta: {
					lineIndex: 1,
					multiplier: 1,
					winWithoutMult: 200,
					globalMult: 1,
					lineMultiplier: 1.0,
				},
			},
		],
	},
	// V-shape выигрыш на линии 7 (visible rows [0,1,2,1,0] → padded [1,2,3,2,1])
	winInfoVShape: {
		type: 'winInfo',
		totalWin: 50,
		wins: [
			{
				symbol: 'L1',
				kind: 5,
				win: 100,
				positions: [
					{ reel: 0, row: 1 },
					{ reel: 1, row: 2 },
					{ reel: 2, row: 3 },
					{ reel: 3, row: 2 },
					{ reel: 4, row: 1 },
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
	},
	setWin: {
		type: 'setWin',
		amount: 200,
		winLevel: 2,
	},
	freeSpinEnd: {
		type: 'freeSpinEnd',
		amount: 1200,
		winLevel: 3,
	},
	// === Cash Stacks specific ===
	// SDK math-events: positions всегда в padded coords (visible row+1).
	bonusCollect: {
		type: 'bonusCollect',
		positions: [
			{ reel: 0, row: 3 },
			{ reel: 1, row: 2 },
		],
		collectedTotal: 2,
		collectedDelta: 2,
	},
	bonusCollectTrigger4: {
		type: 'bonusCollect',
		positions: [
			{ reel: 0, row: 3 },
			{ reel: 1, row: 2 },
			{ reel: 2, row: 4 },
			{ reel: 3, row: 5 },
		],
		// row: 5 = последняя видимая (visible row 4) при 5 рядах + 1 top padding.
		collectedTotal: 4,
		collectedDelta: 4,
	},
	ladderTierUp: {
		type: 'ladderTierUp',
		previousTier: 0,
		newTier: 1,
		rewardSpins: 3,
		rewardedMysteryReels: 1,
	},
	mysteryReelActivate: {
		type: 'mysteryReelActivate',
		reels: [2],
		persistent: true,
	},
	// Super Bonus стартует с 3 Mystery Reels (см. game_config.py).
	mysteryReelActivateX4: {
		type: 'mysteryReelActivate',
		reels: [0, 1, 2],
		persistent: true,
	},
	mysteryReveal: {
		type: 'mysteryReveal',
		revealedSymbol: 'H2',
		// padded coords: rows 1..5 = visible rows 0..4 (всех 5 cells на reel 0)
		positions: [
			{ reel: 0, row: 1 },
			{ reel: 0, row: 2 },
			{ reel: 0, row: 3 },
			{ reel: 0, row: 4 },
			{ reel: 0, row: 5 },
		],
	},
	// Три подряд mysteryReveal — клиент батчит в один параллельный reveal (super bonus).
	mysteryRevealTriple: [
		{
			type: 'mysteryReveal',
			revealedSymbol: 'H2',
			positions: [
				{ reel: 0, row: 1 },
				{ reel: 0, row: 2 },
				{ reel: 0, row: 3 },
				{ reel: 0, row: 4 },
				{ reel: 0, row: 5 },
			],
		},
		{
			type: 'mysteryReveal',
			revealedSymbol: 'L3',
			positions: [
				{ reel: 1, row: 1 },
				{ reel: 1, row: 2 },
				{ reel: 1, row: 3 },
				{ reel: 1, row: 4 },
				{ reel: 1, row: 5 },
			],
		},
		{
			type: 'mysteryReveal',
			revealedSymbol: 'W',
			positions: [
				{ reel: 2, row: 1 },
				{ reel: 2, row: 2 },
				{ reel: 2, row: 3 },
				{ reel: 2, row: 4 },
				{ reel: 2, row: 5 },
			],
		},
	],
};
