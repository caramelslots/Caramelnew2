import { preloadHtmlImages } from './preloadHtmlImages';
import assets from './assets';
import { GAME_INFO_SYMBOL_IMAGE_URLS, GAME_INFO_SYMBOL_IMAGES } from './gameInfoSymbols';
import { startMascotSpinePreload } from './mascotHtmlSpine';
import { startSpinButtonSpinePreload } from './spinButtonHtmlSpine';
import { preloadBuyBonusSpines } from './buyBonusHtmlSpine';
import { startTargetBoardPreload } from './targetBoardAssets';
import { startShotBulletPreload } from './shotBulletAssets';

const UI_ASSET_BASE = `${import.meta.env.BASE_URL}assets/sprites/ui`;

export const uiHtmlAssetUrl = (path: string) => `${UI_ASSET_BASE}/${path.replace(/^\//, '')}`;

/** Shared turbo speed icons — `static/assets/sprites/ui/settings/turbo_*.webp`. */
export const TURBO_ICON_ASSETS = {
	turbo1: uiHtmlAssetUrl('settings/turbo_1.webp'),
	turbo2: uiHtmlAssetUrl('settings/turbo_2.webp'),
	turbo3: uiHtmlAssetUrl('settings/turbo_3.webp'),
} as const;

export const SETTINGS_TURBO_URLS = [
	TURBO_ICON_ASSETS.turbo1,
	TURBO_ICON_ASSETS.turbo2,
	TURBO_ICON_ASSETS.turbo3,
] as const;

export const HUD_ASSETS = {
	info: uiHtmlAssetUrl('info/info.webp'),
	menu: uiHtmlAssetUrl('settings/menu.webp'),
	betMinus: uiHtmlAssetUrl('bet/minus.webp'),
	betPlus: uiHtmlAssetUrl('bet/plus.webp'),
	spin1: uiHtmlAssetUrl('spin/spin_1.webp'),
	spin2: uiHtmlAssetUrl('spin/spin_2.webp'),
	autoplay: uiHtmlAssetUrl('autoplay/autoplay.webp'),
	autoplayMobile: uiHtmlAssetUrl('autoplay/autoplay_mobile.webp'),
	...TURBO_ICON_ASSETS,
	buyBonusPanel: uiHtmlAssetUrl('buy_bonus/buy_bonus.webp'),
} as const;

export const BUY_BONUS_ASSETS = {
	menuBg: uiHtmlAssetUrl('buy_bonus/bg_buy_bonus_board.webp'),
	confirmBg: uiHtmlAssetUrl('buy_bonus/bg_buy_bonus_board.webp'),
	buyButtonBg: uiHtmlAssetUrl('buy_bonus/buy_button_bg.webp'),
	cancelButtonBg: uiHtmlAssetUrl('buy_bonus/cancel_button_bg.webp'),
	confirmButtonBg: uiHtmlAssetUrl('buy_bonus/confirm_button_bg.webp'),
} as const;

export const SETTINGS_ASSETS = {
	bg: uiHtmlAssetUrl('settings/bg_settings_panel.webp'),
	soundOff: uiHtmlAssetUrl('settings/sound_off.webp'),
	soundLow: uiHtmlAssetUrl('settings/sound_low.webp'),
	soundMid: uiHtmlAssetUrl('settings/sound_mid.webp'),
	soundHigh: uiHtmlAssetUrl('settings/sound_high.webp'),
	sliderEmpty: uiHtmlAssetUrl('settings/slider_empty.webp'),
	sliderFull: uiHtmlAssetUrl('settings/slider_full.webp'),
	sliderKnob: uiHtmlAssetUrl('settings/slider_knob.webp'),
	frameTurbo: uiHtmlAssetUrl('settings/frame_turbo.webp'),
	frameVolume: uiHtmlAssetUrl('settings/frame_volume.webp'),
	musicOn: uiHtmlAssetUrl('settings/music_on.webp'),
	musicOff: uiHtmlAssetUrl('settings/music_off.webp'),
	...TURBO_ICON_ASSETS,
} as const;

