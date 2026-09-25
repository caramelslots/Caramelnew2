<!--
	Buy Duel — side pick on the same board as BuyBonusOverlay
	(bg_buy_bonus_board.webp + buyBonusPanelDimensions).
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { stateModal, stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContextLayout } from 'utils-layout';

	import { clearActiveFeature } from '../game/activeFeature';
	import { buyDuelCostMultiplier, canAffordBuyBonus } from '../game/buyBonusBalance';
	import {
		BUY_BONUS_CARD_KNEWAVE_FONT_FAMILY,
		HUD_BALANCE_BET_FONT_FAMILY,
		isPopoutSmallViewport,
		isPopoutViewport,
	} from '../game/constants';
	import { ensureKnewaveFontLoaded } from '../game/knewaveFont';
	import { getContext } from '../game/context';
	import { evictBuyBonusForFeature } from '../game/buyBonusSharedPixi';
	import { startMascotSpinePreload } from '../game/mascotHtmlSpine';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { BUY_BONUS_ASSETS, startFsCongPreload } from '../game/uiHtmlAssetManifest';
	import { DUEL_PICK_CARD } from '../game/duelAssets';
	import ArchedRibbonTitle from './ArchedRibbonTitle.svelte';
	import DuelPickMascot from './DuelPickMascot.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const bgUrl = BUY_BONUS_ASSETS.menuBg;
	const cancelButtonBgUrl = BUY_BONUS_ASSETS.cancelButtonBg;
	const confirmButtonBgUrl = BUY_BONUS_ASSETS.confirmButtonBg;

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
	let knewaveFontReady = $state(false);
	let blurbBoxEl = $state<HTMLParagraphElement | undefined>();
	let blurbInnerEl = $state<HTMLSpanElement | undefined>();
	let blurbFontPx = $state<number | null>(null);

	startMascotSpinePreload();

	$effect(() => {
		if (!isOpen) pendingSide = null;
	});

	$effect(() => {
		let cancelled = false;
		void ensureKnewaveFontLoaded().then(() => {
			if (!cancelled) knewaveFontReady = true;
		});
		return () => {
			cancelled = true;
		};
	});

	const pickBlurb = $derived(context.i18nDerived.duelPickBlurb());

	const refitPickBlurb = () => {
		const box = blurbBoxEl;
		const inner = blurbInnerEl;
		if (!box || !inner || pendingSide != null) return;

		const maxW = box.clientWidth;
		const maxH = box.clientHeight;
		if (maxW <= 0 || maxH <= 0) return;

		const baseFs = Number.parseFloat(getComputedStyle(box).fontSize);
		if (!Number.isFinite(baseFs) || baseFs <= 0) return;

		const lineHeight = 1.25;
		const minFs = Math.max(10, baseFs * 0.42);

		const fits = (fs: number) => {
			inner.style.fontSize = `${fs}px`;
			const threeLineCap = fs * lineHeight * 3;
			const heightLimit = Math.min(maxH, threeLineCap);
			return inner.scrollWidth <= maxW + 1 && inner.scrollHeight <= heightLimit + 1;
		};

		if (fits(baseFs)) {
			blurbFontPx = baseFs;
			return;
		}

		let lo = minFs;
		let hi = baseFs;
		for (let i = 0; i < 16; i++) {
			const mid = (lo + hi) / 2;
			if (fits(mid)) lo = mid;
			else hi = mid;
		}
		blurbFontPx = lo;
		inner.style.fontSize = `${lo}px`;
	};

	$effect(() => {
		pickBlurb;
		pendingSide;
		isOpen;
		isPortrait;
		isPopout;
		isPopoutSmall;
		blurbFontPx = null;
		requestAnimationFrame(() => requestAnimationFrame(refitPickBlurb));
	});

	$effect(() => {
		const box = blurbBoxEl;
		if (!box) return;
		const observer = new ResizeObserver(() => refitPickBlurb());
		observer.observe(box);
		return () => observer.disconnect();
	});

	const sideTitle = (side: DuelSide) =>
		side === 'cat' ? context.i18nDerived.duelSideCat() : context.i18nDerived.duelSideDog();
	const sideShortDesc = (side: DuelSide) =>
		side === 'cat' ? context.i18nDerived.duelCatShortDesc() : context.i18nDerived.duelDogShortDesc();
	const sideLongDesc = (side: DuelSide) =>
		side === 'cat' ? context.i18nDerived.duelCatLongDesc() : context.i18nDerived.duelDogLongDesc();
	/** Split "A · B" into stacked lines so phrase halves wrap together. */
	const sideLongDescLines = (side: DuelSide) => {
		const raw = sideLongDesc(side).trim();
		const parts = raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
		return parts.length > 0 ? parts : [raw];
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

	const confirmPurchase = async () => {
		if (!pendingSide || !canBuy) return;
		clearActiveFeature();
		stateDuel.playerSide = pendingSide;
		const modeKey = pendingSide === 'cat' ? 'bonus_duel_cat' : 'bonus_duel_dog';
		stateModal.modal = null;
		pendingSide = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		void startFsCongPreload();
		await tick();
		await evictBuyBonusForFeature();
		stateBet.activeBetModeKey = modeKey;
		context.eventEmitter.broadcast({ type: 'bet' });
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (!isOpen) return;
		if (e.key === 'Escape') {
			if (pendingSide) cancelConfirm();
			else backToBuyMenu();
		}
	}}
