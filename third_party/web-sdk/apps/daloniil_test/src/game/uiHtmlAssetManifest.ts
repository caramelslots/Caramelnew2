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

/** HUD + settings + autoplay sprites shown soon after entering the game. */
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
]);

const LOADING_IDLE_UI_PRIORITY = [
	SETTINGS_ASSETS.bg,
	AUTOSPIN_ASSETS.bg,
	HUD_ASSETS.menu,
	HUD_ASSETS.autoplay,
	HUD_ASSETS.autoplayMobile,
] as const;

let loadingIdleUiPreloadStarted = false;

/** Warm settings/autoplay/HUD HTML sprites during the loading-screen idle window. */
export const startLoadingIdleUiPreload = () => {
	if (loadingIdleUiPreloadStarted) return;
	loadingIdleUiPreloadStarted = true;

	void preloadHtmlImages(LOADING_IDLE_UI_IMAGE_URLS, {
		priority: LOADING_IDLE_UI_PRIORITY,
		concurrency: 4,
	});
};
