<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut, cubicIn, sineIn, sineInOut, sineOut } from 'svelte/easing';
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
	} from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();
	const symbolRenderState = $derived(
		props.reelSymbol.symbolState === 'idleBounce' ? 'static' : props.reelSymbol.symbolState,
	);
	const symbolInfo = $derived(
		getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: props.reelSymbol.symbolState }),
	);

	// Per-symbol win bounce. Runs for symbols whose win state shows a frozen
	// idle spine + container scale tween (M). W (`Special_2/win`),
	// B (`Special_1/wave`), H1 diamond (`activation`), H2 revolver / H3
	// lighter / H4 telephone / letter lows (`win`) drive their own spine
	// celebration — skip the bounce.
	const usesDedicatedSpineWin = $derived(
		symbolInfo.animationName === 'Special_2/win' ||
			symbolInfo.animationName === 'Special_1/wave' ||
			symbolInfo.animationName === 'win' ||
			symbolInfo.animationName === 'activation',
	);
	const isIdleBouncing = $derived(props.reelSymbol.symbolState === 'idleBounce');
	const winScale = new Tween(1);
	const winYOffset = new Tween(0);
	const idleScale = new Tween(1);
	const idleYOffset = new Tween(0);

	// Затемнение невыигрышных символов на время подсветки выигрыша.
	// `winSpotlightActive` поднимается хелпером `animateSymbols`
	// (bookEventHandlerMap) и сбрасывается в `reveal` следующего спина.
	// Сам символ остаётся ярким, если он сам в 'win'/'postWinStatic'.
	const isWinningState = $derived(
		props.reelSymbol.symbolState === 'win' || props.reelSymbol.symbolState === 'postWinStatic',
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
	const isSpinningSymbol = $derived(props.reelSymbol.symbolState === 'spin');
	const applyWinPresentation = $derived(isWinningState && !isSpinningSymbol);
	const applyIdleBouncePresentation = $derived(isIdleBouncing);
	const maskRunwayActive = $derived(
		stateGame.board[props.reelIndex].reelState.motion !== 'stopped' ||
			isSpinningSymbol ||
			applyWinPresentation ||
			applyIdleBouncePresentation,
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
			return y < top || y > bottom;
		}
		const gridBottom = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
		return y - half < 0 || y + half > gridBottom;
	});
	const dimAlphaTween = new Tween(1);

	const wrapYOffset = $derived(
		(applyWinPresentation ? winYOffset.current : 0) +
			(applyIdleBouncePresentation ? idleYOffset.current : 0),
	);
	const wrapScale = $derived(
		(applyWinPresentation ? winScale.current : 1) *
			(applyIdleBouncePresentation ? idleScale.current : 1),
	);

	$effect(() => {
		const state = props.reelSymbol.symbolState;
		if (state === 'spin' || state === 'static' || state === 'land') {
			untrack(() => {
				winScale.set(1, { duration: 0 });
				winYOffset.set(0, { duration: 0 });
				idleScale.set(1, { duration: 0 });
				idleYOffset.set(0, { duration: 0 });
				if (state === 'spin') {
					dimAlphaTween.set(1, { duration: 0 });
				}
			});
		}
	});

	$effect(() => {
		const target =
			isPawCovered ||
			(stateGame.winSpotlightActive &&
				!isWinningState &&
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
			if (state === 'win' && !usesDedicatedSpineWin) {
				runWinContainerBounce(finishWinBounce, () => props.reelSymbol.symbolState === 'win');
			}
		});
	});

	$effect(() => {
		const state = props.reelSymbol.symbolState;
		untrack(() => {
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
</script>

{#if showBgSymbol && revealedRawSymbol && !hideOffGridSymbol}
	<SymbolWrap
		x={getSymbolX(props.reelIndex)}
		y={props.reelSymbol.symbolY()}
		spinActive={maskRunwayActive}
		alpha={bgAlphaTween.current}
	>
		<Symbol
			state={bgSymbolState}
			rawSymbol={revealedRawSymbol}
			oncomplete={() => {
				bgSymbolState = 'static';
			}}
		/>
	</SymbolWrap>
{/if}

{#if !hideOffGridSymbol}
	<SymbolWrap
		x={getSymbolX(props.reelIndex)}
		y={props.reelSymbol.symbolY() + wrapYOffset}
		spinActive={maskRunwayActive}
		scaleX={props.reelSymbol.landScaleX() * wrapScale}
		scaleY={props.reelSymbol.landScaleY() * wrapScale}
		alpha={isSpinningSymbol ? 1 : dimAlphaTween.current}
	>
		<!-- Sprites: key by asset so H1Img→L3Img swaps cleanly (cheap remount).
		     Spines: include state + animationName so B/M idle↔land/win remount
		     correctly — a spine-only assetKey key left Special_1 / Mystery posed wrong. -->
		{#key symbolInfo.type === 'sprite'
			? `sprite:${symbolInfo.assetKey}`
			: `${symbolRenderState}:spine:${symbolInfo.assetKey}:${symbolInfo.animationName ?? ''}:${'devNonce' in symbolInfo ? symbolInfo.devNonce : ''}`}
			<Symbol
				state={symbolRenderState}
				rawSymbol={props.reelSymbol.rawSymbol}
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
