import { preloadHtmlImages } from './preloadHtmlImages';

const UI_ASSET_BASE = `${import.meta.env.BASE_URL}assets/sprites/ui`;

export const uiHtmlAssetUrl = (path: string) =>
	`${UI_ASSET_BASE}/${path.replace(/^\//, '')}`;

export const HUD_ASSETS = {
	info: uiHtmlAssetUrl('info/info.png'),
	menu: uiHtmlAssetUrl('menu/menu.png'),
	betMinus: uiHtmlAssetUrl('bet/minus.png'),
	betPlus: uiHtmlAssetUrl('bet/plus.png'),
	spin1: uiHtmlAssetUrl('spin/spin_1.png'),
	spin2: uiHtmlAssetUrl('spin/spin_2.png'),
	autoplay: uiHtmlAssetUrl('autoplay/autoplay.png'),
	autoplayMobile: uiHtmlAssetUrl('autoplay/autoplay_mobile.png'),
	turbo1: uiHtmlAssetUrl('turbo/turbo_1.png'),
	turbo2: uiHtmlAssetUrl('turbo/turbo_2.png'),
	turbo3: uiHtmlAssetUrl('turbo/turbo_3.png'),
	buyBonusPanel: uiHtmlAssetUrl('buy_bonus/buy_bonus.png'),
} as const;

export const BUY_BONUS_ASSETS = {
	menuBg: uiHtmlAssetUrl('buy_bonus/bg_buy_bonus_panel.png'),
	confirmBg: uiHtmlAssetUrl('buy_bonus/bg_buy_bonus_confirm_panel.png'),
	normalCard: uiHtmlAssetUrl('buy_bonus/normal_bonus_card.png'),
	superCard: uiHtmlAssetUrl('buy_bonus/super_bonus_card.png'),
	deskL: uiHtmlAssetUrl('buy_bonus/desk_l.png'),
	deskR: uiHtmlAssetUrl('buy_bonus/desk_r.png'),
	buyButtonBg: uiHtmlAssetUrl('buy_bonus/buy_button_bg.png'),
	cancelButtonBg: uiHtmlAssetUrl('buy_bonus/cancel_button_bg.png'),
	confirmButtonBg: uiHtmlAssetUrl('buy_bonus/confirm_button_bg.png'),
} as const;

export const SETTINGS_ASSETS = {
	bg: uiHtmlAssetUrl('settings/bg_settings_panel.png'),
	soundOff: uiHtmlAssetUrl('settings/sound_off.png'),
	soundLow: uiHtmlAssetUrl('settings/sound_low.png'),
	soundMid: uiHtmlAssetUrl('settings/sound_mid.png'),
	soundHigh: uiHtmlAssetUrl('settings/sound_high.png'),
	sliderEmpty: uiHtmlAssetUrl('settings/slider_empty.png'),
	sliderFull: uiHtmlAssetUrl('settings/slider_full.png'),
	sliderKnob: uiHtmlAssetUrl('settings/slider_knob.png'),
	musicOn: uiHtmlAssetUrl('settings/music_on.png'),
	musicOff: uiHtmlAssetUrl('settings/music_off.png'),
	turbo1: uiHtmlAssetUrl('settings/turbo_1.png'),
	turbo2: uiHtmlAssetUrl('settings/turbo_2.png'),
	turbo3: uiHtmlAssetUrl('settings/turbo_3.png'),
} as const;

export const SETTINGS_TURBO_URLS = [
	SETTINGS_ASSETS.turbo1,
	SETTINGS_ASSETS.turbo2,
	SETTINGS_ASSETS.turbo3,
] as const;

export const AUTOSPIN_ASSETS = {
	bg: uiHtmlAssetUrl('autoplay/bg_auto_panel.png'),
	close: uiHtmlAssetUrl('autoplay/cross.png'),
	sliderHead: uiHtmlAssetUrl('autoplay/slider/head.png'),
	sliderFull: uiHtmlAssetUrl('autoplay/slider/full.png'),
	sliderButton: uiHtmlAssetUrl('autoplay/slider/button.png'),
	sliderEmpty: uiHtmlAssetUrl('autoplay/slider/empty.png'),
	startButton: uiHtmlAssetUrl('autoplay/main_button.png'),
} as const;

export const FEATURE_TOGGLE_ASSETS = {
	bonusSwitchBg: uiHtmlAssetUrl('bonus_switch/bonus_switch.png'),
	menuCatIcon: `${import.meta.env.BASE_URL}assets/sprites/bonusBar/cat_static.png`,
} as const;

const dedupeUrls = (urls: readonly string[]) => [...new Set(urls)];

/** HUD + settings + autoplay + buy bonus sprites shown soon after entering the game. */
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
	SETTINGS_ASSETS.bg,
	SETTINGS_ASSETS.soundOff,
	SETTINGS_ASSETS.soundLow,
	SETTINGS_ASSETS.soundMid,
	SETTINGS_ASSETS.soundHigh,
	SETTINGS_ASSETS.sliderEmpty,
	SETTINGS_ASSETS.sliderFull,
	SETTINGS_ASSETS.sliderKnob,
	SETTINGS_ASSETS.musicOn,
	SETTINGS_ASSETS.musicOff,
	...SETTINGS_TURBO_URLS,
	AUTOSPIN_ASSETS.bg,
	AUTOSPIN_ASSETS.close,
	AUTOSPIN_ASSETS.sliderHead,
	AUTOSPIN_ASSETS.sliderFull,
	AUTOSPIN_ASSETS.sliderButton,
	AUTOSPIN_ASSETS.sliderEmpty,
	AUTOSPIN_ASSETS.startButton,
	FEATURE_TOGGLE_ASSETS.bonusSwitchBg,
	FEATURE_TOGGLE_ASSETS.menuCatIcon,
	BUY_BONUS_ASSETS.menuBg,
	BUY_BONUS_ASSETS.confirmBg,
	BUY_BONUS_ASSETS.normalCard,
	BUY_BONUS_ASSETS.superCard,
	BUY_BONUS_ASSETS.deskL,
	BUY_BONUS_ASSETS.deskR,
	BUY_BONUS_ASSETS.buyButtonBg,
	BUY_BONUS_ASSETS.cancelButtonBg,
	BUY_BONUS_ASSETS.confirmButtonBg,
]);

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
	SETTINGS_ASSETS.bg,
	AUTOSPIN_ASSETS.bg,
	BUY_BONUS_ASSETS.menuBg,
	BUY_BONUS_ASSETS.confirmBg,
] as const;

let loadingIdleUiPreloadStarted = false;

/** Warm HUD/settings/autoplay/buy-bonus HTML sprites during the loading-screen idle window. */
export const startLoadingIdleUiPreload = () => {
	if (loadingIdleUiPreloadStarted) return;
	loadingIdleUiPreloadStarted = true;

	void preloadHtmlImages(LOADING_IDLE_UI_IMAGE_URLS, {
		priority: LOADING_IDLE_UI_PRIORITY,
		concurrency: 4,
	});
};
