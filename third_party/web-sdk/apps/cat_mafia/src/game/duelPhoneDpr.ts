/** Matches Game.svelte GameApp maxResolution + InitialiseApplication phone portrait cap. */
export const GAME_MAX_RESOLUTION = 3;
export const PHONE_PORTRAIT_MAX_DPR = 2.5;
export const DUEL_PHONE_MAX_DPR = 2;
/** @deprecated Main / buy-bonus / loader tickers are uncapped (device refresh rate). */
export const PHONE_TICKER_MAX_FPS = 0;

export const phonePortraitMaxDpr = () =>
	Math.min(GAME_MAX_RESOLUTION, PHONE_PORTRAIT_MAX_DPR);

export const duelPhonePortraitMaxDpr = () => DUEL_PHONE_MAX_DPR;

export const cappedRendererResolution = (dpr: number, maxDpr: number) => Math.min(dpr, maxDpr);
