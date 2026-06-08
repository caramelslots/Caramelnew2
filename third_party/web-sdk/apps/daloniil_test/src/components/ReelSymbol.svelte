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

	// Per-symbol win bounce. Only runs for sprite-based win renders
	// (H/L pay symbols, B, M). For W (spine win), the spine drives its
	// own oncomplete via SymbolSpine's listener — we skip the bounce so
	// scale doesn't fight the wild_dynamite animation.
	const winScale = new Tween(1);
	const winYOffset = new Tween(0);

	// Затемнение невыигрышных символов на время подсветки выигрыша.
	// `winSpotlightActive` поднимается хелпером `animateSymbols`
	// (bookEventHandlerMap) и сбрасывается в `reveal` следующего спина.
	// Сам символ остаётся ярким, если он сам в 'win'/'postWinStatic'.
	const isWinningState = $derived(
		props.reelSymbol.symbolState === 'win' || props.reelSymbol.symbolState === 'postWinStatic',
	);
	const dimAlphaTween = new Tween(1);

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

		void winScale.set(peak, { duration: WIN_BOUNCE.upMs, easing: sineOut });
		await winYOffset.set(-lift, { duration: WIN_BOUNCE.upMs, easing: sineOut });

		if (WIN_BOUNCE.holdMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, WIN_BOUNCE.holdMs));
		}

		void winScale.set(1, { duration: WIN_BOUNCE.downMs, easing: sineIn });
		await winYOffset.set(0, { duration: WIN_BOUNCE.downMs, easing: sineIn });

		// Fire only if we're still in win state — defensively skips the call
		// if the state was reset externally (e.g. spin restarted mid-bounce).
		if (props.reelSymbol.symbolState === 'win') {
			props.reelSymbol.oncomplete();
		}
	};

	$effect(() => {
		const state = props.reelSymbol.symbolState;
		const type = symbolInfo.type;
		untrack(() => {
			if (state === 'win' && type === 'sprite') {
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
	y={props.reelSymbol.symbolY() + winYOffset.current}
	scaleX={props.reelSymbol.landScaleX() * winScale.current}
	scaleY={props.reelSymbol.landScaleY() * winScale.current}
	alpha={dimAlphaTween.current}
>
	{#key `${props.reelSymbol.symbolState}-${symbolInfo.type}-${symbolInfo.animationName ?? ''}`}
		<Symbol
			state={props.reelSymbol.symbolState}
			rawSymbol={props.reelSymbol.rawSymbol}
			oncomplete={() => {
				const state = props.reelSymbol.symbolState;
				// Sprite-driven wins are completed by `runWinBounce` after its
				// Tween settles — don't fire from the sprite mount oncomplete.
				if (state === 'win' && symbolInfo.type === 'sprite') return;
				if (state === 'win' || state === 'mysteryReveal' || state === 'land') {
					props.reelSymbol.oncomplete();
				}
				if (state === 'land') props.reelSymbol.symbolState = 'static';
			}}
		/>
	{/key}
</SymbolWrap>
