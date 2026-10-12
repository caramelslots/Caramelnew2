import { stateMeta } from 'state-shared';

import { i18nDerived } from '../i18n/i18nDerived';

/**
 * Replay Mode row — use the same player-facing names as in-game bet modes
 * (Base, Bonus Boost, …), never raw API keys like `BASE` or `bonus_boost`.
 */
export const getReplayModeLabel = (modeKey: string): string => {
	const normalized = modeKey.trim();
	// Prefer i18n "Base" over meta / raw `BASE` keys.
	if (normalized.toLowerCase() === 'base') return i18nDerived.replayModeBase();

	const meta =
		stateMeta.betModeMeta?.[normalized] ??
		stateMeta.betModeMeta?.[normalized.toUpperCase()] ??
		stateMeta.betModeMeta?.[normalized.toLowerCase()];

	const title = meta?.text?.title?.trim();
	if (title) return title;

	return normalized;
};

export const lookupReplayCostMultiplier = (modeKey: string): number => {
	const normalized = modeKey.trim();
	const meta =
		stateMeta.betModeMeta?.[normalized] ??
		stateMeta.betModeMeta?.[normalized.toUpperCase()] ??
		stateMeta.betModeMeta?.[normalized.toLowerCase()];
	const cost = meta?.costMultiplier;
	return typeof cost === 'number' && cost > 0 ? cost : 1;
};

/** Cost / payout multipliers — exact value as received, no rounding. */
export const formatReplayMultiplier = (value: number): string => {
	if (!Number.isFinite(value)) return '0x';
	// Avoid toLocaleString rounding — print the number’s own decimal representation.
	return `${String(value)}x`;
};
