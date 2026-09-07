<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut, cubicIn, cubicOut, sineIn, sineInOut, sineOut } from 'svelte/easing';
	import { untrack } from 'svelte';

	import { stateBetDerived } from 'state-shared';

	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolInfo, getSymbolX, toRevealedRawSymbol } from '../game/utils';
	import {
		WIN_BOUNCE,
		IDLE_BOUNCE,
		DIM_NON_WINNING,
		MYSTERY_BG_UNCOVER_MS,
		SYMBOL_SIZE,
		BOARD_DIMENSIONS,
		isSymbolCenterInPlayfield,
		isVisibleBoardSymbolIndex,
	} from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { getDuelBoardStack } from '../game/stateDuelBoards.svelte';
	import { countVisibleSwOnReel, shouldHideBoardSwTile } from '../game/swCurtainGuard';
	import {
		SUPER_WILD_DROP_DIST,
		SUPER_WILD_DROP_MS,
		SUPER_WILD_STICKY_DROP_IN_MS,
	} from '../game/superWildHtmlSpine';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
		/** Owning reel motion — required for Duel boards (do not read stateGame.board). */
		reelMotion?: string;
		/** Owning reel activeSymbolCount — defaults to main board. */
		activeSymbolCount?: number;
		/** Duel desk side — SW × badge uses that side's sticky map. */
		duelSide?: DuelSide;
	};

	const props: Props = $props();
	const symbolRenderState = $derived(
		props.reelSymbol.symbolState === 'idleBounce' || props.reelSymbol.symbolState === 'winLift'
			? 'static'
			: props.reelSymbol.symbolState,
	);
	const symbolInfo = $derived(
		getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: props.reelSymbol.symbolState }),
	);

	/** Open SW is covered by the curtain spine — never draw board ×N badges. */
	const showMultiplier = $derived(false);

	// Per-symbol win bounce. Runs for symbols whose win state shows a frozen
	// idle spine + container scale tween (M). B (`activate`), H1 diamond
	// (`activation`), H2 revolver / H3 lighter / H4 telephone / letter lows
	// (`win`) drive their own spine celebration — skip the bounce.
	const usesDedicatedSpineWin = $derived(
		symbolInfo.animationName === 'win' ||
			symbolInfo.animationName === 'activation' ||
			symbolInfo.animationName === 'activate',
	);
	const isIdleBouncing = $derived(props.reelSymbol.symbolState === 'idleBounce');
	const winScale = new Tween(1);
	const winYOffset = new Tween(0);
	const idleScale = new Tween(1);
	const idleYOffset = new Tween(0);

	// Затемнение невыигрышных символов на время подсветки выигрыша.
	// Base: `stateGame.winSpotlightActive`. Duel: `stateDuel.winSpotlightSide`
	// so only the desk that hit the line dims. Сбрасывается в `reveal` /
	// следующем duelSpin / clearWinSpotlight.
	const isWinningState = $derived(
		props.reelSymbol.symbolState === 'win' ||
			props.reelSymbol.symbolState === 'postWinStatic' ||
			props.reelSymbol.symbolState === 'winLift',
	);
	/** Base uses global flag; duel dims only the desk that just hit a line. */
	const winSpotlightActive = $derived(
		props.duelSide ? stateDuel.winSpotlightSide === props.duelSide : stateGame.winSpotlightActive,
	);
	const isPawCovered = $derived(
		stateGame.pawCoinCells.some(
			(cell) => cell.reel === props.reelIndex && cell.row === props.reelSymbol.symbolIndex,
		),
	);
	// Лапа, ожидающая конверсии в монетки (pawPending), не тускнеет во время
	// фазы-1 линий — она «своим» событием отыграет следом, как SW в своей линии.
	const isPawSymbol = $derived(
		props.reelSymbol.rawSymbol.name === 'PB' ||
			props.reelSymbol.rawSymbol.name === 'PS' ||
			props.reelSymbol.rawSymbol.name === 'PG',
	);
	/** FS bullets stay bright during payline spotlight (not part of lines). */
	const isBulletSymbol = $derived(props.reelSymbol.rawSymbol.name === 'BT');
	const isSpinningSymbol = $derived(props.reelSymbol.symbolState === 'spin');
	const applyWinPresentation = $derived(isWinningState && !isSpinningSymbol);
	const applyIdleBouncePresentation = $derived(isIdleBouncing);
	const reelMotion = $derived(
		props.reelMotion ?? stateGame.board[props.reelIndex]?.reelState.motion ?? 'stopped',
	);
	const activeSymbolCount = $derived(
		props.activeSymbolCount ??
			stateGame.board[props.reelIndex]?.reelState.activeSymbolCount ??
			BOARD_DIMENSIONS.y,
	);
	const maskRunwayActive = $derived(
		reelMotion !== 'stopped' ||
			isSpinningSymbol ||
			applyWinPresentation ||
			applyIdleBouncePresentation ||
			swDropY.current > 0.5,
	);
	// Cull symbols outside the visible / feather runway. During spin use the
	// same expanded window as SymbolWrap (±1 row) — never force-render the
	// whole padding pool (that was a major mobile hitch during scroll).
	const hideOffGridSymbol = $derived.by(() => {
		const y = props.reelSymbol.symbolY();
		const half = SYMBOL_SIZE / 2;
		if (maskRunwayActive) {
			const top = -SYMBOL_SIZE;
			const bottom = SYMBOL_SIZE * (BOARD_DIMENSIONS.y + 1);
			return y + half < top || y - half > bottom;
		}
		return !isSymbolCenterInPlayfield(y);
	});
	const inViewport = $derived(
		!hideOffGridSymbol &&
			isVisibleBoardSymbolIndex(props.reelSymbol.symbolIndex, activeSymbolCount) &&
			isSymbolCenterInPlayfield(props.reelSymbol.symbolY()),
	);
	const dimAlphaTween = new Tween(1);
	/** SW curtain open — slide this reel's symbols down under the board mask. */
	const swDropY = new Tween(0);

	/** H3/H4/B idle spines use additive glow slots — container alpha makes them
	 *  see-through over the board. Dim via tint multiply instead (keep alpha 1). */
	const dimViaTint = $derived(
		props.reelSymbol.rawSymbol.name === 'H3' ||
			props.reelSymbol.rawSymbol.name === 'H4' ||
			props.reelSymbol.rawSymbol.name === 'B' ||
			props.reelSymbol.rawSymbol.name === 'BD',
	);
	const dimTintFromFactor = (factor: number) => {
		const c = Math.max(0, Math.min(255, Math.round(factor * 255)));
		return (c << 16) | (c << 8) | c;
	};

	const wrapYOffset = $derived(
		(stateGame.targetPickOpen
			? 0
			: (applyWinPresentation ? winYOffset.current : 0) +
				(applyIdleBouncePresentation ? idleYOffset.current : 0)) +
			// Keep SW-column drop under the mask while target-pick parks — do not
			// snap Wild.webp tiles back into the hole when the curtain slides down.
			swDropY.current,
	);
	const wrapScale = $derived(
		stateGame.targetPickOpen
			? 1
			: (applyWinPresentation ? winScale.current : 1) *
					(applyIdleBouncePresentation ? idleScale.current : 1),
	);

	$effect(() => {
		const state = props.reelSymbol.symbolState;
		if (stateGame.targetPickOpen || state === 'spin' || state === 'static' || state === 'land') {
			untrack(() => {
				winScale.set(1, { duration: 0 });
				winYOffset.set(0, { duration: 0 });
				idleScale.set(1, { duration: 0 });
				idleYOffset.set(0, { duration: 0 });
				if (state === 'spin') {
					dimAlphaTween.set(1, { duration: 0 });
					const covered = props.duelSide
						? stateDuel.superWildCurtains.some(
								(c) => c.side === props.duelSide && c.reel === props.reelIndex,
							)
						: stateGame.superWildCurtains.some((c) => c.reel === props.reelIndex) ||
							stateGame.swSpineHideReels[props.reelIndex] === true;
					if (!covered) swDropY.set(0, { duration: 0 });
					// Do NOT clear swSpineHideReels here — that flashed Wild.webp on
					// cols 1/5 as soon as the reel entered `spin`. Base reveal clears
					// hide after the whole board has landed.
				}
			});
		}
	});

	$effect(() => {
		const curtain = props.duelSide
			? (stateDuel.superWildCurtains.find(
					(c) => c.side === props.duelSide && c.reel === props.reelIndex,
				) ?? null)
			: (stateGame.superWildCurtains.find((c) => c.reel === props.reelIndex) ?? null);
		const hideAfterCurtain =
			!props.duelSide && stateGame.swSpineHideReels[props.reelIndex] === true;
		const isDismissing = curtain?.phase === 'dismiss';
		// During dismiss the Spine slides away on its own layer — reel symbols must
		// scroll normally (no swDropY). Otherwise the strip gaps / culls / looks masked.
		const covered =
			!isDismissing && (curtain != null || hideAfterCurtain);
		const dropping =
			curtain != null &&
			(curtain.phase === 'expanding' || curtain.phase === 'dropIn');
		const dropMs =
			curtain?.phase === 'dropIn' ? SUPER_WILD_STICKY_DROP_IN_MS : SUPER_WILD_DROP_MS;
		// Match curtain 1× open/dropIn — turbo must not yank symbols out early.
		const duration = dropping ? dropMs : 0;
		untrack(() => {
			void swDropY.set(covered ? SUPER_WILD_DROP_DIST : 0, {
				duration,
				easing: dropping ? cubicOut : sineOut,
			});
		});
	});

	/**
	 * Board SW tiles: only a single lying SW may paint (Wild.webp).
	 * Expanded / sticky / curtained columns NEVER mount tile art — Spine only.
	 * Do not use alpha=0 here: win sparks / land FX must not exist at all.
	 */
	const swReplacedByCurtain = $derived.by(() => {
		if (props.reelSymbol.rawSymbol.name !== 'SW') return false;
		if (props.duelSide) {
			const side = props.duelSide;
			if (stateDuel.superWildCurtains.some((c) => c.side === side && c.reel === props.reelIndex)) {
				return true;
			}
			if (stateDuel.stickySwByReel[side][props.reelIndex] != null) return true;
			const stack = getDuelBoardStack(side);
			return countVisibleSwOnReel(props.reelIndex, stack.board) >= BOARD_DIMENSIONS.y;
		}
		return shouldHideBoardSwTile(props.reelIndex);
	});

	$effect(() => {
		const target =
			isPawCovered ||
			(winSpotlightActive &&
				!isWinningState &&
				!isBulletSymbol &&
				!(stateGame.pawPending && isPawSymbol))
				? DIM_NON_WINNING.alpha
				: 1;
		const duration = target < 1 ? DIM_NON_WINNING.fadeInMs : DIM_NON_WINNING.fadeOutMs;
		untrack(() => {
			void dimAlphaTween.set(target, { duration, easing: sineInOut });
		});
	});

	const finishWinBounce = () => {
		if (props.reelSymbol.symbolState === 'win') {
			props.reelSymbol.oncomplete();
		}
	};

	const finishIdleBounce = () => {
		if (props.reelSymbol.symbolState === 'idleBounce') {
			props.reelSymbol.symbolState = 'static';
			props.reelSymbol.oncomplete();
		}
	};

	const runWinContainerBounce = async (onDone: () => void, isActive: () => boolean) => {
		const peak = WIN_BOUNCE.scalePeak;
		const lift = WIN_BOUNCE.yOffsetPeakPx;
		const speed = stateBetDerived.timeScale();
		const upMs = WIN_BOUNCE.upMs / speed;
		const holdMs = WIN_BOUNCE.holdMs / speed;
		const downMs = WIN_BOUNCE.downMs / speed;

		void winScale.set(peak, { duration: upMs, easing: sineOut });
		await winYOffset.set(-lift, { duration: upMs, easing: sineOut });

		if (holdMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, holdMs));
		}

		void winScale.set(1, { duration: downMs, easing: sineIn });
		await winYOffset.set(0, { duration: downMs, easing: sineIn });

		if (isActive()) onDone();
	};

	/** CSS-style smooth scale pop for idle tease — no spine bounce clip. */
	const runIdlePopAnimation = async () => {
		const peak = IDLE_BOUNCE.scalePeak;
		const lift = IDLE_BOUNCE.yOffsetPeakPx;
		const speed = stateBetDerived.timeScale();
		const riseMs = IDLE_BOUNCE.riseMs / speed;
		const fallMs = IDLE_BOUNCE.fallMs / speed;

		void idleScale.set(peak, { duration: riseMs, easing: backOut });
		await idleYOffset.set(-lift, { duration: riseMs, easing: backOut });

		void idleScale.set(1, { duration: fallMs, easing: cubicIn });
		await idleYOffset.set(0, { duration: fallMs, easing: cubicIn });

		if (props.reelSymbol.symbolState === 'idleBounce') {
			finishIdleBounce();
		}
	};

	$effect(() => {
		const state = props.reelSymbol.symbolState;
		untrack(() => {
			if (stateGame.targetPickOpen) return;
			if (state === 'win' && !usesDedicatedSpineWin) {
				runWinContainerBounce(finishWinBounce, () => props.reelSymbol.symbolState === 'win');
			}
		});
	});

	$effect(() => {
		const state = props.reelSymbol.symbolState;
		untrack(() => {
			if (stateGame.targetPickOpen) return;
			if (state === 'idleBounce') {
				runIdlePopAnimation();
			}
		});
	});

	// Background revealed symbol rendered under the mystery explosion spine.
	// Mounts at reveal start (so land → static can run invisibly) but stays
	// alpha=0 until Mystery_bg lifts in the spine — otherwise turbo's 2×
	// timeScale lets the pay symbol peek through before the cover animates off.
	let bgSymbolState = $state<'land' | 'static'>('land');
	const bgAlphaTween = new Tween(0);

	$effect(() => {
		const state = props.reelSymbol.symbolState;

		if (state !== 'mysteryReveal') {
			untrack(() => {
				void bgAlphaTween.set(0, { duration: 0 });
			});
			return;
		}

		untrack(() => {
			bgSymbolState = 'land';
			void bgAlphaTween.set(0, { duration: 0 });
		});

		const uncoverMs = MYSTERY_BG_UNCOVER_MS / stateBetDerived.timeScale();
		const timer = setTimeout(() => {
			if (props.reelSymbol.symbolState === 'mysteryReveal') {
				untrack(() => {
					void bgAlphaTween.set(1, { duration: 0 });
				});
			}
		}, uncoverMs);

		return () => clearTimeout(timer);
	});

	const revealedRawSymbol = $derived(
		props.reelSymbol.rawSymbol.mysteryRevealTo
			? toRevealedRawSymbol(props.reelSymbol.rawSymbol.mysteryRevealTo)
			: null,
	);
	const showBgSymbol = $derived(
		props.reelSymbol.symbolState === 'mysteryReveal' && revealedRawSymbol !== null,
	);
	const symbolX = $derived(getSymbolX(props.reelIndex, props.reelSymbol.rawSymbol.name));
	const bgSymbolX = $derived(
		getSymbolX(props.reelIndex, revealedRawSymbol?.name ?? props.reelSymbol.rawSymbol.name),
	);
