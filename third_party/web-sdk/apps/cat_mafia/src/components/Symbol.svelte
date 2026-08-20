<script lang="ts">
	import { BitmapText } from 'pixi-svelte';

	import SymbolSpine from './SymbolSpine.svelte';
	import SymbolSprite from './SymbolSprite.svelte';
	import SymbolCoinPaw from './SymbolCoinPaw.svelte';
	import SymbolPlaceholder from './SymbolPlaceholder.svelte';
	import { getSymbolInfo } from '../game/utils';
	import { BITMAP_FONT_SCALE, FONT_PROSTOI } from '../game/constants';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { getContext } from '../game/context';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
		inViewport?: boolean;
		/**
		 * SW ×N badge: only after curtain / sticky open. Lying SW is a plain wild —
		 * do not show multiplier text even if rawSymbol.multiplier is set.
		 */
		showMultiplier?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const isSprite = $derived(symbolInfo.type === 'sprite');
	const isCoinPaw = $derived(symbolInfo.type === 'coinPaw');
	const isPlaceholder = $derived(symbolInfo.type === 'placeholder');
	const showMultBadge = $derived(
		Boolean(props.showMultiplier && props.rawSymbol.multiplier && props.rawSymbol.name !== 'W'),
	);
</script>

{#if isPlaceholder}
	<SymbolPlaceholder {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />
{:else if isCoinPaw && 'skin' in symbolInfo}
	<SymbolCoinPaw
		x={props.x}
		y={props.y}
		skin={symbolInfo.skin}
		clip={symbolInfo.clip}
		sizeRatio={symbolInfo.sizeRatios.width}
		oncomplete={props.oncomplete}
	/>
{:else if isSprite}
	<SymbolSprite {symbolInfo} x={props.x} y={props.y} oncomplete={props.oncomplete} />
{:else}
	<SymbolSpine
		loop={props.loop}
		{symbolInfo}
		symbolName={props.rawSymbol.name}
		inViewport={props.inViewport}
		x={props.x}
		y={props.y}
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

{#if showMultBadge}
	<BitmapText
		anchor={0.5}
		x={props.x}
		y={props.y}
		text={`${props.rawSymbol.multiplier}X`}
		style={{
			fontFamily: FONT_PROSTOI,
			fontSize: 50 * BITMAP_FONT_SCALE,
		}}
	/>
{/if}
