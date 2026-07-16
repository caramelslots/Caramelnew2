import { stateMeta } from 'state-shared';

import { i18nDerived } from '../i18n/i18nDerived';

/**
 * Replay Mode row — use the same player-facing names as in-game bet modes
 * (Base, Bonus Boost, …), never raw API keys like `BASE` or `bonus_boost`.
 */
export const getReplayModeLabel = (modeKey: string): string => {
	const normalized = modeKey.trim();
	const meta =
		stateMeta.betModeMeta?.[normalized] ??
		stateMeta.betModeMeta?.[normalized.toUpperCase()] ??
		stateMeta.betModeMeta?.[normalized.toLowerCase()];

	const title = meta?.text?.title?.trim();
	if (title) return title;

	if (normalized.toLowerCase() === 'base') return i18nDerived.replayModeBase();
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

export const formatReplayMultiplier = (value: number): string => {
	if (!Number.isFinite(value)) return '0x';
	if (Number.isInteger(value)) return `${value}x`;
	const formatted = value
		.toLocaleString('en', { maximumFractionDigits: 6, useGrouping: false })
		.replace(/(\.\d*?[1-9])0+$/, '$1')
		.replace(/\.0+$/, '');
	return `${formatted}x`;
};
