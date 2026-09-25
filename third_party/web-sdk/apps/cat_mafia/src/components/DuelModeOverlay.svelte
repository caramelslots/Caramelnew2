<!--
	Duel HTML chrome — character pick, race header, VS, spin counters, outro.
	Desks / reels / paylines / under-board WIN live in DuelPixiBoard (Pixi).
-->
<script lang="ts" module>
	export type EmitterEventDuel =
		| { type: 'duelPickShow' }
		| { type: 'duelPickHide' }
		| { type: 'duelPickUpdate' }
		| { type: 'duelPickWarm' }
		| { type: 'duelOutroShow' }
		| { type: 'duelOutroHide' }
		| {
				type: 'duelOutroUpdate';
				dogTotal: number;
				catTotal: number;
				winner: 'cat' | 'dog';
				playerSide: 'cat' | 'dog';
				playerWon: boolean;
				payout: number;
		  };
</script>

<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { OnHotkey } from 'components-shared';

	import { stateBet } from 'state-shared';

	import assets from '../game/assets';
	import { getContext } from '../game/context';
	import { CAT_MEOW_SOUNDS, DOG_BARK_SOUNDS } from '../game/sound';
	import { stateGame } from '../game/stateGame.svelte';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { computeDuelScreenLayout, getDuelSpinCounterBox } from '../game/duelLayout';
	import {
		DUEL_BANK_SCALE,
		DUEL_BANK_SCALE_PAW_SRC,
		DUEL_BANK_SCALE_SRC,
		DUEL_CAT_FACE_AVATAR_SRC,
		DUEL_DOG_FACE_AVATAR_SRC,
		DUEL_PICK_CARD,
	} from '../game/duelAssets';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { HUD_ASSETS } from '../game/uiHtmlAssetManifest';
	import PressToContinueHtml from './PressToContinueHtml.svelte';
	import DuelPickMascot from './DuelPickMascot.svelte';
	import DuelBankTotalBitmapHtml from './DuelBankTotalBitmapHtml.svelte';

	const context = getContext();

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());
	const baseBoardLayout = $derived(context.stateGameDerived.baseBoardLayout());
	const isPortrait = $derived(layoutType === 'portrait');
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const show = $derived(stateDuel.active && !stateGame.duelIntroActive);

	const duelLayout = $derived(
		computeDuelScreenLayout({
			canvasWidth: canvasSizes.width,
			canvasHeight: canvasSizes.height,
			layoutType,
			mainLayout,
			boardLayout: baseBoardLayout,
		}),
	);
	const dogCounterBox = $derived(getDuelSpinCounterBox(duelLayout, 'dog'));
	const catCounterBox = $derived(getDuelSpinCounterBox(duelLayout, 'cat'));
	const plaqueUrl = HUD_ASSETS.autoplay;

	let pickShow = $state(false);
	let outroShow = $state(false);
	let outroDog = $state(0);
	let outroCat = $state(0);
	let outroWinner = $state<'cat' | 'dog'>('cat');
	let outroPlayerSide = $state<'cat' | 'dog'>('cat');
	let outroPlayerWon = $state(false);
	let outroPayout = $state(0);
	let onPickContinue = $state(() => {});
	let onOutroContinue = $state(() => {});

	const money = (bookCents: number) => bookEventAmountToCurrencyString(bookCents);

	const outroBgUrl = assets.fsCongBg.src;
	const outroFrameUrl = assets.fsCongFrame.src;
	const isPopoutLarge = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

	const outroPlayerTotal = $derived(outroPlayerSide === 'cat' ? outroCat : outroDog);
	const outroEnemyTotal = $derived(outroPlayerSide === 'cat' ? outroDog : outroCat);
	const lossTitle = $derived(context.i18nDerived.duelOutroLossTitle());
	const lossEnemyLabel = $derived(context.i18nDerived.duelOutroLossEnemy());
	const lossYouLabel = $derived(context.i18nDerived.duelOutroLossYou());
	const lossEnemyAmount = $derived(money(outroEnemyTotal));
	const lossYouAmount = $derived(money(outroPlayerTotal));

	/** Cloud spine sits in Pixi (z50) — hide HTML chrome/modals so they stay under it. */
	const underCloud = $derived(stateGame.transitionActive);
	const portraitAvatarSize = $derived(Math.round(Math.min(88, duelLayout.boardWidth * 0.28)));
	const pickOpen = $derived(pickShow && !underCloud);
	const PORTRAIT_VOCAL_COOLDOWN_MS = 1000;
	let portraitCatVocal = 0;
	let portraitDogVocal = 0;
	let portraitVocalLockedUntil = 0;

	const playPortraitVocal = (side: 'cat' | 'dog') => {
		const now = performance.now();
		if (now < portraitVocalLockedUntil) return;
		portraitVocalLockedUntil = now + PORTRAIT_VOCAL_COOLDOWN_MS;
		const bank = side === 'dog' ? DOG_BARK_SOUNDS : CAT_MEOW_SOUNDS;
		const index = side === 'dog' ? portraitDogVocal : portraitCatVocal;
		const name = bank[index % bank.length];
		if (side === 'dog') portraitDogVocal += 1;
		else portraitCatVocal += 1;
		context.eventEmitter.broadcast({ type: 'soundOnce', name, forcePlay: true });
	};

	/** Dog share of combined banks (0..1). Both zero → 50/50. */
	const dogBankShare = $derived.by(() => {
		const dog = stateDuel.dogTotal;
		const cat = stateDuel.catTotal;
		const sum = dog + cat;
		if (sum <= 0) return 0.5;
		return dog / sum;
	});
	/** Combined dog+cat bank (book cents) — scale plaque shows TOTAL $… */
	const combinedBankCents = $derived(stateDuel.dogTotal + stateDuel.catTotal);
	const combinedBankAmount = $derived(money(combinedBankCents));
	const combinedBankWinPrefix = $derived(context.i18nDerived.duelBankTotal().toUpperCase());
	/** Paw centre: dog lead → left, cat lead → right; 50/50 pinned to VS. */
	const bankPawLeftFrac = $derived.by(() => {
		const share = dogBankShare;
		const { trackLeft, trackRight, trackCenter } = DUEL_BANK_SCALE;
		if (share >= 0.5) {
			const t = (share - 0.5) * 2;
			return trackCenter + (trackLeft - trackCenter) * t;
		}
		const t = (0.5 - share) * 2;
		return trackCenter + (trackRight - trackCenter) * t;
	});
	const bankRatioLeft = $derived(duelLayout.dogCenter.x - duelLayout.boardWidth * 0.5);
	const bankRatioFullWidth = $derived(
		duelLayout.catCenter.x +
			duelLayout.boardWidth * 0.5 -
			(duelLayout.dogCenter.x - duelLayout.boardWidth * 0.5),
	);
	/**
	 * Desktop keeps full scale; Popout S/L use nearly the same size, slightly
	 * smaller, and clamp above BALANCE/BET so the plaque doesn't cover HUD.
	 */
	const bankRatioWidthFrac = $derived(isPopout ? 0.76 : 0.86);
	const bankRatioWidth = $derived(bankRatioFullWidth * bankRatioWidthFrac);
	const bankRatioCenteredLeft = $derived(
		bankRatioLeft + (bankRatioFullWidth - bankRatioWidth) * 0.5,
	);
	const bankScaleHeight = $derived(bankRatioWidth / DUEL_BANK_SCALE.aspect);
	const bankTotalMaxWidth = $derived(bankRatioWidth * DUEL_BANK_SCALE.plaqueWidth * 0.98);
	const bankTotalMaxHeight = $derived(bankScaleHeight * DUEL_BANK_SCALE.plaqueHeight * 0.9);
	/**
	 * Anchor to desk bottoms (not HUD reserve) so the scale keeps the same
	 * relative spot on every landscape / tablet size. Popout L clamps above
	 * BALANCE/BET. Popout S allows the lower half of the art into the HUD
	 * band — otherwise preferred never lands (maxTop already equals the floor).
	 */
	const bankRatioTop = $derived.by(() => {
		const deskBottom =
			Math.max(duelLayout.dogCenter.y, duelLayout.catCenter.y) +
			duelLayout.boardHeight * 0.5;
		const scaleH = bankRatioWidth / DUEL_BANK_SCALE.aspect;

		// Phones keep the tighter tuck under the desks.
		if (isPopoutSmall || isPortrait) {
			const preferred = deskBottom - Math.round(duelLayout.boardHeight * 0.04);
			const maxTop = canvasSizes.height - Math.round(scaleH * 0.78);
			return Math.min(preferred, maxTop);
		}

		if (isPopout) {
			const hudTop = canvasSizes.height - duelLayout.hudReserve * 0.7;
			const preferred = deskBottom + Math.round(duelLayout.boardHeight * 0.04);
			const maxTop = hudTop - Math.round(scaleH * 0.8) - 2;
			return Math.min(preferred, maxTop);
		}

		// Desktop: tuck the scale under the desks (menu stays put).
		// Only the WIN sum text is nudged lower via `.bank-ratio-total`.
		const gap = Math.round(duelLayout.boardHeight * -0.035);
		return deskBottom + gap;
	});

	const chooseSide = (side: DuelSide) => {
		if (!pickShow) return;
		stateDuel.playerSide = side;
		stateBet.activeBetModeKey = side === 'cat' ? 'bonus_duel_cat' : 'bonus_duel_dog';
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		pickShow = false;
		onPickContinue();
	};

	context.eventEmitter.subscribeOnMount({
		duelIntroShow: () => {
			pickShow = false;
		},
		duelPickShow: () => {
			pickShow = true;
		},
		duelPickHide: () => {
			pickShow = false;
		},
		duelPickUpdate: async () => {
			await waitForResolve((resolve) => (onPickContinue = resolve));
		},
		duelOutroShow: () => {
			outroShow = true;
		},
		duelOutroHide: () => {
			outroShow = false;
		},
		duelOutroUpdate: async (event) => {
			outroDog = event.dogTotal;
			outroCat = event.catTotal;
			outroWinner = event.winner;
			outroPlayerSide = event.playerSide;
			outroPlayerWon = event.playerWon;
			outroPayout = event.payout;
			await waitForResolve((resolve) => (onOutroContinue = resolve));
		},
	});
