<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { CELL_SYMBOL_SIZE } from '../game/constants';
	import { ensureSymbolCellFits } from '../game/symbolCellFit.svelte';

	const context = getContextApp();
	let ran = false;

	$effect(() => {
		if (ran || !context.stateApp.loaded) return;
		ensureSymbolCellFits(context.stateApp.loadedAssets, CELL_SYMBOL_SIZE);
		ran = true;
	});
</script>
