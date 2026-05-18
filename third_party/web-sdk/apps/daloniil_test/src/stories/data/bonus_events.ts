// Cash Stacks (daloniil_test) — bonus (FS) mock events.
// Те же сценарии, но в контексте FS. Все доски 5×5, символы — Cash Stacks.

const reel = (symbols: string[]) => symbols.map((name) => ({ name }));

const FS_BOARD_WITH_BONUS = [
	reel(['L2', 'L1', 'B', 'H2', 'L1']),
	reel(['B', 'L4', 'L2', 'H3', 'L4']),
	reel(['L3', 'L1', 'L3', 'B', 'L4']),
	reel(['H4', 'H3', 'L4', 'L2', 'L1']),
	reel(['H3', 'L3', 'L4', 'H1', 'B']),
];

export default {
	reveal: {
		type: 'reveal',
		board: FS_BOARD_WITH_BONUS,
		paddingPositions: [10, 20, 5, 15, 8],
		gameType: 'freegame',
		anticipation: [0, 0, 0, 0, 0],
	},
	// padded coords: visible row 2 → padded row 3 (см. SDK include_padding).
	// Max padded row = visible_rows + 1 = 5 при 5 visible rows.
	bonusCollect: {
		type: 'bonusCollect',
		positions: [
			{ reel: 0, row: 3 },
			{ reel: 1, row: 1 },
			{ reel: 2, row: 4 },
			{ reel: 4, row: 5 },
		],
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
	updateFreeSpin: {
		type: 'updateFreeSpin',
		amount: 1,
		total: 13,
	},
	// 5-of-a-kind H1 на visible row 2 (line 3 = [2,2,2,2,2]) → padded row 3
	winInfo: {
		type: 'winInfo',
		totalWin: 500,
		wins: [
			{
				symbol: 'H1',
				kind: 5,
				win: 500,
				positions: [
					{ reel: 0, row: 3 },
					{ reel: 1, row: 3 },
					{ reel: 2, row: 3 },
					{ reel: 3, row: 3 },
					{ reel: 4, row: 3 },
				],
				meta: {
					lineIndex: 3,
					multiplier: 1,
					winWithoutMult: 500,
					globalMult: 1,
					lineMultiplier: 1.0,
				},
			},
		],
	},
	freeSpinEnd: {
		type: 'freeSpinEnd',
		amount: 1200,
		winLevel: 3,
	},
};
