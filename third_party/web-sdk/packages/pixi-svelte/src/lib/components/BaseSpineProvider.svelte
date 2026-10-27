<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import * as SPINE_PIXI from '@esotericsoftware/spine-pixi-v8';

	import type { OverwriteCursor } from '../types';

	export type Props = OverwriteCursor<Omit<SPINE_PIXI.SpineOptions, 'children'>> & {
		spineData: SPINE_PIXI.SkeletonData;
		children: Snippet;
	};
</script>

<script lang="ts">
	import { propsSyncEffect } from '../utils.svelte';
	import { setContextSpine, getContextParent } from '../context.svelte';

	const props: Props = $props();
	const parentContext = getContextParent();
	// Start frozen: Spine.autoUpdate setter always Ticker.shared.add()'s with no
	// dedupe. Constructing with the default true, then propsSyncEffect writing
	// autoUpdate=true again, double-registers internalUpdate → ~2× playback.
	// spine-pixi 4.3 sends the whole skeleton through the dark-tint batcher when
	// any slot has a setup dark color. That shader does not draw on Pixi 8.16
	// (the wizard is the only such spine, so the cat vanished while symbols
	// stayed). Two-color tint is unused; the default batcher draws the mesh.
	const spine = new SPINE_PIXI.Spine({
		skeletonData: props.spineData,
		autoUpdate: false,
		darkTint: false,
	});

	propsSyncEffect({
		props,
		target: spine,
		ignore: ['children', 'spineData', 'autoUpdate'],
	});

	// Sole registration path — guard so true→true never stacks listeners.
	$effect(() => {
		const next = props.autoUpdate ?? true;
		if (spine.autoUpdate !== next) spine.autoUpdate = next;
	});

	parentContext.addToParent(spine);
	setContextSpine(spine);
</script>

{@render props.children()}