</script>

{#if showBgSymbol && revealedRawSymbol && !hideOffGridSymbol}
	<SymbolWrap
		x={bgSymbolX}
		y={props.reelSymbol.symbolY()}
		spinActive={maskRunwayActive}
		alpha={bgAlphaTween.current}
	>
		<Symbol
			state={bgSymbolState}
			rawSymbol={revealedRawSymbol}
			{showMultiplier}
			duelSide={props.duelSide}
			oncomplete={() => {
				bgSymbolState = 'static';
			}}
		/>
	</SymbolWrap>
{/if}

{#if !hideOffGridSymbol && !swReplacedByCurtain}
	<SymbolWrap
		x={symbolX}
		y={props.reelSymbol.symbolY() + wrapYOffset}
		spinActive={maskRunwayActive}
		scaleX={props.reelSymbol.landScaleX() * wrapScale}
		scaleY={props.reelSymbol.landScaleY() * wrapScale}
		alpha={dimViaTint || isSpinningSymbol ? 1 : dimAlphaTween.current}
		tint={dimViaTint && !isSpinningSymbol && dimAlphaTween.current < 1
			? dimTintFromFactor(dimAlphaTween.current)
			: 0xffffff}
	>
		<!-- Sprites: key by asset so H1Img→L3Img swaps cleanly (cheap remount).
		     Paw coins: key by skin+clip so land(appear) → static(loop) remounts
		     onto a clean frozen face instead of a stuck appear_flash frame.
		     Spines: key by asset + clip + loop so win (one-shot) → postWinStatic
		     (looping) remounts and keeps celebrating instead of freezing on the
		     last bright frame. -->
		{#key symbolInfo.type === 'sprite' ? `sprite:${symbolInfo.assetKey}` : symbolInfo.type === 'coinPaw' ? `coinPaw:${'skin' in symbolInfo ? symbolInfo.skin : ''}:${'clip' in symbolInfo ? symbolInfo.clip : ''}` : `spine:${symbolInfo.assetKey}:${symbolInfo.animationName ?? ''}:${'loop' in symbolInfo && symbolInfo.loop ? 'L' : '1'}:${'devNonce' in symbolInfo ? symbolInfo.devNonce : ''}`}
			<Symbol
				state={symbolRenderState}
				rawSymbol={props.reelSymbol.rawSymbol}
				{inViewport}
				{showMultiplier}
				duelSide={props.duelSide}
				oncomplete={() => {
					const state = props.reelSymbol.symbolState;
					if (state === 'idleBounce') return;
					if (state === 'win' && !usesDedicatedSpineWin) return;
					if (
						state === 'win' ||
						state === 'mysteryReveal' ||
						state === 'mysteryCollapse' ||
						state === 'land'
					) {
						props.reelSymbol.oncomplete();
					}
					if (state === 'land') props.reelSymbol.symbolState = 'static';
				}}
			/>
		{/key}
	</SymbolWrap>
{/if}
