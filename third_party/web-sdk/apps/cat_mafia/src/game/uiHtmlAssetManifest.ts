import { preloadHtmlImages } from './preloadHtmlImages';
import { GAME_INFO_SYMBOL_IMAGE_URLS } from './gameInfoSymbols';
import {
	SPIN_BUTTON_SPINE_WEBP_URL,
	startSpinButtonSpinePreload,
} from './spinButtonHtmlSpine';
import {
	MASCOT_SPINE_IMAGE_URL,
	startMascotSpinePreload,
} from './mascotHtmlSpine';
import { COIN_PAW_SPINE_WEBP_URL, startCoinPawSpinePreload } from './coinHtmlSpine';

const UI_ASSET_BASE = `${import.meta.env.BASE_URL}assets/sprites/ui`;

export const uiHtmlAssetUrl = (path: string) =>
	`${UI_ASSET_BASE}/${path.replace(/^\//, '')}`;

export const HUD_ASSETS = {
	info: uiHtmlAssetUrl('info/info.webp'),
	menu: uiHtmlAssetUrl('menu/menu.webp'),
	betMinus: uiHtmlAssetUrl('bet/minus.webp'),
	betPlus: uiHtmlAssetUrl('bet/plus.webp'),
	spin1: uiHtmlAssetUrl('spin/spin_1.webp'),
	autoplay: uiHtmlAssetUrl('autoplay/autoplay.webp'),
	autoplayMobile: uiHtmlAssetUrl('autoplay/autoplay_mobile.webp'),
	turbo1: uiHtmlAssetUrl('turbo/turbo_1.webp'),
	turbo2: uiHtmlAssetUrl('turbo/turbo_2.webp'),
	turbo3: uiHtmlAssetUrl('turbo/turbo_3.webp'),
	buyBonusPanel: uiHtmlAssetUrl('buy_bonus/buy_bonus.webp'),
} as const;

export const BUY_BONUS_ASSETS = {
	menuBg: uiHtmlAssetUrl('buy_bonus/bg_buy_bonus_panel.webp'),
	confirmBg: uiHtmlAssetUrl('buy_bonus/bg_buy_bonus_confirm_panel.webp'),
	normalCard: uiHtmlAssetUrl('buy_bonus/normal_bonus_card.webp'),
	superCard: uiHtmlAssetUrl('buy_bonus/super_bonus_card.webp'),
	deskL: uiHtmlAssetUrl('buy_bonus/desk_l.webp'),
	deskR: uiHtmlAssetUrl('buy_bonus/desk_r.webp'),
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
	musicOn: uiHtmlAssetUrl('settings/music_on.webp'),
	musicOff: uiHtmlAssetUrl('settings/music_off.webp'),
} as const;

export const SETTINGS_TURBO_URLS = [
	HUD_ASSETS.turbo1,
	HUD_ASSETS.turbo2,
	HUD_ASSETS.turbo3,
] as const;

export const AUTOSPIN_ASSETS = {
	bg: uiHtmlAssetUrl('autoplay/bg_auto_panel.webp'),
	close: uiHtmlAssetUrl('autoplay/cross.webp'),
	messageBg: uiHtmlAssetUrl('autoplay/bg_autoplay_message_panel.webp'),
	messageOkBg: uiHtmlAssetUrl('autoplay/autoplay_message_ok_bg.webp'),
	sliderHead: uiHtmlAssetUrl('autoplay/slider/head.webp'),
	sliderFull: uiHtmlAssetUrl('autoplay/slider/full.webp'),
	sliderButton: uiHtmlAssetUrl('autoplay/slider/button.webp'),
	sliderEmpty: uiHtmlAssetUrl('autoplay/slider/empty.webp'),
	startButton: uiHtmlAssetUrl('autoplay/main_button.webp'),
} as const;

export const FEATURE_TOGGLE_ASSETS = {
	bonusSwitchBg: uiHtmlAssetUrl('bonus_switch/bonus_switch.webp'),
	menuCatIcon: `${import.meta.env.BASE_URL}assets/sprites/bonusBar/cat_static.png`,
} as const;

/** Full-body Cat Mafia mascot (board right) — Spine atlas image. */
export const MASCOT_ASSETS = {
	body: MASCOT_SPINE_IMAGE_URL,
} as const;

const dedupeUrls = (urls: readonly string[]) => [...new Set(urls)];

/** HUD + settings + autoplay + buy bonus sprites shown soon after entering the game. */
export const LOADING_IDLE_UI_IMAGE_URLS = dedupeUrls([
	HUD_ASSETS.info,
	HUD_ASSETS.menu,
	HUD_ASSETS.betMinus,
	HUD_ASSETS.betPlus,
	HUD_ASSETS.spin1,
	SPIN_BUTTON_SPINE_WEBP_URL,
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
	AUTOSPIN_ASSETS.messageBg,
	AUTOSPIN_ASSETS.messageOkBg,
	AUTOSPIN_ASSETS.sliderHead,
	AUTOSPIN_ASSETS.sliderFull,
	AUTOSPIN_ASSETS.sliderButton,
	AUTOSPIN_ASSETS.sliderEmpty,
	AUTOSPIN_ASSETS.startButton,
	FEATURE_TOGGLE_ASSETS.bonusSwitchBg,
	FEATURE_TOGGLE_ASSETS.menuCatIcon,
	MASCOT_ASSETS.body,
	COIN_PAW_SPINE_WEBP_URL,
	BUY_BONUS_ASSETS.menuBg,
	BUY_BONUS_ASSETS.confirmBg,
	BUY_BONUS_ASSETS.normalCard,
	BUY_BONUS_ASSETS.superCard,
	BUY_BONUS_ASSETS.deskL,
	BUY_BONUS_ASSETS.deskR,
	BUY_BONUS_ASSETS.buyButtonBg,
	BUY_BONUS_ASSETS.cancelButtonBg,
	BUY_BONUS_ASSETS.confirmButtonBg,
	...GAME_INFO_SYMBOL_IMAGE_URLS,
]);

export const BUY_BONUS_FLOW_IMAGE_URLS = dedupeUrls([
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

const BUY_BONUS_FLOW_PRELOAD_PRIORITY = [
	BUY_BONUS_ASSETS.menuBg,
	BUY_BONUS_ASSETS.confirmBg,
	BUY_BONUS_ASSETS.normalCard,
	BUY_BONUS_ASSETS.superCard,
] as const;

let buyBonusFlowPreloadStarted = false;

/** Decode buy-bonus modal sprites before the first open. */
export const startBuyBonusFlowPreload = () => {
	if (buyBonusFlowPreloadStarted) return;
	buyBonusFlowPreloadStarted = true;

	void preloadHtmlImages(BUY_BONUS_FLOW_IMAGE_URLS, {
		priority: BUY_BONUS_FLOW_PRELOAD_PRIORITY,
		concurrency: 3,
	});
};

const LOADING_IDLE_UI_PRIORITY = [
	SPIN_BUTTON_SPINE_WEBP_URL,
	HUD_ASSETS.spin1,
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

	startSpinButtonSpinePreload();
	startMascotSpinePreload();
	startCoinPawSpinePreload();

	void preloadHtmlImages(LOADING_IDLE_UI_IMAGE_URLS, {
		priority: LOADING_IDLE_UI_PRIORITY,
		concurrency: 4,
	});
};
