/**
 * Cat Mafia Stage B / C / D — mock book events (5×4 visible boards).
 * Positions use padded rows (visible row r → padded row r+1).
 */

import type {
	BookEventBulletCollect,
	BookEventPawCoinResolve,
	BookEventSuperWildExpand,
	BookEventTargetShootRound,
} from '../../game/typesBookEvent';

/** Visible board: L1, P, H1, L2, W on row 0 (bet× = 10 → 70 coin win). */
export const PAW_DEMO_VISIBLE_BOARD = [
	[{ name: 'L1' }, { name: 'L3' }, { name: 'L4' }, { name: 'H2' }],
	[{ name: 'P' }, { name: 'L4' }, { name: 'L2' }, { name: 'H3' }],
	[{ name: 'H1' }, { name: 'L1' }, { name: 'L3' }, { name: 'H4' }],
	[{ name: 'L2' }, { name: 'H3' }, { name: 'L4' }, { name: 'L2' }],
	[{ name: 'W' }, { name: 'L3' }, { name: 'L4' }, { name: 'H1' }],
] as const;

/** Visible board with SW×4 on reel 2 that participates in a top-line win. */
export const SW_DEMO_VISIBLE_BOARD = [
	[{ name: 'H2' }, { name: 'L1' }, { name: 'L3' }, { name: 'L4' }],
	[{ name: 'H2' }, { name: 'L2' }, { name: 'L4' }, { name: 'L1' }],
	[{ name: 'SW', wild: true, multiplier: 4 }, { name: 'L3' }, { name: 'H4' }, { name: 'L2' }],
	[{ name: 'H2' }, { name: 'L4' }, { name: 'L1' }, { name: 'L3' }],
	[{ name: 'H2' }, { name: 'L1' }, { name: 'L2' }, { name: 'H3' }],
] as const;

/** betAmount=10 → Low×1 + Paw×0 + High×2 + Low×1 + Wild×3 = 70 */
export const pawCoinResolveDemo = {
	type: 'pawCoinResolve',
	paws: [{ reel: 1, row: 1 }],
	rows: [
		{
			row: 1,
			cells: [
				{ reel: 0, from: 'L1', coinTier: 1, win: 10 },
				{ reel: 1, from: 'P', coinTier: 0, win: 0 },
				{ reel: 2, from: 'H1', coinTier: 2, win: 20 },
				{ reel: 3, from: 'L2', coinTier: 1, win: 10 },
				{ reel: 4, from: 'W', coinTier: 3, win: 30 },
			],
		},
	],
	totalCoinWin: 70,
} satisfies Omit<BookEventPawCoinResolve, 'index'>;

export const superWildExpandDemo = {
	type: 'superWildExpand',
	expands: [{ reel: 2, row: 1, mult: 4 }],
	productMult: 4,
} satisfies Omit<BookEventSuperWildExpand, 'index'>;

/** 5×4 board with 3× B for natural FS trigger. */
export const FS_TRIGGER_VISIBLE_BOARD = [
	[{ name: 'L2' }, { name: 'B' }, { name: 'H2' }, { name: 'L1' }],
	[{ name: 'H1' }, { name: 'L4' }, { name: 'B' }, { name: 'H3' }],
	[{ name: 'L3' }, { name: 'L1' }, { name: 'H4' }, { name: 'B' }],
	[{ name: 'H4' }, { name: 'H3' }, { name: 'L4' }, { name: 'L2' }],
	[{ name: 'H3' }, { name: 'L3' }, { name: 'L4' }, { name: 'H1' }],
] as const;

/** Predetermined layout; player click is cosmetic. awardedFs = 10. */
export const freeSpinTargetPickDemo = {
	type: 'freeSpinTargetPick',
	targets: [12, 8, 10, 8, 12, 10],
	chosenIndex: 2,
	awardedFs: 10,
} as const;

export const freeSpinTriggerFromPick = {
	type: 'freeSpinTrigger',
	totalFs: 10,
	positions: [
		{ reel: 0, row: 2 },
		{ reel: 1, row: 3 },
		{ reel: 2, row: 4 },
	],
} as const;

/** FS board with one BT (no paw). */
export const FS_BULLET_VISIBLE_BOARD = [
	[{ name: 'L2' }, { name: 'H1' }, { name: 'L3' }, { name: 'L1' }],
	[{ name: 'H2' }, { name: 'BT' }, { name: 'L4' }, { name: 'H3' }],
	[{ name: 'L1' }, { name: 'L3' }, { name: 'H4' }, { name: 'L2' }],
	[{ name: 'H4' }, { name: 'L2' }, { name: 'L1' }, { name: 'H1' }],
	[{ name: 'L3' }, { name: 'H3' }, { name: 'L4' }, { name: 'L2' }],
] as const;

/** FS board with SW×4 (Normal always expands / Super pre-opens). */
export const FS_SW_VISIBLE_BOARD = [
	[{ name: 'H2' }, { name: 'L1' }, { name: 'L3' }, { name: 'L4' }],
	[{ name: 'L2' }, { name: 'H3' }, { name: 'L4' }, { name: 'L1' }],
	[{ name: 'SW', wild: true, multiplier: 4 }, { name: 'L3' }, { name: 'H4' }, { name: 'L2' }],
	[{ name: 'H1' }, { name: 'L4' }, { name: 'L1' }, { name: 'L3' }],
	[{ name: 'L3' }, { name: 'L1' }, { name: 'L2' }, { name: 'H3' }],
] as const;

export const bulletCollectDemo = (drumCount: number, bullets = [{ reel: 1, row: 2 }]) =>
	({
		type: 'bulletCollect',
		bullets,
		drumCount,
	}) satisfies Omit<BookEventBulletCollect, 'index'>;

export const fsSuperWildExpandDemo = {
	type: 'superWildExpand',
	expands: [{ reel: 2, row: 1, mult: 4 }],
	productMult: 4,
} satisfies Omit<BookEventSuperWildExpand, 'index'>;

/** 3 shots → +1 + empty +2 = +3 extra FS. */
export const targetShootRoundDemo = {
	type: 'targetShootRound',
	shots: [
		{ targetIndex: 1, reward: 1 },
		{ targetIndex: 4, reward: 0 },
		{ targetIndex: 7, reward: 2 },
	],
	extraFs: 3,
} satisfies Omit<BookEventTargetShootRound, 'index'>;

/** Empty drum / all blanks — no extra FS. */
export const targetShootRoundEmptyDemo = {
	type: 'targetShootRound',
	shots: [
		{ targetIndex: 0, reward: 0 },
		{ targetIndex: 3, reward: 0 },
	],
	extraFs: 0,
} satisfies Omit<BookEventTargetShootRound, 'index'>;
