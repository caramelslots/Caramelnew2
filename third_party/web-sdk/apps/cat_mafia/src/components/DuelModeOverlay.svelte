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
	import { fade } from 'svelte/transition';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { OnHotkey } from 'components-shared';

	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { computeDuelScreenLayout, getDuelSpinCounterPos } from '../game/duelLayout';
	import {
		DUEL_BANK_SCALE,
		DUEL_BANK_SCALE_PAW_SRC,
		DUEL_BANK_SCALE_SRC,
		DUEL_CAT_FACE_AVATAR_SRC,
		DUEL_DOG_FACE_AVATAR_SRC,
	} from '../game/duelAssets';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { gameEntrance } from '../game/gameEntrance.svelte';
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
	const dogCounterPos = $derived(getDuelSpinCounterPos(duelLayout, 'dog'));
	const catCounterPos = $derived(getDuelSpinCounterPos(duelLayout, 'cat'));

	let pickShow = $state(false);
	/** Keep pick Spine players warm so choose-side does not hitch on first open. */
	let pickSpinesWarmed = $state(false);
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
	/** Cloud spine sits in Pixi (z50) — hide HTML chrome/modals so they stay under it. */
	const underCloud = $derived(stateGame.transitionActive);
	const portraitAvatarSize = $derived(Math.round(Math.min(88, duelLayout.boardWidth * 0.28)));
	const pickOpen = $derived(pickShow && !underCloud);

	/** Dog share of combined banks (0..1). Both zero → 50/50. */
	const dogBankShare = $derived.by(() => {
		const dog = stateDuel.dogTotal;
		const cat = stateDuel.catTotal;
		const sum = dog + cat;
		if (sum <= 0) return 0.5;
		return dog / sum;
	});
	/** Combined dog+cat bank (book cents) — plaque WIN $… (same copy as under-desk HUD). */
	const combinedBankCents = $derived(stateDuel.dogTotal + stateDuel.catTotal);
	const combinedBankAmount = $derived(money(combinedBankCents));
	const combinedBankWinPrefix = $derived(context.i18nDerived.win().toUpperCase());
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
	const bankTotalMaxWidth = $derived(bankRatioWidth * DUEL_BANK_SCALE.plaqueWidth * 0.92);
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

		if (isPopoutSmall) {
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

		const gap = Math.round(duelLayout.boardHeight * -0.035);
		return deskBottom + gap;
	});

	// Warm duel pick spines after the board is up (or immediately when pick opens).
	$effect(() => {
		if (pickShow) pickSpinesWarmed = true;
	});
	$effect(() => {
		if (!gameEntrance.showContent || pickSpinesWarmed) return;
		const timer = setTimeout(() => {
			pickSpinesWarmed = true;
		}, 600);
		return () => clearTimeout(timer);
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
		duelPickWarm: () => {
			pickSpinesWarmed = true;
		},
		duelIntroShow: () => {
			pickShow = false;
		},
		duelPickShow: () => {
			pickSpinesWarmed = true;
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
		<header class="duel-header">
			<span class="title">DUEL</span>
			{#if stateDuel.playerSide && stateDuel.phase === 'playing'}
				<span class="playing-as" data-test="duel-playing-as">
					{stateDuel.playerSide === 'cat' ? 'YOU · CAT' : 'YOU · DOG'}
				</span>
			{/if}
		</header>

		<div
			class="counter dog-counter"
			class:active={stateDuel.activeSide === 'dog'}
			class:player={stateDuel.playerSide === 'dog'}
			style:left="{dogCounterPos.left}px"
			style:top="{dogCounterPos.top}px"
			data-test="duel-counter-dog"
		>
			{#if stateDuel.playerSide === 'dog'}
				<span class="you-badge">YOU</span>
			{/if}
			<span class="counter-label">DOG</span>
			<span class="counter-value">{stateDuel.dogSpinIndex}/{stateDuel.totalSpinsPerSide}</span>
		</div>

		{#if isPortrait}
			<div
				class="vs-badge"
				style:left="{duelLayout.dogCenter.x}px"
				style:top="{(duelLayout.dogCenter.y + duelLayout.catCenter.y) / 2}px"
				aria-hidden="true"
			>
				VS
			</div>
		{/if}

		<div
			class="counter cat-counter"
			class:active={stateDuel.activeSide === 'cat'}
			class:player={stateDuel.playerSide === 'cat'}
			style:left="{catCounterPos.left}px"
			style:top="{catCounterPos.top}px"
			data-test="duel-counter-cat"
		>
			{#if stateDuel.playerSide === 'cat'}
				<span class="you-badge">YOU</span>
			{/if}
			<span class="counter-label">CAT</span>
			<span class="counter-value">{stateDuel.catSpinIndex}/{stateDuel.totalSpinsPerSide}</span>
		</div>

		{#if isPortrait}
			<img
				class="board-face top-right"
				src={DUEL_DOG_FACE_AVATAR_SRC}
				alt=""
				draggable="false"
				aria-hidden="true"
				style:width="{portraitAvatarSize}px"
				style:height="{portraitAvatarSize}px"
				style:left="{duelLayout.dogCenter.x +
					duelLayout.boardWidth * 0.5 -
					portraitAvatarSize * 0.72}px"
				style:top="{duelLayout.dogCenter.y -
					duelLayout.boardHeight * 0.5 -
					portraitAvatarSize * 0.18}px"
			/>
			<img
				class="board-face bottom-left"
				src={DUEL_CAT_FACE_AVATAR_SRC}
				alt=""
				draggable="false"
				aria-hidden="true"
				style:width="{portraitAvatarSize}px"
				style:height="{portraitAvatarSize}px"
				style:left="{duelLayout.catCenter.x -
					duelLayout.boardWidth * 0.5 -
					portraitAvatarSize * 0.18}px"
				style:top="{duelLayout.catCenter.y +
					duelLayout.boardHeight * 0.5 -
					portraitAvatarSize * 0.72}px"
			/>
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

{#if pickSpinesWarmed}
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
					<span class="pick-pedestal" aria-hidden="true">
						<span class="pick-pedestal-glow"></span>
						<span class="pick-pedestal-card">
							<DuelPickMascot species="dog" mirror playing={pickShow} />
						</span>
						<span class="pick-pedestal-base"></span>
					</span>
					<span class="pick-mascot-name">DOG</span>
				</button>
				<button
					type="button"
					class="pick-mascot cat"
					data-test="duel-pick-cat"
					aria-label="Play as Cat"
					tabindex={pickShow ? 0 : -1}
					onclick={() => chooseSide('cat')}
				>
					<span class="pick-pedestal" aria-hidden="true">
						<span class="pick-pedestal-glow"></span>
						<span class="pick-pedestal-card">
							<DuelPickMascot playing={pickShow} />
						</span>
						<span class="pick-pedestal-base"></span>
					</span>
					<span class="pick-mascot-name">CAT</span>
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
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => onOutroContinue()}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onOutroContinue();
			}
		}}
	>
		<div class="modal-card" class:win={outroPlayerWon} class:lose={!outroPlayerWon}>
			<p class="eyebrow">DUEL RESULT</p>
			{#if outroPlayerWon}
				<h2>YOU WIN</h2>
				<p class="body">Played as {outroPlayerSide === 'cat' ? 'CAT' : 'DOG'}</p>
				<div class="compare">
					<span>Dog {money(outroDog)}</span>
					<span class="plus">+</span>
					<span>Cat {money(outroCat)}</span>
				</div>
				<p class="payout">{money(outroPayout)}</p>
				<p class="body muted">Both banks paid</p>
			{:else}
				<h2>YOU LOSE</h2>
				<p class="body">Played as {outroPlayerSide === 'cat' ? 'CAT' : 'DOG'}</p>
				<div class="compare">
					<span>Dog {money(outroDog)}</span>
					<span class="plus">·</span>
					<span>Cat {money(outroCat)}</span>
				</div>
				<p class="payout lose">{money(0)}</p>
				<p class="body muted">{outroWinner === 'cat' ? 'Cat' : 'Dog'} finished ahead</p>
			{/if}
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
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		color: #f6e8c8;
		z-index: 2;
	}

	.duel-header .title {
		letter-spacing: 0.22em;
		font-size: clamp(1.15rem, 2.4vw, 1.55rem);
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
	}

	.playing-as {
		padding: 0.18rem 0.7rem;
		border-radius: 999px;
		font-size: 0.85rem;
		letter-spacing: 0.12em;
		background: rgba(18, 10, 28, 0.82);
		border: 1px solid rgba(255, 220, 140, 0.45);
	}

	.counter {
		position: absolute;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.28rem 0.65rem;
		border-radius: 999px;
		background: rgba(18, 10, 28, 0.82);
		border: 1px solid rgba(255, 220, 140, 0.35);
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		color: #f6e6c2;
		line-height: 1.1;
		/* Center the pill on the gold-rail anchor so taller portrait pills don't drift. */
		transform: translateY(-50%);
	}

	.counter.active {
		border-color: rgba(255, 230, 160, 0.75);
		filter: brightness(1.08);
	}

	.counter.player {
		border-color: rgba(255, 210, 120, 0.95);
		box-shadow:
			0 0 0 1px rgba(255, 200, 100, 0.35),
			0 0 14px rgba(255, 180, 60, 0.35);
	}

	.you-badge {
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		padding: 0.1rem 0.35rem;
		border-radius: 999px;
		background: rgba(255, 200, 90, 0.22);
		border: 1px solid rgba(255, 220, 140, 0.55);
		color: #ffe7a0;
	}

	.counter-label {
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		opacity: 0.9;
		text-transform: uppercase;
	}

	.counter-value {
		font-size: 1.05rem;
		font-variant-numeric: tabular-nums;
	}

	.duel-root.portrait .duel-header {
		top: 0.6vh;
		gap: 0.35rem;
	}

	.duel-root.portrait .duel-header .title {
		font-size: clamp(1.55rem, 7vw, 2.1rem);
		letter-spacing: 0.18em;
	}

	.duel-root.portrait .playing-as {
		font-size: clamp(0.95rem, 3.8vw, 1.15rem);
		padding: 0.22rem 0.85rem;
	}

	.duel-root.portrait .counter {
		gap: 0.45rem;
		padding: 0.4rem 0.85rem;
	}

	.duel-root.portrait .you-badge {
		font-size: 0.8rem;
		padding: 0.12rem 0.4rem;
	}

	.duel-root.portrait .counter-label {
		font-size: clamp(0.95rem, 3.6vw, 1.15rem);
	}

	.duel-root.portrait .counter-value {
		font-size: clamp(1.15rem, 4.2vw, 1.4rem);
	}

	.duel-root.popout-s .duel-header {
		top: 0.2vh;
		gap: 0.1rem;
	}

	.duel-root.popout-s .duel-header .title {
		font-size: 0.7rem;
		letter-spacing: 0.14em;
	}

	.duel-root.popout-s .playing-as {
		font-size: 0.45rem;
		padding: 0.05rem 0.35rem;
		letter-spacing: 0.06em;
	}

	.duel-root.popout-s .counter {
		gap: 0.2rem;
		padding: 0.08rem 0.35rem;
	}

	.duel-root.popout-s .you-badge {
		font-size: 0.35rem;
		padding: 0.02rem 0.18rem;
	}

	.duel-root.popout-s .counter-label {
		font-size: 0.45rem;
	}

	.duel-root.popout-s .counter-value {
		font-size: 0.55rem;
	}

	.board-face {
		position: absolute;
		z-index: 4;
		border-radius: 50%;
		object-fit: cover;
		object-position: center 28%;
		pointer-events: none;
		user-select: none;
		border: 2px solid rgba(255, 214, 120, 0.85);
		box-shadow:
			0 4px 14px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(0, 0, 0, 0.35);
		background: #2a1810;
	}

	.vs-badge {
		position: absolute;
		transform: translate(-50%, -50%);
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		color: #f6e8c8;
		background: rgba(20, 12, 30, 0.88);
		border: 1px solid rgba(255, 220, 140, 0.4);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
		z-index: 2;
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

	.bank-ratio-total {
		position: absolute;
		left: calc(var(--plaque-left, 0.3) * 100%);
		top: calc(var(--plaque-top, 0.68) * 100%);
		width: calc(var(--plaque-width, 0.4) * 100%);
		height: calc(var(--plaque-height, 0.27) * 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.38em;
		margin: 0;
		padding: 0 0.15em;
		box-sizing: border-box;
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		font-weight: 400;
		font-size: clamp(0.7rem, 3vh, 1.25rem);
		letter-spacing: 0.04em;
		line-height: 1;
		text-align: center;
		white-space: nowrap;
		color: #ffcc44;
		text-shadow:
			0 0 8px rgba(255, 196, 48, 0.45),
			0 1px 0 rgba(92, 58, 8, 0.75),
			0 2px 6px rgba(0, 0, 0, 0.7);
		pointer-events: none;
		user-select: none;
		/* Nudge WIN label slightly up into the plaque center. */
		transform: translateY(-18%);
	}

	.bank-ratio-total-label {
		text-transform: uppercase;
	}

	.bank-ratio-total-amount {
		font-weight: 400;
	}

	.duel-root.popout-s .bank-ratio-total {
		font-size: clamp(0.62rem, 3.2vh, 1rem);
	}

	.duel-modal {
		position: fixed;
		inset: 0;
		/* Below Pixi cloud stage (z50) so transition always covers this UI. */
		z-index: 48;
		display: grid;
		place-items: center;
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
		--pick-card: min(400px, 36vw, 58vh, calc((90vw - var(--pick-gap)) / 2));
		--pick-title-size: clamp(1.15rem, 3.6vw, 2.1rem);
		--pick-name-size: clamp(0.75rem, 2.1vw, 1.25rem);
		--pick-card-pad: clamp(0.28rem, 1vw, 0.55rem);
		--pick-card-radius: clamp(0.7rem, 1.4vw, 1.15rem);
		--pick-inner-gap: clamp(0.28rem, 1vw, 0.65rem);

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
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--pick-inner-gap);
		width: 100%;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
		cursor: pointer;
		color: #f6e8c8;
		font-family: inherit;
		transition: transform 0.14s ease;

		&:hover {
			transform: translateY(-6px) scale(1.03);

			.pick-pedestal-card {
				border-color: rgba(255, 220, 140, 0.75);
				box-shadow:
					0 16px 36px rgba(0, 0, 0, 0.55),
					0 0 28px rgba(255, 200, 90, 0.28),
					inset 0 1px 0 rgba(255, 240, 200, 0.18);
			}

			.pick-pedestal-glow {
				opacity: 0.9;
			}
		}

		&:active {
			transform: translateY(-2px) scale(1.01);
		}
	}

	.pick-pedestal {
		position: relative;
		display: block;
		width: 100%;
		min-width: 0;
	}

	.pick-pedestal-glow {
		position: absolute;
		left: 50%;
		bottom: 8%;
		width: 78%;
		height: 42%;
		transform: translateX(-50%);
		border-radius: 50%;
		background: radial-gradient(
			ellipse at center,
			rgba(255, 200, 110, 0.35) 0%,
			rgba(120, 60, 180, 0.12) 45%,
			transparent 72%
		);
		opacity: 0.55;
		pointer-events: none;
		transition: opacity 0.14s ease;
	}

	.pick-pedestal-card {
		position: relative;
		display: block;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		padding: var(--pick-card-pad) var(--pick-card-pad) 0.08rem;
		border-radius: var(--pick-card-radius);
		background: linear-gradient(
			165deg,
			rgba(72, 48, 96, 0.92) 0%,
			rgba(24, 14, 38, 0.96) 55%,
			rgba(12, 8, 22, 0.98) 100%
		);
		border: 1px solid rgba(230, 190, 110, 0.42);
		box-shadow:
			0 14px 32px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 240, 200, 0.12);
		overflow: hidden;
		transition:
			border-color 0.14s ease,
			box-shadow 0.14s ease;
	}

	.pick-pedestal-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse 80% 55% at 50% 18%, rgba(255, 220, 150, 0.12), transparent 60%),
			linear-gradient(180deg, transparent 55%, rgba(0, 0, 0, 0.28) 100%);
		pointer-events: none;
	}

	.pick-pedestal-base {
		display: block;
		width: 72%;
		height: clamp(0.28rem, 1vmin, 0.55rem);
		margin: -0.1rem auto 0;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(40, 24, 20, 0.95) 18%,
			rgba(90, 60, 30, 0.9) 50%,
			rgba(40, 24, 20, 0.95) 82%,
			transparent 100%
		);
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
	}

	.pick-mascot-name {
		font-size: var(--pick-name-size);
		letter-spacing: 0.16em;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
		padding: clamp(0.08rem, 0.6vmin, 0.2rem) clamp(0.45rem, 1.6vmin, 0.85rem);
		border-radius: 999px;
		background: rgba(18, 10, 28, 0.82);
		border: 1px solid rgba(255, 220, 140, 0.4);
	}

	/* Phone portrait — same tokens, stacked column. */
	.pick-modal.portrait .pick-stage {
		--pick-gap: clamp(14px, 2.8vh, 24px);
		--pick-card: min(280px, 62vw);
		--pick-title-size: clamp(1.25rem, 6.5vw, 1.75rem);
		--pick-name-size: clamp(0.88rem, 3.8vw, 1.05rem);
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

	.modal-card {
		width: min(420px, 88vw);
		padding: 1.6rem 1.4rem 1.2rem;
		border-radius: 1rem;
		background: linear-gradient(180deg, #3a2750 0%, #1a1028 100%);
		border: 1px solid rgba(230, 190, 110, 0.45);
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
		text-align: center;
		color: #f6e8c8;
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		cursor: pointer;
	}

	.modal-card.win {
		border-color: rgba(180, 255, 170, 0.45);
	}

	.modal-card.lose {
		border-color: rgba(255, 150, 150, 0.4);
	}

	.eyebrow {
		margin: 0;
		font-size: 0.75rem;
		letter-spacing: 0.14em;
		opacity: 0.7;
	}

	.modal-card h2 {
		margin: 0.35rem 0 0.7rem;
		font-size: clamp(1.5rem, 4.5vw, 2.2rem);
		letter-spacing: 0.06em;
	}

	.body {
		margin: 0.25rem 0;
		font-size: 0.95rem;
		line-height: 1.35;
	}

	.body.muted {
		opacity: 0.75;
		font-size: 0.85rem;
	}

	.compare {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.95rem;
	}

	.compare .plus {
		opacity: 0.6;
	}

	.payout {
		margin: 0.8rem 0 0.25rem;
		font-size: 1.7rem;
		color: #ffe7a0;
	}

	.payout.lose {
		color: #ff9b9b;
	}
</style>
