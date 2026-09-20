/**
 * Buy-bonus card HTML SpinePlayers (frame + normal mascot).
 * Keep WebGL warm across menu open/close; drop only on feature eviction.
 *
 * Confirm reparents the menu portal (no second SpinePlayers). Ready flags
 * stay ref-counted so overlay remounts during warm park do not flicker.
 */
import type { SpinePlayer } from '@esotericsoftware/spine-player';

import { loseWebglCanvas } from './duelPickGpu';

const livePlayers = new Set<SpinePlayer>();

/** Ref-count of live ready reporters per card key (`normal` | `super` | `duel`). */
const readyCounts = new Map<string, number>();
const readyListeners = new Set<() => void>();

const notifyReady = () => {
	for (const listener of readyListeners) listener();
};

export const disposeBuyBonusCardSpinePlayer = (player: SpinePlayer | undefined) => {
	if (!player) return;
	livePlayers.delete(player);
	loseWebglCanvas(player.canvas);
	try {
		player.dispose();
	} catch {
		/* already disposed */
	}
};

export const trackBuyBonusCardSpinePlayer = (player: SpinePlayer) => {
	livePlayers.add(player);
};

/** Live HTML SpinePlayers for the debug memory bar (canvas + atlas VRAM). */
export const getLiveBuyBonusCardSpinePlayers = (): readonly SpinePlayer[] => [...livePlayers];

export const releaseAllBuyBonusCardSpinePlayers = () => {
	for (const player of [...livePlayers]) disposeBuyBonusCardSpinePlayer(player);
	livePlayers.clear();
	readyCounts.clear();
	notifyReady();
};

/** Normal card hosts white mascot SpinePlayer — don't Assets.unload that atlas. */
export const isBuyBonusCardSpineGpuLive = () => livePlayers.size > 0;

export const setBuyBonusCardReady = (cardKey: string, ready: boolean) => {
	const prev = readyCounts.get(cardKey) ?? 0;
	const next = Math.max(0, prev + (ready ? 1 : -1));
	if (next === 0) readyCounts.delete(cardKey);
	else readyCounts.set(cardKey, next);
	if ((prev > 0) === (next > 0)) return;
	notifyReady();
};

export const areBuyBonusMenuCardsReady = () =>
	(readyCounts.get('normal') ?? 0) > 0 &&
	(readyCounts.get('super') ?? 0) > 0 &&
	(readyCounts.get('duel') ?? 0) > 0;

export const subscribeBuyBonusCardsReady = (listener: () => void) => {
	readyListeners.add(listener);
	return () => {
		readyListeners.delete(listener);
	};
};
