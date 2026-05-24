<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { sineOut, sineIn } from 'svelte/easing';
	import { untrack } from 'svelte';

	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolInfo, getSymbolX } from '../game/utils';
	import { WIN_BOUNCE } from '../game/constants';
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
</script>

<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={props.reelSymbol.symbolY() + winYOffset.current}
	scaleX={props.reelSymbol.landScaleX() * winScale.current}
	scaleY={props.reelSymbol.landScaleY() * winScale.current}
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
