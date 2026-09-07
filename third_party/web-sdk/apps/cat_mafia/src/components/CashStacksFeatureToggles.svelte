<!--
	Общие строки Bonus Boost / Special Spins с тумблерами (Special Spins скрыт в UI по умолчанию).
	Используются в FeaturesAutoSpinOverlay и BuyBonusOverlay — одно состояние
	через stateGame.activeFeature (см. game/activeFeature.ts).
-->
<script lang="ts">
	import { stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import {
		bonusBoostCostMultiplier,
		canAffordBonusBoost,
		specialSpinsCostMultiplier,
	} from '../game/buyBonusBalance';
	import { getContext } from '../game/context';
	import { toggleActiveFeature, type ActiveFeature } from '../game/activeFeature';
	import { stateGame } from '../game/stateGame.svelte';
	import { FEATURE_TOGGLE_ASSETS } from '../game/uiHtmlAssetManifest';

	type Props = {
		/** Заголовок секции «Функции» (только в меню автоигры). */
		showSectionTitle?: boolean;
		/** Какие фичи показывать (по умолчанию обе). */
		features?: ActiveFeature[];
		/** Компактная строка: название + тумблер, без cost. */
		compact?: boolean;
		/** Подпись как на портретной панели (BONUS_BOOST_PANEL_DESC). */
		panelDesc?: boolean;
		/** Inline font-size для portrait buy panel (перебивает scoped CSS). */
		panelNameFontSize?: string;
		panelCostFontSize?: string;
		/** Блокирует переключение во время спина (как buy bonus). */
		disabled?: boolean;
		/** Не менять фон при hover (карточки в BuyBonusOverlay). */
		noHoverBg?: boolean;
		/** Иконка Bonus слева (Buy Bonus / Autoplay). */
		showMenuCatIcon?: boolean;
		/** Override иконки слева (например autopay bonus в меню автоигры). */
		menuCatIconSrc?: string;
	};

	const {
		showSectionTitle = false,
		features = ['bonus_boost'],
		compact = false,
		panelDesc = false,
		panelNameFontSize,
		panelCostFontSize,
		disabled = false,
		noHoverBg = false,
		showMenuCatIcon = false,
		menuCatIconSrc,
	}: Props = $props();

	const menuCatIconUrl = $derived(menuCatIconSrc ?? FEATURE_TOGGLE_ASSETS.menuCatIcon);

	const context = getContext();

	const bonusBoostActive = $derived(stateGame.activeFeature === 'bonus_boost');
	const bonusBoostDisabled = $derived(
		disabled || (!bonusBoostActive && !canAffordBonusBoost()),
	);

	const bonusBoostCost = $derived(
		numberToCurrencyString(stateBet.betAmount * bonusBoostCostMultiplier()),
	);
	const specialSpinsCost = $derived(
		numberToCurrencyString(stateBet.betAmount * specialSpinsCostMultiplier()),
	);

	const onToggle = (feature: ActiveFeature) => {
		if (feature === 'bonus_boost' && bonusBoostDisabled) return;
		if (disabled) return;
		toggleActiveFeature(feature);
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};
</script>

{#if showSectionTitle}
	<div class="section-title">{context.i18nDerived.autoplayFeatures()}</div>
{/if}

{#if features.includes('bonus_boost')}
	<button
		type="button"
		class="feature-row bonus-boost"
		class:compact
		class:no-hover-bg={noHoverBg}
		class:menu-cat={showMenuCatIcon}
		class:active={bonusBoostActive}
		disabled={bonusBoostDisabled}
		onclick={() => onToggle('bonus_boost')}
		data-test="feature-bonus-boost"
	>
		{#if showMenuCatIcon}
			<img class="feature-cat-icon" src={menuCatIconUrl} alt="" draggable="false" />
		{/if}
		<div class="feature-info">
			<div
				class="feature-name"
				style:font-size={panelNameFontSize}
			>
				{panelDesc
					? context.i18nDerived.bonusBoostPanelDesc()
					: context.i18nDerived.bonusBoost()}
			</div>
			{#if !compact}
				<div
					class="feature-cost"
					style:font-size={panelCostFontSize}
				>
					{context.i18nDerived.featurePerSpinCost(bonusBoostCost)}
				</div>
			{/if}
		</div>
		<div class="feature-toggle" class:on={bonusBoostActive}>
			<span class="knob"></span>
		</div>
	</button>
{/if}

{#if features.includes('special_spins')}
	<button
		type="button"
		class="feature-row"
		class:compact
		class:no-hover-bg={noHoverBg}
		class:active={stateGame.activeFeature === 'special_spins'}
		{disabled}
		onclick={() => onToggle('special_spins')}
		data-test="feature-special-spins"
	>
		<div class="feature-info">
			<div class="feature-name">{context.i18nDerived.specialSpins()}</div>
			{#if !compact}
				<div class="feature-cost">
					{context.i18nDerived.featurePerSpinCost(specialSpinsCost)}
				</div>
			{/if}
		</div>
		<div class="feature-toggle" class:on={stateGame.activeFeature === 'special_spins'}>
			<span class="knob"></span>
		</div>
	</button>
{/if}

<style lang="scss">
	.section-title {
		font-size: 1.1rem;
		font-weight: 800;
		color: #f0c674;
		text-align: center;
		letter-spacing: 0.01em;
		margin-bottom: 0.15rem;
	}

	.feature-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		width: 100%;
		padding: 0.55rem 0.7rem;
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 10px;
		cursor: pointer;
		text-align: left;
		color: inherit;
		font-family: inherit;
		transition: background-color 0.15s, border-color 0.15s, transform 0.1s, filter 0.1s;

		&:hover:not(:disabled):not(.no-hover-bg) {
			background-color: rgba(0, 0, 0, 0.36);
		}

		&:active:not(:disabled) {
			transform: scale(0.98);
			filter: brightness(0.9);
		}

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
			pointer-events: none;
		}

		&.active {
			border-color: rgba(76, 200, 120, 0.45);
		}

		&.compact {
			padding: 0.5rem 0.6rem;
		}
	}

	.feature-row.compact .feature-name {
		font-size: 0.78rem;
		font-weight: 600;
		line-height: 1.25;
	}

	.feature-row.bonus-boost:not(.no-hover-bg):hover:not(:disabled) {
		background-color: rgba(0, 0, 0, 0.36);
	}

	.feature-row.menu-cat {
		padding: 0;
		gap: 0;
	}

	.feature-cat-icon {
		display: block;
		flex: 0 0 auto;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
	}

	.feature-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		flex: 1;
		min-width: 0;
	}

	.feature-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #fff;
	}

	.feature-cost {
		font-size: 0.72rem;
		font-weight: 700;
		color: #4cd964;
		letter-spacing: 0.03em;
	}

	.feature-toggle {
		flex: 0 0 auto;
		width: 38px;
		height: 22px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 999px;
		position: relative;
		transition: background 0.2s;
	}

	.feature-toggle.on { background: #4cd964; }

	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		background: #6e6e6e;
		border-radius: 50%;
		transition: left 0.2s, background 0.2s;
	}

	.feature-toggle.on .knob {
		left: 18px;
		background: #fff;
	}
</style>