/** Autoplay menu panel textures — `static/assets/sprites/ui/autoplay_menu/`. */
export const AUTOSPIN_ASSETS = {
	bg: uiHtmlAssetUrl('autoplay_menu/board.webp'),
	close: uiHtmlAssetUrl('autoplay/cross.webp'),
	pawIcon: uiHtmlAssetUrl('autoplay_menu/paw.webp'),
	bonusIcon: uiHtmlAssetUrl('autoplay_menu/bonus.webp'),
	startButton: uiHtmlAssetUrl('autoplay_menu/start.webp'),
} as const;

export const FEATURE_TOGGLE_ASSETS = {
	/** Bonus symbol — Bonus Boost icon in game info, autoplay, and buy bonus. */
	menuCatIcon: GAME_INFO_SYMBOL_IMAGES.B,
} as const;

const dedupeUrls = (urls: readonly string[]) => [...new Set(urls)];

/** FreeSpinIntro HTML layers (`assets/sprites/fsCong/`) + desktop FS spinboard. */
export const FS_CONG_IMAGE_URLS = dedupeUrls([
	assets.fsCongRays.src,
	assets.fsCongBg.src,
	assets.fsCongFrame.src,
	assets.fsCongTextPaw.src,
	assets.fsCongBoard.src,
	assets.fsLeftCounterSpinboard.src,
]);

/**
 * HUD chrome only during loading idle.
 * Spine / Pixi atlases stay on fetch-only warmers (no HTML Image decode).
 * Settings / autoplay / buy-bonus boards preload when those panels open.
 */
export const LOADING_IDLE_UI_IMAGE_URLS = dedupeUrls([
	HUD_ASSETS.info,
	HUD_ASSETS.menu,
	HUD_ASSETS.betMinus,
	HUD_ASSETS.betPlus,
	HUD_ASSETS.spin1,
	HUD_ASSETS.spin2,
	HUD_ASSETS.autoplay,
	HUD_ASSETS.autoplayMobile,
	HUD_ASSETS.turbo1,
	HUD_ASSETS.turbo2,
	HUD_ASSETS.turbo3,
	HUD_ASSETS.buyBonusPanel,
	FEATURE_TOGGLE_ASSETS.menuCatIcon,
	...GAME_INFO_SYMBOL_IMAGE_URLS,
]);

/** HTML board / cards / buttons only — Spine webps stay on the fetch-only path. */
export const BUY_BONUS_FLOW_IMAGE_URLS = dedupeUrls([
	BUY_BONUS_ASSETS.menuBg,
	BUY_BONUS_ASSETS.confirmBg,
	BUY_BONUS_ASSETS.buyButtonBg,
	BUY_BONUS_ASSETS.cancelButtonBg,
	BUY_BONUS_ASSETS.confirmButtonBg,
]);

export const SETTINGS_PANEL_IMAGE_URLS = dedupeUrls([
	SETTINGS_ASSETS.bg,
	SETTINGS_ASSETS.soundOff,
	SETTINGS_ASSETS.soundLow,
	SETTINGS_ASSETS.soundMid,
	SETTINGS_ASSETS.soundHigh,
	SETTINGS_ASSETS.sliderEmpty,
	SETTINGS_ASSETS.sliderFull,
	SETTINGS_ASSETS.sliderKnob,
	SETTINGS_ASSETS.frameTurbo,
	SETTINGS_ASSETS.frameVolume,
	SETTINGS_ASSETS.musicOn,
	SETTINGS_ASSETS.musicOff,
	...SETTINGS_TURBO_URLS,
	AUTOSPIN_ASSETS.pawIcon,
	AUTOSPIN_ASSETS.close,
]);

