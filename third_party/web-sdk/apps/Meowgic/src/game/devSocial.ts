import { stateUrlDerived } from 'state-shared';

/** Current social mode from `?social=true` (same flag Stake.us uses). */
export const isSocialMode = () => stateUrlDerived.social();

/** Dev-only: toggle social mode via URL param and reload so i18n picks up social strings. */
export const setGameSocialMode = (enabled: boolean) => {
	const url = new URL(window.location.href);
	if (enabled) url.searchParams.set('social', 'true');
	else url.searchParams.delete('social');
	window.location.assign(url.toString());
};