</script>

{#if show && !underCloud}
	<div
		class="duel-root"
		class:portrait={isPortrait}
		class:popout-s={isPopoutSmall}
		data-test="duel-mode-overlay"
		transition:fade={{ duration: 220 }}
	>
		{#if !isPortrait}
			<header class="duel-header">
				<span class="title">DUEL</span>
			</header>
		{/if}

		<div
			class="counter dog-counter"
			class:active={stateDuel.activeSide === 'dog'}
			style:left="{dogCounterBox.left}px"
			style:top="{dogCounterBox.top}px"
			style:width="{dogCounterBox.width}px"
			style:height="{dogCounterBox.height}px"
			style:font-size="{dogCounterBox.fontSize}px"
			style:background-image="url('{plaqueUrl}')"
			data-test="duel-counter-dog"
			aria-label="{stateDuel.dogSpinIndex}/{stateDuel.totalSpinsPerSide}"
		>
			<span class="counter-value">{stateDuel.dogSpinIndex}/{stateDuel.totalSpinsPerSide}</span>
		</div>

		<div
			class="counter cat-counter"
			class:active={stateDuel.activeSide === 'cat'}
			style:left="{catCounterBox.left}px"
			style:top="{catCounterBox.top}px"
			style:width="{catCounterBox.width}px"
			style:height="{catCounterBox.height}px"
			style:font-size="{catCounterBox.fontSize}px"
			style:background-image="url('{plaqueUrl}')"
			data-test="duel-counter-cat"
			aria-label="{stateDuel.catSpinIndex}/{stateDuel.totalSpinsPerSide}"
		>
			<span class="counter-value">{stateDuel.catSpinIndex}/{stateDuel.totalSpinsPerSide}</span>
		</div>

		{#if isPortrait}
			<button
				type="button"
				class="board-face top-right face-flip"
				aria-label={context.i18nDerived.duelSideDog()}
				style:width="{portraitAvatarSize}px"
				style:height="{portraitAvatarSize}px"
				style:left="{duelLayout.dogCenter.x +
					duelLayout.boardWidth * 0.5 -
					portraitAvatarSize * 0.72}px"
				style:top="{duelLayout.dogCenter.y -
					duelLayout.boardHeight * 0.5 -
					portraitAvatarSize * 0.18}px"
				style:background-image="url('{DUEL_DOG_FACE_AVATAR_SRC}')"
				onclick={() => playPortraitVocal('dog')}
			></button>
			<button
				type="button"
				class="board-face bottom-left face-flip"
				aria-label={context.i18nDerived.duelSideCat()}
				style:width="{portraitAvatarSize}px"
				style:height="{portraitAvatarSize}px"
				style:left="{duelLayout.catCenter.x -
					duelLayout.boardWidth * 0.5 -
					portraitAvatarSize * 0.18}px"
				style:top="{duelLayout.catCenter.y +
					duelLayout.boardHeight * 0.5 -
					portraitAvatarSize * 0.72}px"
				style:background-image="url('{DUEL_CAT_FACE_AVATAR_SRC}')"
				onclick={() => playPortraitVocal('cat')}
			></button>
		{/if}

		{#if !isPortrait}
			<div
				class="bank-ratio"
				style:left="{bankRatioCenteredLeft}px"
				style:width="{bankRatioWidth}px"
				style:top="{bankRatioTop}px"
				style:--paw-top={DUEL_BANK_SCALE.trackY}
				style:--paw-w={DUEL_BANK_SCALE.pawWidthFrac}
				style:--paw-h={DUEL_BANK_SCALE.pawHeightFrac}
				style:--plaque-left={DUEL_BANK_SCALE.plaqueLeft}
				style:--plaque-width={DUEL_BANK_SCALE.plaqueWidth}
				style:--plaque-top={DUEL_BANK_SCALE.plaqueTop}
				style:--plaque-height={DUEL_BANK_SCALE.plaqueHeight}
				data-test="duel-bank-ratio"
				role="img"
				aria-label="{combinedBankWinPrefix} {combinedBankAmount}. Dog {Math.round(
					dogBankShare * 100,
				)} percent, Cat {Math.round((1 - dogBankShare) * 100)} percent"
			>
				<img
					class="bank-ratio-scale"
					src={DUEL_BANK_SCALE_SRC}
					alt=""
					draggable="false"
					aria-hidden="true"
				/>
				<img
					class="bank-ratio-paw"
					src={DUEL_BANK_SCALE_PAW_SRC}
					alt=""
					draggable="false"
					aria-hidden="true"
					style:left="{(bankPawLeftFrac * 100).toFixed(3)}%"
				/>
				<span class="bank-ratio-total" data-test="duel-bank-total">
					{#if !underCloud}
						<DuelBankTotalBitmapHtml
							amount={combinedBankCents}
							prefix={combinedBankWinPrefix}
							maxWidth={bankTotalMaxWidth}
							maxHeight={bankTotalMaxHeight}
						/>
					{/if}
				</span>
			</div>
		{/if}
	</div>
{/if}

{#if pickOpen}
	<div
		class="duel-modal pick-modal"
		class:open={pickOpen}
		class:portrait={isPortrait}
		class:popout-s={isPopoutSmall}
		data-test="duel-pick"
		role="dialog"
		aria-modal="true"
		aria-hidden={!pickOpen}
		aria-label="Choose your side"
	>
		<div class="pick-stage">
			<p class="eyebrow">DUEL</p>
			<h2 class="pick-title">CHOOSE YOUR SIDE</h2>
			<div class="pick-mascots">
				<button
					type="button"
					class="pick-mascot dog"
					data-test="duel-pick-dog"
					aria-label="Play as Dog"
					tabindex={pickShow ? 0 : -1}
					onclick={() => chooseSide('dog')}
				>
					<span class="pick-card" aria-hidden="true">
						<img class="pick-card-layer pick-card-bg" src={DUEL_PICK_CARD.dog.bg} alt="" draggable="false" />
						<span class="pick-card-mascot">
							<DuelPickMascot species="dog" mirror playing={pickShow} fill />
						</span>
						<img
							class="pick-card-layer pick-card-frame"
							src={DUEL_PICK_CARD.dog.frame}
							alt=""
							draggable="false"
						/>
						<span class="pick-card-name">DOG</span>
					</span>
				</button>
				<button
					type="button"
					class="pick-mascot cat"
					data-test="duel-pick-cat"
					aria-label="Play as Cat"
					tabindex={pickShow ? 0 : -1}
					onclick={() => chooseSide('cat')}
				>
					<span class="pick-card" aria-hidden="true">
						<img class="pick-card-layer pick-card-bg" src={DUEL_PICK_CARD.cat.bg} alt="" draggable="false" />
						<span class="pick-card-mascot">
							<DuelPickMascot playing={pickShow} fill />
						</span>
						<img
							class="pick-card-layer pick-card-frame"
							src={DUEL_PICK_CARD.cat.frame}
							alt=""
							draggable="false"
						/>
						<span class="pick-card-name">CAT</span>
					</span>
				</button>
			</div>
		</div>
	</div>
{/if}

{#if outroShow}
	<div
		class="duel-modal"
		transition:fade={{ duration: 200 }}
		data-test="duel-outro"
		role="button"
		tabindex="0"
		onclick={() => onOutroContinue()}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onOutroContinue();
			}
		}}
	>
		<div
			class="loss-board"
			class:portrait={isPortrait}
			class:popout-l={isPopoutLarge}
			class:popout-s={isPopoutSmall}
			role="presentation"
			in:scale={{ duration: 320, easing: backOut, start: 0.88, opacity: 0 }}
			out:scale={{ duration: 200, easing: cubicOut, start: 0.95, opacity: 0 }}
		>
			<img class="layer layer-bg" src={outroBgUrl} alt="" draggable="false" loading="eager" />
			<img class="layer layer-frame" src={outroFrameUrl} alt="" draggable="false" loading="eager" />
			<div class="board-content">
				<div class="content-safe">
					<h2 class="loss-title">{lossTitle}</h2>
					<div class="loss-row enemy">
						<span class="loss-label">{lossEnemyLabel}</span>
						<span class="loss-amount">{lossEnemyAmount}</span>
					</div>
					<div class="loss-divider" aria-hidden="true"></div>
					<div class="loss-row you">
						<span class="loss-label">{lossYouLabel}</span>
						<span class="loss-amount">{lossYouAmount}</span>
					</div>
				</div>
			</div>
		</div>
		<PressToContinueHtml />
	</div>
	<OnHotkey hotkey="Space" disabled={!outroShow} onpress={() => onOutroContinue()} />
{/if}

