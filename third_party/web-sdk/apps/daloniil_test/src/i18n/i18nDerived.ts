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
	buyNormalDesc: () => t('BUY_NORMAL_DESC'),
	buySuperDesc: () => t('BUY_SUPER_DESC'),
	buyConfirm: () => t('BUY_CONFIRM'),
	buyCancel: () => t('BUY_CANCEL'),
	// Autoplay
	autoplayTitle: () => t('AUTOPLAY_TITLE'),
	autoplayFeatures: () => t('AUTOPLAY_FEATURES'),
	autoplayRounds: () => t('AUTOPLAY_ROUNDS'),
	autoplayStart: () => t('AUTOPLAY_START'),
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
};
