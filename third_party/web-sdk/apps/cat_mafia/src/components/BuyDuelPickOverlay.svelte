<!--
	Buy Duel — side pick (cat / dog) + per-side confirm overlay.
	Opens from Buy Bonus menu instead of the generic confirm panel.
-->
<script lang="ts">
	import { stateModal, stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContextLayout } from 'utils-layout';

	import { clearActiveFeature } from '../game/activeFeature';
	import { buyDuelCostMultiplier, canAffordBuyBonus } from '../game/buyBonusBalance';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { getContext } from '../game/context';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { AUTOSPIN_ASSETS, BUY_BONUS_ASSETS } from '../game/uiHtmlAssetManifest';
	import DuelPickMascot from './DuelPickMascot.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const isOpen = $derived(stateModal.modal?.name === 'buyDuelPick');

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

	const multiplier = buyDuelCostMultiplier();
	const price = $derived(numberToCurrencyString(stateBet.betAmount * multiplier));
	const canBuy = $derived(canAffordBuyBonus(multiplier));

	let pendingSide = $state<DuelSide | null>(null);
	let spinesWarmed = $state(false);

	$effect(() => {
		if (isOpen) {
			spinesWarmed = true;
			context.eventEmitter.broadcast({ type: 'duelPickWarm' });
		} else {
			pendingSide = null;
		}
	});

	const sideTitle = (side: DuelSide) =>
		side === 'cat' ? context.i18nDerived.duelSideCat() : context.i18nDerived.duelSideDog();
	const sideShortDesc = (side: DuelSide) =>
		side === 'cat' ? context.i18nDerived.duelCatShortDesc() : context.i18nDerived.duelDogShortDesc();
	const sideLongDesc = (side: DuelSide) =>
		side === 'cat' ? context.i18nDerived.duelCatLongDesc() : context.i18nDerived.duelDogLongDesc();

	const closeAll = () => {
		stateModal.modal = null;
		pendingSide = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const backToBuyMenu = () => {
		stateModal.modal = { name: 'buyBonus' };
		pendingSide = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const openConfirm = (side: DuelSide) => {
		if (!canBuy) return;
		pendingSide = side;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const cancelConfirm = () => {
		pendingSide = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const confirmPurchase = () => {
		if (!pendingSide || !canBuy) return;
		clearActiveFeature();
		stateDuel.playerSide = pendingSide;
		stateBet.activeBetModeKey =
			pendingSide === 'cat' ? 'bonus_duel_cat' : 'bonus_duel_dog';
		stateModal.modal = null;
		pendingSide = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		context.eventEmitter.broadcast({ type: 'bet' });
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (!isOpen) return;
		if (e.key === 'Escape') {
			if (pendingSide) cancelConfirm();
			else closeAll();
		}
	}}
/>

<div
	class="duel-buy-panel"
	class:portrait={isPortrait}
	class:popout-l={isPopout}
	class:popout-s={isPopoutSmall}
	class:confirm-open={pendingSide != null}
	role="dialog"
	aria-modal="true"
	aria-hidden={!isOpen}
	data-test="buy-duel-pick-overlay"
>
	<header class="panel-header">
		<button
			type="button"
			class="close-button"
			onclick={closeAll}
			aria-label="close"
			data-test="buy-duel-pick-close"
		>
			<img class="close-icon" src={AUTOSPIN_ASSETS.close} alt="" draggable="false" />
		</button>
	</header>

	<div class="pick-stage">
		<p class="eyebrow">{context.i18nDerived.buyBonusTitle()}</p>
		<h2 class="pick-title">{context.i18nDerived.duelPickTitle()}</h2>

		<div class="side-cards">
			{#each ['dog', 'cat'] as side (side)}
				<article class="side-card" class:side-dog={side === 'dog'} class:side-cat={side === 'cat'}>
					<div class="side-visual" aria-hidden="true">
						<span class="pick-pedestal">
							<span class="pick-pedestal-glow"></span>
							<span class="pick-pedestal-card">
								{#if spinesWarmed}
									<DuelPickMascot
										species={side === 'dog' ? 'dog' : 'cat'}
										mirror={side === 'dog'}
										playing={false}
									/>
								{/if}
							</span>
							<span class="pick-pedestal-base"></span>
						</span>
					</div>
					<h3 class="side-name">{sideTitle(side as DuelSide)}</h3>
					<p class="side-tag">{sideShortDesc(side as DuelSide)}</p>
					<p class="side-desc">{sideLongDesc(side as DuelSide)}</p>
					<div class="side-price-wrap">
						<span class="side-price">{price}</span>
					</div>
					<button
						type="button"
						class="side-buy"
						style:background-image="url('{BUY_BONUS_ASSETS.buyButtonBg}')"
						disabled={!canBuy}
						data-test="buy-duel-side-{side}"
						onclick={() => openConfirm(side as DuelSide)}
					>
						{context.i18nDerived.buyConfirm()}
					</button>
				</article>
			{/each}
		</div>

		<button
			type="button"
			class="pick-cancel"
			style:background-image="url('{BUY_BONUS_ASSETS.cancelButtonBg}')"
			data-test="buy-duel-pick-cancel"
			onclick={backToBuyMenu}
		>
			{context.i18nDerived.buyCancel()}
		</button>
	</div>

	{#if pendingSide}
		<div class="confirm-layer" data-test="buy-duel-confirm-layer">
			<div class="confirm-card">
				<div class="confirm-hero" aria-hidden="true">
					{#if spinesWarmed}
						<DuelPickMascot
							species={pendingSide === 'dog' ? 'dog' : 'cat'}
							mirror={pendingSide === 'dog'}
							playing={false}
							fill
						/>
					{/if}
				</div>

				<div class="confirm-body">
					<p class="confirm-eyebrow">{context.i18nDerived.duelBonus()}</p>
					<h3 class="confirm-title">{sideTitle(pendingSide)}</h3>
					<p class="confirm-tag">{sideShortDesc(pendingSide)}</p>
					<p class="confirm-desc">{sideLongDesc(pendingSide)}</p>
					<p class="confirm-price">{price}</p>
				</div>

				<div class="confirm-actions">
					<button
						type="button"
						class="action-btn cancel-btn"
						style:background-image="url('{BUY_BONUS_ASSETS.cancelButtonBg}')"
						data-test="buy-duel-confirm-cancel"
						onclick={cancelConfirm}
					>
						{context.i18nDerived.buyCancel()}
					</button>
					<button
						type="button"
						class="action-btn confirm-btn"
						style:background-image="url('{BUY_BONUS_ASSETS.confirmButtonBg}')"
						disabled={!canBuy}
						data-test="buy-duel-confirm-button"
						onclick={confirmPurchase}
					>
						{context.i18nDerived.buyConfirm()}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	@import url('https://fonts.googleapis.com/css2?family=Philosopher:wght@700&family=Reggae+One&display=swap');

	.duel-buy-panel {
		position: relative;
		width: min(960px, 96vw);
		max-height: min(92vh, 820px);
		overflow: auto;
		pointer-events: auto;
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		color: #f6e8c8;
	}

	.panel-header {
		display: flex;
		justify-content: flex-end;
		padding: 0.35rem 0.15rem 0;
	}

	.close-button {
		width: clamp(2rem, 4vw, 2.6rem);
		height: clamp(2rem, 4vw, 2.6rem);
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		transition: transform 0.12s ease;

		&:hover {
			transform: scale(1.06);
		}
	}

	.close-icon {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.pick-stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.65rem, 2vh, 1rem);
		padding: 0 clamp(0.75rem, 2vw, 1.25rem) clamp(1rem, 2.5vh, 1.5rem);
	}

	.eyebrow {
		margin: 0;
		font-size: clamp(0.75rem, 1.6vw, 0.95rem);
		letter-spacing: 0.14em;
		color: #d4b44a;
		text-transform: uppercase;
	}

	.pick-title {
		margin: 0;
		font-size: clamp(1.35rem, 3.8vw, 2rem);
		letter-spacing: 0.08em;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
	}

	.side-cards {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(0.75rem, 2vw, 1.25rem);
		width: 100%;
		max-width: 820px;
	}

	.side-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(0.35rem, 1.2vh, 0.55rem);
		padding: clamp(0.65rem, 1.6vw, 0.95rem);
		border-radius: clamp(0.75rem, 1.4vw, 1rem);
		background: linear-gradient(180deg, rgba(28, 16, 42, 0.92) 0%, rgba(12, 8, 22, 0.88) 100%);
		border: 1px solid rgba(255, 220, 140, 0.28);
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
		text-align: center;
	}

	.side-visual {
		width: clamp(88px, 16vw, 128px);
		height: clamp(88px, 16vw, 128px);
	}

	.pick-pedestal {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
	}

	.pick-pedestal-glow {
		position: absolute;
		inset: 8%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 210, 100, 0.35), transparent 70%);
	}

	.pick-pedestal-card {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid rgba(255, 214, 120, 0.75);
		background: rgba(18, 10, 28, 0.92);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
	}

	.side-card.side-dog .pick-pedestal-card {
		transform: scaleX(-1);
	}

	.pick-pedestal-base {
		position: absolute;
		left: 50%;
		bottom: -6%;
		width: 72%;
		height: 12%;
		transform: translateX(-50%);
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.45);
		filter: blur(4px);
	}

	.side-name {
		margin: 0;
		font-size: clamp(1rem, 2.4vw, 1.35rem);
		letter-spacing: 0.1em;
	}

	.side-tag {
		margin: 0;
		font-family: 'Philosopher', Georgia, serif;
		font-size: clamp(0.72rem, 1.5vw, 0.9rem);
		font-weight: 700;
		color: #ffe07a;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.side-desc {
		margin: 0;
		flex: 1;
		font-family: 'Philosopher', Georgia, serif;
		font-size: clamp(0.68rem, 1.35vw, 0.82rem);
		font-weight: 700;
		line-height: 1.35;
		color: rgba(246, 232, 200, 0.88);
		text-transform: uppercase;
	}

	.side-price-wrap {
		margin-top: 0.15rem;
		padding: 0.18rem 0.75rem;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 220, 140, 0.35);
	}

	.side-price {
		font-size: clamp(0.95rem, 2vw, 1.15rem);
		color: #f0d78c;
	}

	.side-buy {
		margin-top: 0.15rem;
		width: min(100%, 180px);
		min-height: 2.4rem;
		padding: 0.35rem 0.85rem;
		border: 0;
		background: center / 100% 100% no-repeat;
		font-family: inherit;
		font-size: clamp(0.75rem, 1.5vw, 0.9rem);
		letter-spacing: 0.08em;
		color: #f6e8c8;
		cursor: pointer;
		transition: transform 0.12s ease, filter 0.12s ease;

		&:hover:not(:disabled) {
			transform: translateY(-2px);
			filter: brightness(1.08);
		}

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
		}
	}

	.pick-cancel {
		margin-top: 0.35rem;
		min-width: min(100%, 220px);
		min-height: 2.5rem;
		padding: 0.4rem 1.2rem;
		border: 0;
		background: center / 100% 100% no-repeat;
		font-family: inherit;
		font-size: clamp(0.78rem, 1.6vw, 0.95rem);
		letter-spacing: 0.08em;
		color: #f6e8c8;
		cursor: pointer;
	}

	.confirm-layer {
		position: fixed;
		inset: 0;
		z-index: 2;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(4, 2, 10, 0.72);
		backdrop-filter: blur(6px);
	}

	.confirm-card {
		display: flex;
		flex-direction: column;
		width: min(440px, 92vw);
		max-height: min(88vh, 760px);
		min-height: min(520px, 86vh);
		padding: clamp(0.85rem, 2vh, 1.15rem);
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(32, 18, 48, 0.96) 0%, rgba(14, 8, 24, 0.94) 100%);
		border: 1px solid rgba(255, 220, 140, 0.35);
		box-shadow: 0 18px 42px rgba(0, 0, 0, 0.55);
		text-align: center;
		box-sizing: border-box;
	}

	.confirm-hero {
		position: relative;
		flex: 1 1 auto;
		min-height: clamp(200px, 42vh, 380px);
		width: 100%;
		overflow: hidden;
		margin-bottom: clamp(0.5rem, 1.5vh, 0.85rem);
	}

	.confirm-body {
		flex: 0 0 auto;
	}

	.confirm-eyebrow {
		margin: 0;
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		color: #d4b44a;
	}

	.confirm-title {
		margin: 0.25rem 0 0.15rem;
		font-size: clamp(1.2rem, 3vw, 1.55rem);
		letter-spacing: 0.1em;
	}

	.confirm-tag {
		margin: 0 0 0.45rem;
		font-family: 'Philosopher', Georgia, serif;
		font-size: 0.85rem;
		font-weight: 700;
		color: #ffe07a;
		text-transform: uppercase;
	}

	.confirm-desc {
		margin: 0 0 0.65rem;
		font-family: 'Philosopher', Georgia, serif;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.35;
		color: rgba(246, 232, 200, 0.9);
		text-transform: uppercase;
	}

	.confirm-price {
		margin: 0 0 0.85rem;
		font-size: clamp(1.1rem, 2.5vw, 1.35rem);
		color: #f0d78c;
	}

	.confirm-actions {
		flex: 0 0 auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
		margin-top: 0.85rem;
	}

	.action-btn {
		min-height: 2.5rem;
		padding: 0.35rem 0.65rem;
		border: 0;
		background: center / 100% 100% no-repeat;
		font-family: inherit;
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		color: #f6e8c8;
		cursor: pointer;

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
		}
	}

	.duel-buy-panel.portrait .side-cards {
		grid-template-columns: 1fr;
		max-width: 380px;
		margin-inline: auto;
	}

	.duel-buy-panel.popout-s {
		width: min(360px, 96vw);

		.pick-title {
			font-size: 0.95rem;
		}

		.side-desc,
		.confirm-desc {
			font-size: 0.55rem;
		}

		.side-visual {
			width: 64px;
			height: 64px;
		}
	}
</style>
