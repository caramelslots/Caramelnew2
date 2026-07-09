import config from './config';

export type PaylineGridCell = { active: boolean };

export type PaylineInfo = {
	lineIndex: number;
	rows: readonly number[];
	grid: PaylineGridCell[][];
};

/** Build 5×5 grid: grid[row][reel] — rows top→bottom, reels left→right. */
export const buildPaylineGrid = (rows: readonly number[]): PaylineGridCell[][] => {
	const grid: PaylineGridCell[][] = Array.from({ length: 5 }, () =>
		Array.from({ length: 5 }, () => ({ active: false })),
	);
	for (let reel = 0; reel < rows.length; reel++) {
		const row = rows[reel];
		grid[row][reel].active = true;
	}
	return grid;
};

export const getGameInfoPaylines = (): PaylineInfo[] =>
	Object.entries(config.paylines)
		.map(([key, rows]) => ({
			lineIndex: Number(key),
			rows,
			grid: buildPaylineGrid(rows),
		}))
		.sort((a, b) => a.lineIndex - b.lineIndex);
