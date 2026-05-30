<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { sineOut, sineIn, sineInOut } from 'svelte/easing';
	import { untrack } from 'svelte';

	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolInfo, getSymbolX, toRevealedRawSymbol } from '../game/utils';
	import { WIN_BOUNCE, DIM_NON_WINNING } from '../game/constants';
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

	// Background revealed symbol shown under mystery explosion.
	// Plays the `land` bounce as soon as the reveal starts, then
	// settles to `static` so it stays visible through the explosion.
	let bgSymbolState = $state<'land' | 'static'>('land');

	$effect(() => {
		if (props.reelSymbol.symbolState === 'mysteryReveal') {
			untrack(() => {
				bgSymbolState = 'land';
			});
		}
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
		animating={true}
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
	animating={symbolInfo.type === 'spine' &&
		(props.reelSymbol.symbolState === 'land' ||
			props.reelSymbol.symbolState === 'win' ||
			props.reelSymbol.symbolState === 'mysteryReveal')}
>
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
</SymbolWrap>
