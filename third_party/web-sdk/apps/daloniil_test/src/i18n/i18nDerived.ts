import { stateI18nDerived } from 'state-shared';

import { i18nDerived as i18nDerivedUiPixi } from 'components-ui-pixi';
import { i18nDerived as i18nDerivedUiHtml } from 'components-ui-html';

const t = (key: string) => stateI18nDerived.translate(key);

export const i18nDerived = {
	...i18nDerivedUiPixi,
	...i18nDerivedUiHtml,
	home: () => t('HOME'),
	notTranslated: () => t('NOT TRANSLATED'),
	// Cash Stacks
	gameTitle: () => t('GAME_TITLE'),
	// Buy Bonus
	buyBonusTitle: () => t('BUY_BONUS_TITLE'),
	normalBonus: () => t('NORMAL_BONUS'),
	superBonus: () => t('SUPER_BONUS'),
	buyNormalCost: () => t('BUY_NORMAL_COST'),
	buySuperCost: () => t('BUY_SUPER_COST'),
	buyNormalDescCount: () => t('BUY_NORMAL_DESC_COUNT'),
	buyNormalDescSpins: () => t('BUY_NORMAL_DESC_SPINS'),
	buyNormalDescTrigger: () => t('BUY_NORMAL_DESC_TRIGGER'),
	buySuperDescCount: () => t('BUY_SUPER_DESC_COUNT'),
	buySuperDescSpins: () => t('BUY_SUPER_DESC_SPINS'),
	buySuperDescFeature: () => t('BUY_SUPER_DESC_FEATURE'),
	buyConfirm: () => t('BUY_CONFIRM'),
	buyCancel: () => t('BUY_CANCEL'),
	buyBonusPanelButton: () => t('BUY_BONUS_PANEL_BUTTON'),
	bonusBoostPanelDesc: () => t('BONUS_BOOST_PANEL_DESC'),
	// Settings menu
	settingsMenuTitle: () => t('SETTINGS_MENU_TITLE'),
	// Autoplay
	autoplayTitle: () => t('AUTOPLAY_TITLE'),
	autoplayFeatures: () => t('AUTOPLAY_FEATURES'),
	autoplayRounds: () => t('AUTOPLAY_ROUNDS'),
	autoplayStart: () => t('AUTOPLAY_START'),
	autoplayStartWithRounds: (rounds: string) => `${t('AUTOPLAY_START_LABEL')} (${rounds})`,
	autobet: () => t('AUTO_BET'),
	bonusBoost: () => t('BONUS_BOOST'),
	bonusBoostDesc: () => t('BONUS_BOOST_DESC'),
	/* Стоимость фичи: не используем плейсхолдеры `{cost}` (Lingui интерпретирует
	   их как ICU-параметры и без values отдаёт пустую строку), а конструируем
	   строку прямо здесь: "{сумма_валюты} {локализованный_суффикс}". */
	bonusBoostCost: (cost: string) => `${cost} ${t('PER_SPIN_SUFFIX')}`,
	specialSpins: () => t('SPECIAL_SPINS'),
	specialSpinsDesc: () => t('SPECIAL_SPINS_DESC'),
	specialSpinsCost: (cost: string) => `${cost} ${t('PER_SPIN_SUFFIX')}`,
	/* Универсальная cost-строка для фич в авто-меню. */
	featurePerSpinCost: (cost: string) => `${cost} ${t('PER_SPIN_SUFFIX')}`,
	rtpLabel: () => t('RTP_LABEL'),
	// Free Spins
	fsCounterLabel: () => t('FS_COUNTER_LABEL'),
	fsRemaining: () => t('FS_REMAINING'),
	progressLadder: () => t('PROGRESS_LADDER'),
	bonusCollected: () => t('BONUS_COLLECTED'),
	// Mystery Reel Meter (top-right HUD во FS)
	mysteryReelMeter: () => t('MYSTERY_REEL_METER'),
	bonusToNextReel: () => t('BONUS_TO_NEXT_REEL'),
	maxTierReached: () => t('MAX_TIER_REACHED'),
	// Mystery Reel Unlock celebration overlay
	mysteryReelUnlocked: () => t('MYSTERY_REEL_UNLOCKED'),
	mysteryReelUnlockedSubtitle: () => t('MYSTERY_REEL_UNLOCKED_SUBTITLE'),
	freeSpinsAwarded: (n: number) => `+${n} ${t('FREE_SPINS_AWARDED_SUFFIX')}`,
	// Misc
	maxWin: () => t('MAX_WIN'),
	pressToContinue: () => t('PRESS_TO_CONTINUE').toUpperCase(),
};