export const AUTOPLAY_PANEL_IMAGE_URLS = dedupeUrls([
	AUTOSPIN_ASSETS.bg,
	AUTOSPIN_ASSETS.close,
	AUTOSPIN_ASSETS.pawIcon,
	AUTOSPIN_ASSETS.bonusIcon,
	AUTOSPIN_ASSETS.startButton,
	SETTINGS_ASSETS.sliderEmpty,
	SETTINGS_ASSETS.sliderFull,
	SETTINGS_ASSETS.sliderKnob,
	HUD_ASSETS.betMinus,
	HUD_ASSETS.betPlus,
	FEATURE_TOGGLE_ASSETS.menuCatIcon,
]);

let buyBonusFlowPreload: Promise<void> | null = null;
let fsCongPreload: Promise<void> | null = null;
let settingsPanelPreload: Promise<void> | null = null;
let autoplayPanelPreload: Promise<void> | null = null;

/** Board, buttons, and card spines — when the user opens Buy Bonus. */
export const startBuyBonusFlowPreload = (): Promise<void> => {
	if (buyBonusFlowPreload) return buyBonusFlowPreload;

	buyBonusFlowPreload = Promise.all([
		preloadHtmlImages(BUY_BONUS_FLOW_IMAGE_URLS, { concurrency: 6 }),
		preloadBuyBonusSpines(),
	]).then(() => undefined);

	return buyBonusFlowPreload;
};

/** Settings panel board + chrome — on menu open. */
export const startSettingsPanelPreload = (): Promise<void> => {
	if (settingsPanelPreload) return settingsPanelPreload;
	settingsPanelPreload = preloadHtmlImages(SETTINGS_PANEL_IMAGE_URLS, {
		concurrency: 4,
		retain: true,
	}).then(() => undefined);
	return settingsPanelPreload;
};

/** Autoplay panel board + sliders — on modal open. */
export const startAutoplayPanelPreload = (): Promise<void> => {
	if (autoplayPanelPreload) return autoplayPanelPreload;
	autoplayPanelPreload = preloadHtmlImages(AUTOPLAY_PANEL_IMAGE_URLS, {
		concurrency: 4,
		retain: true,
	}).then(() => undefined);
	return autoplayPanelPreload;
};

/** Decode fsCong HTML layers after a bought bonus / just before FS or duel intro. */
export const startFsCongPreload = (): Promise<void> => {
	if (fsCongPreload) return fsCongPreload;
	fsCongPreload = preloadHtmlImages(FS_CONG_IMAGE_URLS, { concurrency: 2 }).then(() => undefined);
	return fsCongPreload;
};

const LOADING_IDLE_UI_PRIORITY = [
	HUD_ASSETS.spin1,
	HUD_ASSETS.spin2,
	HUD_ASSETS.menu,
	HUD_ASSETS.info,
	HUD_ASSETS.buyBonusPanel,
	HUD_ASSETS.autoplay,
	HUD_ASSETS.autoplayMobile,
	HUD_ASSETS.betMinus,
	HUD_ASSETS.betPlus,
	HUD_ASSETS.turbo1,
	HUD_ASSETS.turbo2,
	HUD_ASSETS.turbo3,
] as const;

let loadingIdleUiPreloadStarted = false;

/** Warm HUD HTML sprites + fetch-only Spine/Pixi during the loading-screen idle window. */
export const startLoadingIdleUiPreload = () => {
	if (loadingIdleUiPreloadStarted) return;
	loadingIdleUiPreloadStarted = true;

	startMascotSpinePreload();
	// Coin paw is Pixi in production — do not spawn HTML SpinePlayers at load.
	startSpinButtonSpinePreload();
	startTargetBoardPreload();
	startShotBulletPreload();

	void preloadHtmlImages(LOADING_IDLE_UI_IMAGE_URLS, {
		priority: LOADING_IDLE_UI_PRIORITY,
		concurrency: 4,
	});
};
