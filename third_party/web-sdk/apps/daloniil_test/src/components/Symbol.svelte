<script lang="ts">
	import { SpineProvider, SpineTrack, BitmapText } from 'pixi-svelte';

	import SymbolSpine from './SymbolSpine.svelte';
	import SymbolSprite from './SymbolSprite.svelte';
	import SymbolMysterySprite from './SymbolMysterySprite.svelte';
	import SymbolPlaceholder from './SymbolPlaceholder.svelte';
	import { getSymbolInfo } from '../game/utils';
	import { BITMAP_FONT_SCALE, FONT_PROSTOI, SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { getContext } from '../game/context';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const isSprite = $derived(symbolInfo.type === 'sprite');
	const isMysterySprite = $derived(symbolInfo.type === 'mysterySprite');
	const isPlaceholder = $derived(symbolInfo.type === 'placeholder');
	// Payframe glow overlay rendered around win symbols. Lives at the
	// `Symbol` level (not inside SymbolSpine) so it shows for both sprite
	// (H/L pay symbols) and spine (W) win renders. Excluded for B and M
	// — historically those bonus tokens never had a payframe.
	// W (wild) plays its own `Special_2/win` spine which provides the full
	// celebration visual — the payframe glow would overlap the spine art.
	const showWinFrame = $derived(
		props.state === 'win' && !['B', 'M', 'W'].includes(props.rawSymbol.name),
	);
</script>

{#if isPlaceholder}
	<SymbolPlaceholder {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />
{:else if isMysterySprite}
	<SymbolMysterySprite {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />
{:else if isSprite}
	<SymbolSprite {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />
{:else}
	<SymbolSpine
		loop={props.loop}
		{symbolInfo}
		x={props.x}
		y={props.y}
		showWinFrame={false}
		listener={{
			complete: props.oncomplete,
			event: (_, event) => {
				if (event.data?.name === 'wildExplode') {
					context.eventEmitter?.broadcast({ type: 'soundOnce', name: 'sfx_wild_explode' });
				}
			},
		}}
	/>
{/if}

{#if showWinFrame}
	<SpineProvider x={props.x} y={props.y} key="anticipation" width={SYMBOL_SIZE * 0.19}>
		<SpineTrack trackIndex={0} animationName={'payframe'} loop />
	</SpineProvider>
{/if}

{#if (props.rawSymbol.multiplier ?? 0) > 1}
	<BitmapText
		anchor={0.5}
		x={props.x}
		y={(props.y ?? 0) + (props.rawSymbol.name === 'W' ? SYMBOL_SIZE * 0.22 : 0)}
		text={`x${props.rawSymbol.multiplier}`}
		style={{
			fontFamily: FONT_PROSTOI,
			fontSize: (props.rawSymbol.name === 'W' ? 42 : 50) * BITMAP_FONT_SCALE,
		}}
	/>
{/if}
