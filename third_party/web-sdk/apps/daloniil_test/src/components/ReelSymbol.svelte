<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { sineOut, sineIn, sineInOut } from 'svelte/easing';
	import { untrack } from 'svelte';

	import { stateBetDerived } from 'state-shared';

	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolInfo, getSymbolX, toRevealedRawSymbol } from '../game/utils';
	import { WIN_BOUNCE, DIM_NON_WINNING, MYSTERY_BG_UNCOVER_MS } from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();
	const symbolInfo = $derived(
		getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: props.reelSymbol.symbolState }),
	);

	// Per-symbol win bounce. Runs for symbols whose win state shows a frozen
	// idle spine + container scale tween (H/L pay, M). W (`Special_2/win`) and
	// B (`Special_1/wave`) drive their own spine celebration — skip the bounce
	// so scale doesn't fight the designer animation.
	const usesDedicatedSpineWin = $derived(
		symbolInfo.animationName === 'Special_2/win' ||
			symbolInfo.animationName === 'Special_1/wave',
	);
	const winScale = new Tween(1);
	const winYOffset = new Tween(0);

	// Затемнение невыигрышных символов на время подсветки выигрыша.
	// `winSpotlightActive` поднимается хелпером `animateSymbols`
	// (bookEventHandlerMap) и сбрасывается в `reveal` следующего спина.
	// Сам символ остаётся ярким, если он сам в 'win'/'postWinStatic'.
	const isWinningState = $derived(
		props.reelSymbol.symbolState === 'win' || props.reelSymbol.symbolState === 'postWinStatic',
	);
	const isSpinningSymbol = $derived(props.reelSymbol.symbolState === 'spin');
	const applyWinPresentation = $derived(isWinningState && !isSpinningSymbol);
	const dimAlphaTween = new Tween(1);

	$effect(() => {
		const state = props.reelSymbol.symbolState;
		if (state === 'spin' || state === 'static' || state === 'land') {
			untrack(() => {
				winScale.set(1, { duration: 0 });
				winYOffset.set(0, { duration: 0 });
				if (state === 'spin') {
					dimAlphaTween.set(1, { duration: 0 });
				}
			});
		}
	});

	$effect(() => {
		const target = stateGame.winSpotlightActive && !isWinningState ? DIM_NON_WINNING.alpha : 1;
		const duration = target < 1 ? DIM_NON_WINNING.fadeInMs : DIM_NON_WINNING.fadeOutMs;
		untrack(() => {
			void dimAlphaTween.set(target, { duration, easing: sineInOut });
		});
	});

	const runWinBounce = async () => {
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

		// Fire only if we're still in win state — defensively skips the call
		// if the state was reset externally (e.g. spin restarted mid-bounce).
		if (props.reelSymbol.symbolState === 'win') {
			props.reelSymbol.oncomplete();
		}
	};

	$effect(() => {
		const state = props.reelSymbol.symbolState;
		untrack(() => {
			if (state === 'win' && !usesDedicatedSpineWin) {
				runWinBounce();
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

{#if showBgSymbol && revealedRawSymbol}
	<SymbolWrap
		x={getSymbolX(props.reelIndex)}
		y={props.reelSymbol.symbolY()}
		spinActive={isSpinningSymbol}
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

<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={props.reelSymbol.symbolY() + (applyWinPresentation ? winYOffset.current : 0)}
	spinActive={isSpinningSymbol}
	scaleX={props.reelSymbol.landScaleX() * (applyWinPresentation ? winScale.current : 1)}
	scaleY={props.reelSymbol.landScaleY() * (applyWinPresentation ? winScale.current : 1)}
	alpha={isSpinningSymbol ? 1 : dimAlphaTween.current}
>
	{#key `${props.reelSymbol.symbolState}-${symbolInfo.type}-${symbolInfo.animationName ?? ''}`}
		<Symbol
			state={props.reelSymbol.symbolState}
			rawSymbol={props.reelSymbol.rawSymbol}
			oncomplete={() => {
				const state = props.reelSymbol.symbolState;
				// Container win bounce completes via `runWinBounce` — don't fire
				// from the spine idle mount oncomplete.
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