/>

<div
	class="duel-pick-panel"
	class:portrait={isPortrait}
	class:popout-l={isPopout}
	class:popout-s={isPopoutSmall}
	class:confirm-open={pendingSide != null}
	role="dialog"
	aria-modal="true"
	aria-hidden={!isOpen}
	data-test="buy-duel-pick-overlay"
>
	<img class="panel-bg" src={bgUrl} alt="" draggable="false" loading="eager" />

	<div class="panel-content">
		<h2 class="pick-title" class:hidden={pendingSide != null}>
			<ArchedRibbonTitle text={context.i18nDerived.duelPickTitle()} archDeg={18} />
		</h2>

		<!-- Keep both Spine mascots mounted across pick ↔ confirm so they never reload. -->
		<section
			class="cards-section"
			class:confirm-mode={pendingSide != null}
			aria-label={pendingSide == null ? 'choose side' : 'confirm side'}
		>
			{#each ['dog', 'cat'] as side (side)}
				{@const pickArt = side === 'dog' ? DUEL_PICK_CARD.dog : DUEL_PICK_CARD.cat}
				{@const isSelected = pendingSide === side}
				{@const isParked = pendingSide != null && pendingSide !== side}
				<button
					type="button"
					class="side-card"
					class:side-dog={side === 'dog'}
					class:side-cat={side === 'cat'}
					class:is-selected={isSelected}
					class:is-parked={isParked}
					disabled={!canBuy || pendingSide != null}
					tabindex={pendingSide != null ? -1 : 0}
					data-test="buy-duel-side-{side}"
					aria-hidden={isParked}
					aria-label={sideTitle(side as DuelSide)}
					onclick={() => openConfirm(side as DuelSide)}
				>
					<span class="pick-card" class:confirm-hero={isSelected} aria-hidden="true">
						<img class="pick-card-layer pick-card-bg" src={pickArt.bg} alt="" draggable="false" />
						<span
							class="pick-card-mascot"
							class:mascot-dog={side === 'dog'}
							class:mascot-cat={side === 'cat'}
						>
							<DuelPickMascot
									species={side === 'dog' ? 'dog' : 'cat'}
									playing={isOpen && (pendingSide == null || isSelected)}
									fill
								/>
						</span>
						<img
							class="pick-card-layer pick-card-frame"
							src={pickArt.frame}
							alt=""
							draggable="false"
						/>
						<span class="pick-card-name">
							<ArchedRibbonTitle text={sideTitle(side as DuelSide)} archDeg={28} />
						</span>
						<span class="pick-card-meta">
							<span
								class="pick-card-tag"
								class:card-tag-knewave={knewaveFontReady}
								style:font-family={knewaveFontReady
									? BUY_BONUS_CARD_KNEWAVE_FONT_FAMILY
									: undefined}
							>{sideShortDesc(side as DuelSide)}</span>
							<span class="pick-card-sub">
								{#each sideLongDescLines(side as DuelSide) as line (line)}
									<span class="pick-card-sub-line">{line}</span>
								{/each}
							</span>
						</span>
						<span class="pick-card-price">{price}</span>
					</span>
				</button>
			{/each}
		</section>

		{#if pendingSide == null}
			<p class="pick-blurb" bind:this={blurbBoxEl}>
				<span
					class="pick-blurb-inner"
					bind:this={blurbInnerEl}
					style:font-size={blurbFontPx != null ? `${blurbFontPx}px` : undefined}
				>{pickBlurb}</span>
			</p>
			<footer class="pick-footer">
				<button
					type="button"
					class="action-btn cancel-btn"
					style:background-image="url('{cancelButtonBgUrl}')"
					data-test="buy-duel-pick-cancel"
					onclick={backToBuyMenu}
				>
					{context.i18nDerived.buyCancel()}
				</button>
			</footer>
		{:else}
			<footer class="confirm-actions">
				<button
					type="button"
					class="action-btn cancel-btn"
					style:background-image="url('{cancelButtonBgUrl}')"
					data-test="buy-duel-confirm-cancel"
					onclick={cancelConfirm}
				>
					{context.i18nDerived.buyCancel()}
				</button>
				<button
					type="button"
					class="action-btn confirm-btn"
					style:background-image="url('{confirmButtonBgUrl}')"
					disabled={!canBuy}
					data-test="buy-duel-confirm-button"
					onclick={confirmPurchase}
				>
					{context.i18nDerived.buyConfirm()}
				</button>
			</footer>
		{/if}
	</div>
</div>

<style lang="scss">
	@use './buyBonusPanelDimensions.scss' as *;
	@import url('https://fonts.googleapis.com/css2?family=Philosopher:wght@700&family=Reggae+One&display=swap');

	.duel-pick-panel {
		@include buy-bonus-action-fs-default;
		--bb-title-fs: calc(var(--panel-width) * 0.048);
		/* Same tracking as FreeSpinIntro CONGRATULATIONS / NORMAL BONUS. */
		--bb-title-tracking: 1.2;
		font-family: v-bind(HUD_BALANCE_BET_FONT_FAMILY);
		position: relative;
		z-index: 10;
		pointer-events: auto;
		@include buy-bonus-panel-dimensions(true);
	}

	.panel-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
		filter: drop-shadow(0 16px 42px rgba(0, 0, 0, 0.65));
	}

	.panel-content {
		position: absolute;
		inset: 0;
	}

	.pick-title {
		position: absolute;
		top: 11%;
		left: 10%;
		right: 10%;
		height: 10%;
		margin: 0;
		font-size: var(--bb-title-fs);
		pointer-events: none;

		&.hidden {
			visibility: hidden;
			opacity: 0;
		}
	}

	.cards-section {
		position: absolute;
		top: 22%;
		left: 50%;
		width: 88%;
		height: 47%;
		transform: translateX(-50%);
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		column-gap: calc(var(--panel-width) * 0.028);
		align-content: start;
		justify-items: center;
		box-sizing: border-box;
	}

	.side-card {
		appearance: none;
		display: block;
		width: 100%;
		max-width: 100%;
		padding: 0;
		margin: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		font-family: inherit;
		color: inherit;
		transition: transform 0.12s ease;

		&:active:not(:disabled) {
			transform: scale(0.98);
		}

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
		}

		&.is-selected:disabled {
			opacity: 1;
			cursor: default;
			transform: none;
		}
	}

	.cards-section.confirm-mode {
		/* Same binding as BuyBonusConfirmOverlay `.confirm-card-section`. */
		top: 10.5%;
		left: 50%;
		width: 66%;
		height: 70%;
		transform: translateX(-50%);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		grid-template-columns: none;
		column-gap: 0;
		box-sizing: border-box;

		.side-card.is-selected {
			width: 100%;
			max-width: 100%;
			flex: 0 0 auto;
			position: relative;
			z-index: 1;
		}

		.pick-card.confirm-hero {
			width: 100%;
			max-height: 100%;
			height: auto;
		}

		.pick-card-name {
			--bb-card-title-fs: clamp(1.15rem, 14cqw, 2.05rem);
			font-size: var(--bb-card-title-fs);
		}

		.pick-card-meta {
			bottom: 13.8%;
		}

		.pick-card-tag {
			font-size: clamp(1.2rem, 15cqw, 2.2rem);
		}

		.pick-card-sub {
			font-size: clamp(0.85rem, 10.5cqw, 1.55rem);
		}


		/* Keep the other Spine alive off-stack without remounting. */
		.side-card.is-parked {
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			opacity: 0;
			visibility: hidden;
			pointer-events: none;
			z-index: 0;
		}
	}

	.pick-card {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 437 / 625;
		container-type: size;
		container-name: duel-pick-card;
		@include buy-bonus-card-price-tall;
		filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45));
	}

	.pick-card-layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
	}

	.pick-card-bg {
		z-index: 0;
	}

	.pick-card-mascot {
		position: absolute;
		left: 4%;
		right: 4%;
		top: 10%;
		bottom: 12%;
		z-index: 1;
		overflow: hidden;
		pointer-events: none;
	}

	.pick-card-mascot.mascot-dog :global(.pick-spine.fill) {
		transform: scale(1.28) translateY(5%);
		transform-origin: 50% 78%;
	}

	.pick-card-mascot.mascot-cat :global(.pick-spine.fill) {
		transform: scale(1.72) translateY(6%);
		transform-origin: 50% 70%;
	}

	.pick-card-frame {
		z-index: 2;
	}

	.pick-card-name {
		position: absolute;
		left: 6%;
		right: 6%;
		top: 0.8%;
		height: 12%;
		z-index: 3;
		margin: 0;
		padding: 0;
		/* Same proxima-nova as FreeSpinIntro CONGRATULATIONS / NORMAL BONUS. */
		--bb-card-title-fs: clamp(0.75rem, 10cqw, 1.35rem);
		font-size: var(--bb-card-title-fs);
		pointer-events: none;
	}

	.pick-card-meta {
		position: absolute;
		left: 6%;
		right: 6%;
		bottom: 13.8%;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 0.12em;
		pointer-events: none;
	}

	.pick-card-tag {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: clamp(0.95rem, 12cqw, 1.85rem);
		font-weight: 900;
		line-height: 0.9;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: #ffe08a;
		paint-order: stroke fill;
		-webkit-font-smoothing: antialiased;
		-webkit-text-stroke: 0.07em rgba(48, 22, 6, 0.94);
		text-shadow:
			0 0.04em 0 rgba(48, 22, 6, 0.75),
			0 0.07em 0.1em rgba(0, 0, 0, 0.5);
	}

	.pick-card-tag.card-tag-knewave {
		-webkit-text-stroke: 0.06em rgba(48, 22, 6, 0.94);
	}

	.pick-card-sub {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.06em;
		max-width: 100%;
		font-family: 'proxima-nova', sans-serif;
		font-size: clamp(0.68rem, 8.4cqw, 1.3rem);
		font-weight: 800;
		font-synthesis: none;
		line-height: 1.05;
		letter-spacing: 0.02em;
		text-align: center;
		text-transform: none;
		color: #f0d9a8;
		opacity: 0.92;
		paint-order: stroke fill;
		-webkit-font-smoothing: antialiased;
		-webkit-text-stroke: 0.045em rgba(48, 22, 6, 0.9);
		text-shadow: 0 0.05em 0.08em rgba(0, 0, 0, 0.45);
		user-select: none;
		pointer-events: none;
	}

	.pick-card-sub-line {
		display: block;
		max-width: 100%;
		white-space: nowrap;
		font: inherit;
		letter-spacing: inherit;
		line-height: inherit;
		text-align: center;
		color: inherit;
		-webkit-text-fill-color: inherit;
		text-shadow: inherit;
		-webkit-text-stroke: inherit;
		paint-order: inherit;
	}

	.pick-card-price {
		/* Same binding as BuyBonusConfirmOverlay `.card-price-wrap` — centered in the gold plate on all sizes. */
		position: absolute;
		left: 14%;
		right: 14%;
		bottom: 0.5%;
		width: auto;
		height: 12.5%;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		box-sizing: border-box;
		@include buy-bonus-card-price-text;
		pointer-events: none;
		transform: translate(0.06em, 0.16em);
	}

	.pick-blurb {
		position: absolute;
		top: 69.5%;
		left: 8%;
		right: 8%;
		height: 9.5%;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		padding: 0 1.5%;
		overflow: hidden;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.04);
		font-weight: 800;
		font-synthesis: none;
		line-height: 1.25;
		letter-spacing: 0.01em;
		text-align: center;
		color: #f0d9a8;
		opacity: 0.95;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
		user-select: none;
		pointer-events: none;
	}

	.pick-blurb-inner {
		display: block;
		width: 100%;
		max-width: 100%;
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		line-height: inherit;
		letter-spacing: inherit;
		text-align: center;
		white-space: normal;
		overflow-wrap: break-word;
		word-break: normal;
		color: inherit;
		-webkit-text-fill-color: inherit;
		text-shadow: inherit;
	}

	.pick-footer {
		@include buy-bonus-action-footer;
		/* Single Back — same button box as confirm pair; just centered alone. */
		gap: 0;
	}

	.confirm-hero {
		width: 100%;
		max-height: 100%;
	}

	.confirm-actions {
		@include buy-bonus-action-footer;
	}

	.action-btn {
		@include buy-bonus-action-btn;
	}

	.duel-pick-panel:not(.portrait):not(.popout-l):not(.popout-s) {
		@include buy-bonus-action-fs-desktop;
	}

	.duel-pick-panel.portrait:not(.popout-l):not(.popout-s) {
		@include buy-bonus-action-fs-portrait;
		--bb-title-fs: calc(var(--panel-width) * 0.052);

		.cards-section {
			top: 21.5%;
			width: 90%;
			height: 47%;
			column-gap: calc(var(--panel-width) * 0.024);
		}

		.pick-card-name {
			--bb-card-title-fs: clamp(1.05rem, 14cqw, 1.9rem);
			font-size: var(--bb-card-title-fs);
		}

		.pick-card-meta {
			bottom: 13.5%;
		}

		.pick-card-tag {
			font-size: clamp(1.45rem, 18cqw, 2.5rem);
		}

		.pick-card-sub {
			font-size: clamp(0.95rem, 12.5cqw, 1.75rem);
		}

		.pick-blurb {
			top: 69%;
			font-size: calc(var(--panel-width) * 0.044);
		}

		.pick-footer,
		.confirm-actions {
			left: 10%;
			right: 10%;
			gap: calc(var(--panel-width) * 0.06);
		}

		.pick-footer {
			gap: 0;
		}

		.cards-section.confirm-mode {
			top: 10.5%;
			width: 66%;
			height: 70%;

			.pick-card-name {
				--bb-card-title-fs: clamp(1.4rem, 17cqw, 2.45rem);
				font-size: var(--bb-card-title-fs);
			}

			.pick-card-meta {
				bottom: 13.5%;
			}

			.pick-card-tag {
				font-size: clamp(1.75rem, 21cqw, 3rem);
			}

			.pick-card-sub {
				font-size: clamp(1.15rem, 14.5cqw, 2.1rem);
			}

		}
	}

	.duel-pick-panel.popout-l {
		@include buy-bonus-action-fs-desktop;
		--bb-title-fs: calc(var(--panel-width) * 0.044);

		.cards-section {
			top: 21%;
			width: 88%;
			column-gap: calc(var(--panel-width) * 0.022);
		}

		.cards-section.confirm-mode {
			top: 10.5%;
			width: 66%;
			height: 70%;

			.pick-card-name {
				--bb-card-title-fs: clamp(0.95rem, 13cqw, 1.55rem);
				font-size: var(--bb-card-title-fs);
			}

			.pick-card-meta {
				bottom: 13.8%;
			}

			.pick-card-tag {
				font-size: clamp(1rem, 14cqw, 1.65rem);
			}

			.pick-card-sub {
				font-size: clamp(0.72rem, 9.5cqw, 1.15rem);
			}

		}

		.pick-card-name {
			--bb-card-title-fs: clamp(0.65rem, 10cqw, 1.1rem);
			font-size: var(--bb-card-title-fs);
		}

		.pick-card-meta {
			bottom: 13.8%;
		}

		.pick-card-tag {
			font-size: clamp(0.7rem, 11cqw, 1.1rem);
		}

		.pick-card-sub {
			font-size: clamp(0.52rem, 7.5cqw, 0.8rem);
		}

		.pick-blurb {
			font-size: calc(var(--panel-width) * 0.034);
		}
	}

	.duel-pick-panel.popout-s {
		@include buy-bonus-action-fs-desktop;
		--bb-title-fs: calc(var(--panel-width) * 0.042);

		.pick-title {
			top: 11%;
		}

		.cards-section {
			top: 21%;
			width: 90%;
			height: 47%;
			column-gap: calc(var(--panel-width) * 0.02);
		}

		.pick-card-name {
			--bb-card-title-fs: clamp(0.55rem, 10cqw, 0.85rem);
			font-size: var(--bb-card-title-fs);
		}

		.pick-card-meta {
			bottom: 13%;
		}

		.pick-card-tag {
			font-size: clamp(0.5rem, 11cqw, 0.75rem);
		}

		.pick-card-sub {
			font-size: clamp(0.38rem, 7.2cqw, 0.58rem);
		}

		.pick-blurb {
			top: 69%;
			font-size: calc(var(--panel-width) * 0.034);
		}

		.cards-section.confirm-mode {
			top: 10.5%;
			width: 66%;
			height: 70%;

			.pick-card-name {
				--bb-card-title-fs: clamp(0.8rem, 13cqw, 1.25rem);
				font-size: var(--bb-card-title-fs);
			}

			.pick-card-meta {
				bottom: 13%;
			}

			.pick-card-tag {
				font-size: clamp(0.85rem, 14cqw, 1.35rem);
			}

			.pick-card-sub {
				font-size: clamp(0.55rem, 9.5cqw, 0.95rem);
			}

		}

		.pick-card-mascot.mascot-dog :global(.pick-spine.fill) {
			transform: scale(1.2) translateY(4%);
		}

		.pick-card-mascot.mascot-cat :global(.pick-spine.fill) {
			transform: scale(1.55) translateY(5%);
		}
	}

	@media (max-width: 600px) {
		.duel-pick-panel:not(.popout-l):not(.popout-s) {
			.pick-footer,
			.confirm-actions {
				top: 78%;
				height: 12%;
			}
		}
	}
</style>
