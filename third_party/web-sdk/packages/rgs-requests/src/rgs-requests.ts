import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { rgsFetcher } from 'rgs-fetcher';

export * from './types';

export const requestAuthenticate = async (options: {
	sessionID: string;
	rgsUrl: string;
	language: string;
}) => {
	const data = await rgsFetcher.post({
		rgsUrl: options.rgsUrl,
		url: '/wallet/authenticate',
		variables: {
			sessionID: options.sessionID,
			language: options.language,
		},
	});

	return data;
};

export const requestEndRound = async (options: {
	sessionID: string;
	rgsUrl: string;
}) => {
	const data = await rgsFetcher.post({
		rgsUrl: options.rgsUrl,
		url: '/wallet/end-round',
		variables: {
			sessionID: options.sessionID,
		},
	});

	return data;
};

export const requestEndEvent = async (options: {
	sessionID: string;
	eventIndex: number;
	rgsUrl: string;
}) => {
	const data = await rgsFetcher.post({
		rgsUrl: options.rgsUrl,
		url: '/bet/event',
		variables: {
			sessionID: options.sessionID,
			event: `${options.eventIndex}`,
		},
	});

	return data;
};

export const requestBet = async (options: {
	sessionID: string;
	currency: string;
	amount: number;
	mode: string;
	rgsUrl: string;
}) => {
	const data = await rgsFetcher.post({
		rgsUrl: options.rgsUrl,
		url: '/wallet/play',
		variables: {
			mode: options.mode,
			currency: options.currency,
			sessionID: options.sessionID,
			amount: options.amount * API_AMOUNT_MULTIPLIER,
		},
	});

	return data;
};

export const requestReplay = async (options: {
	game: string;
	version: string;
	mode: string;
	event: string;
	rgsUrl: string;
	/** Operator `?lang=` — passed so replay copy / book text resolve in the same locale. */
	language?: string;
}) => {
	const languageQuery = options.language
		? `?language=${encodeURIComponent(options.language)}`
		: '';
	const data = await rgsFetcher.get({
		rgsUrl: options.rgsUrl,
		// @ts-ignore TODO: update the schema.ts
		url: `/bet/replay/${options.game}/${options.version}/${options.mode}/${options.event}${languageQuery}`,
	});

	return data;
};

/**
 * Playable bet shape extracted from a `/bet/replay/...` response.
 * Matches `authenticate` / `play` `round` so resumeBet → playBet can consume it.
 */
export type ReplayRound = {
	state: unknown[];
	amount?: number;
	payout?: number;
	payoutMultiplier?: number;
	mode?: string;
	event?: string | null;
	active?: boolean;
	roundID?: number | string;
	[key: string]: unknown;
};

/**
 * Stake Engine replay responses are usually `{ round: { state, ... }, status }`.
 * Some docs/clients flatten `state` / `payoutMultiplier` at the top level, and
 * math books may expose the stream as `events` instead of `state`.
 */
export const normalizeReplayRound = (data: unknown): ReplayRound | null => {
	if (!data || typeof data !== 'object') return null;
	const root = data as Record<string, unknown>;
	if (root.error) return null;

	const status = root.status as { statusCode?: string } | undefined;
	if (status?.statusCode && status.statusCode !== 'SUCCESS') return null;

	const candidate =
		root.round && typeof root.round === 'object'
			? (root.round as Record<string, unknown>)
			: root;

	const stateRaw = candidate.state ?? candidate.events;
	if (!Array.isArray(stateRaw) || stateRaw.length === 0) return null;

	return {
		...candidate,
		state: stateRaw as unknown[],
	};
};