<style lang="scss">
	.duel-root {
		position: fixed;
		inset: 0;
		z-index: 41;
		pointer-events: none;
	}

	.duel-header {
		position: absolute;
		top: 1.1vh;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		z-index: 2;
		pointer-events: none;
		/* Same face as under-board WIN (`WinHudHtmlOverlay`). */
		filter: drop-shadow(0 1px 0 #e8c878) drop-shadow(0 3px 0 #4a3008)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}

	.duel-header .title {
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		letter-spacing: 0.12em;
		font-size: clamp(1.85rem, 4.3vw, 3.35rem);
		text-transform: uppercase;
		line-height: 1;
		color: #e8b84a;
		background: linear-gradient(180deg, #f0d070 0%, #e0a838 38%, #c07014 72%, #8a4e0c 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.counter {
		position: absolute;
		z-index: 2;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-position: center;
		line-height: 1;
		/* Centre plaque on gold-rail anchor (same as phone FS autoplay frame). */
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.counter.active {
		filter: brightness(1.08);
	}

	/* Same face as under-board WIN (`WinHudHtmlOverlay`). */
	.counter-value {
		flex-shrink: 0;
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.04em;
		color: #e8b84a;
		background: linear-gradient(180deg, #f0d070 0%, #e0a838 38%, #c07014 72%, #8a4e0c 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 1px 0 #e8c878) drop-shadow(0 3px 0 #4a3008)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
		white-space: nowrap;
	}

	.duel-root.portrait .duel-header {
		top: 0.6vh;
		gap: 0.35rem;
	}

	.duel-root.portrait .duel-header .title {
		font-size: clamp(1.55rem, 7vw, 2.1rem);
		letter-spacing: 0.18em;
	}

	.duel-root.popout-s .duel-header {
		top: 0.2vh;
		gap: 0.1rem;
	}

	.duel-root.popout-s .duel-header .title {
		font-size: clamp(1.1rem, 4.5vh, 1.6rem);
		letter-spacing: 0.1em;
	}

	.board-face {
		/* fixed + above HUD (44) so phone taps aren't lost under the portrait overlay. */
		position: fixed;
		z-index: 46;
		padding: 0;
		border-radius: 50%;
		background-color: #2a1810;
		background-size: cover;
		background-position: center 28%;
		background-repeat: no-repeat;
		cursor: pointer;
		pointer-events: auto;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		border: 2px solid rgba(255, 214, 120, 0.85);
		box-shadow:
			0 4px 14px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(0, 0, 0, 0.35);
	}

	/* Static face art faces outward — mirror so dog looks left, cat looks right (toward desks). */
	.board-face.face-flip {
		transform: scaleX(-1);
	}


	.bank-ratio {
		position: absolute;
		z-index: 2;
		pointer-events: none;
		aspect-ratio: 1500 / 270;
		filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
	}

	.bank-ratio-scale {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		user-select: none;
		-webkit-user-drag: none;
	}

	.bank-ratio-paw {
		position: absolute;
		top: calc(var(--paw-top, 0.422) * 100%);
		width: calc(var(--paw-w, 0.06) * 100%);
		height: calc(var(--paw-h, 0.35) * 100%);
		object-fit: contain;
		transform: translate(-50%, -50%);
		transition: left 420ms cubic-bezier(0.22, 1, 0.36, 1);
		user-select: none;
		-webkit-user-drag: none;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.55));
	}

	/* Layout slot only — TOTAL/$ text keeps proxima-nova via DuelBankTotalBitmapHtml. */
	.bank-ratio-total {
		position: absolute;
		left: calc(var(--plaque-left, 0.3) * 100%);
		top: calc(var(--plaque-top, 0.68) * 100%);
		width: calc(var(--plaque-width, 0.4) * 100%);
		height: calc(var(--plaque-height, 0.27) * 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0 0.15em;
		box-sizing: border-box;
		pointer-events: none;
		user-select: none;
		transform: translateY(0%);
	}

.duel-modal {
		position: fixed;
		inset: 0;
		/* Below Pixi cloud stage (z50) so transition always covers this UI. */
		z-index: 48;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		background: rgba(6, 4, 12, 0.55);
		pointer-events: auto;
		cursor: pointer;
	}

	.pick-modal {
		cursor: default;
		background: rgba(6, 4, 12, 0.72);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.2s ease,
			visibility 0.2s ease;
	}

	.pick-modal.open {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
	}

	.pick-stage {
		/* Viewport-only tokens (no % of self) so card size stays stable everywhere. */
		--pick-gap: clamp(14px, 2.8vw, 40px);
		--pick-card: min(340px, 34vw, calc(68vh * 437 / 625), calc((90vw - var(--pick-gap)) / 2));
		--pick-title-size: clamp(1.15rem, 3.6vw, 2.1rem);
		--pick-name-size: clamp(0.72rem, 2vw, 1.15rem);

		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: clamp(0.55rem, 2.2vh, 1.1rem);
		padding: clamp(1.1rem, 7vh, 3.25rem) clamp(0.6rem, 2vw, 1.4rem) clamp(0.35rem, 2vh, 1.2rem);
		width: min(960px, 96vw);
		max-width: 100%;
		max-height: 100%;
		box-sizing: border-box;
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		color: #f6e8c8;
		text-align: center;
		pointer-events: auto;
	}

	.pick-title {
		margin: 0.05rem 0 clamp(0.55rem, 2vh, 1.15rem);
		font-size: var(--pick-title-size);
		letter-spacing: 0.06em;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
	}

	.pick-mascots {
		display: grid;
		grid-template-columns: repeat(2, var(--pick-card));
		column-gap: var(--pick-gap);
		row-gap: var(--pick-gap);
		width: max-content;
		max-width: 100%;
		justify-content: center;
		box-sizing: border-box;
	}

	.pick-mascot {
		appearance: none;
		border: 0;
		background: transparent;
		padding: 0;
		margin: 0;
		display: block;
		width: 100%;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
		cursor: pointer;
		color: #f6e8c8;
		font-family: inherit;
		filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.55));
		transition:
			transform 0.14s ease,
			filter 0.14s ease;

		&:hover {
			transform: translateY(-6px) scale(1.03);
			filter: drop-shadow(0 18px 34px rgba(0, 0, 0, 0.6))
				drop-shadow(0 0 22px rgba(255, 200, 90, 0.28));
		}

		&:active {
			transform: translateY(-2px) scale(1.01);
		}
	}

	.pick-card {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 437 / 625;
		min-width: 0;
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
		/* Clear window inside the gold frame (measured on 437×625 art). */
		left: 7%;
		right: 7%;
		top: 13.5%;
		bottom: 15%;
		z-index: 1;
		overflow: hidden;
		pointer-events: none;
	}

	.pick-card-frame {
		z-index: 2;
	}

	.pick-card-name {
		position: absolute;
		left: 12%;
		right: 12%;
		/* Sit higher in the arched ribbon. */
		top: 0.6%;
		height: 9%;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-bottom: 0.35%;
		font-size: clamp(0.75rem, 2.1vw, 1.25rem);
		letter-spacing: 0.14em;
		line-height: 1;
		color: #f8ecd0;
		text-shadow:
			0 1px 0 rgba(40, 18, 8, 0.85),
			0 2px 6px rgba(0, 0, 0, 0.55);
		pointer-events: none;
	}

	/* Phone portrait — same tokens, stacked column. */
	.pick-modal.portrait .pick-stage {
		--pick-gap: clamp(14px, 2.8vh, 24px);
		--pick-card: min(260px, 58vw, calc(52vh * 437 / 625));
		--pick-title-size: clamp(1.25rem, 6.5vw, 1.75rem);
		--pick-name-size: clamp(0.82rem, 3.6vw, 1rem);
		width: min(320px, 92vw);
		padding-top: clamp(0.85rem, 5vh, 2rem);
		max-height: min(92vh, 100%);
		overflow: auto;
	}

	.pick-modal.portrait .pick-mascots {
		grid-template-columns: var(--pick-card);
	}

	.pick-modal.portrait .pick-mascot:hover {
		transform: translateY(-4px) scale(1.02);
	}

	.loss-board {
		--panel-width: min(860px, 98vw);
		position: relative;
		width: var(--panel-width);
		aspect-ratio: calc(2000 / 1500);
		max-height: 82vh;
		pointer-events: none;
		filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.75));
	}

	.layer {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		user-select: none;
		pointer-events: none;
	}

	.layer-bg {
		z-index: 0;
	}

	.layer-frame {
		z-index: 1;
	}

	.board-content {
		position: absolute;
		inset: 0;
		z-index: 2;
	}

	/* Keep clear of gold frame + bottom paw medallion. */
	.content-safe {
		position: absolute;
		top: 26%;
		left: 16%;
		right: 16%;
		bottom: 28%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: calc(var(--panel-width) * 0.01);
		box-sizing: border-box;
		text-align: center;
		overflow: hidden;
	}

	.loss-title {
		margin: 0;
		width: 100%;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.046);
		font-weight: 800;
		line-height: 1.05;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #ffe28a;
		text-shadow:
			0 1px 0 #fff3b0,
			0 2px 0 #5a3a0e,
			0 4px 10px rgba(0, 0, 0, 0.55);
	}

	.loss-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: calc(var(--panel-width) * 0.004);
		width: 100%;
		padding: 0 2%;
		box-sizing: border-box;
	}

	.loss-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.022);
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #f5e0c0;
		text-shadow:
			0 1px 0 #000,
			1px 1px 3px rgba(0, 0, 0, 0.9);
	}

	/* Solid fills only — transparent clip + filter reads as black digits. */
	.loss-amount {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.048);
		font-weight: 800;
		line-height: 1;
		letter-spacing: 0.02em;
		font-variant-numeric: tabular-nums;
		color: #ffe7a0;
		text-shadow:
			0 1px 0 rgba(255, 240, 180, 0.55),
			0 2px 0 #5a3a0e,
			0 4px 8px rgba(0, 0, 0, 0.55);
	}

	.loss-row.enemy .loss-label {
		color: #ffc9c9;
	}

	.loss-row.enemy .loss-amount {
		color: #ffb4b4;
		text-shadow:
			0 1px 0 rgba(255, 210, 210, 0.45),
			0 2px 0 #4a1818,
			0 4px 8px rgba(0, 0, 0, 0.55);
	}

	.loss-row.you .loss-label {
		color: #ffe7a0;
	}

	.loss-row.you .loss-amount {
		color: #ffd56a;
	}

	.loss-divider {
		width: min(58%, 220px);
		height: 2px;
		margin: calc(var(--panel-width) * 0.002) 0;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 210, 110, 0.15) 12%,
			rgba(255, 220, 130, 0.9) 50%,
			rgba(255, 210, 110, 0.15) 88%,
			transparent 100%
		);
		box-shadow: 0 0 12px rgba(255, 190, 60, 0.35);
	}

	.loss-board.portrait:not(.popout-l):not(.popout-s) {
		--panel-width: min(920px, 100vw);
		transform: scale(1.12);
		transform-origin: center center;
	}

	.loss-board.popout-l {
		--panel-width: min(520px, 94vw);
	}

	.loss-board.popout-s {
		--panel-width: min(480px, 99vw);
	}

</style>
