import { waitForTimeout } from 'utils-shared/wait';

export type GameSpeedLevel = 1 | 2 | 3;

/** Turbo 1 = normal, Turbo 2 = 1.5×, Turbo 3 = 2× (animations + reel scroll). */
const GAME_SPEED_MULT: Record<GameSpeedLevel, number> = {
	1: 1,
	2: 1.5,
	3: 2,
};

export const gameSpeedMultFor = (level: GameSpeedLevel): number => GAME_SPEED_MULT[level];

/** SDK `fast` spin + skip pre-spin / stop — only Turbo 3. Turbo 2 keeps normal reel scroll at 1.2×. */
export const isSdkTurboSpin = (level: GameSpeedLevel): boolean => level === 3;

export const scaleMsByGameSpeed = (ms: number, level: GameSpeedLevel): number =>
	Math.max(0, Math.round(ms / gameSpeedMultFor(level)));

export const waitForGameSpeed = (ms: number, level: GameSpeedLevel) =>
	waitForTimeout(scaleMsByGameSpeed(ms, level));
