<script lang="ts" module>
	import * as PIXI from 'pixi.js';

	import type { OverwriteCursor } from '../types';

	export type Props = OverwriteCursor<PIXI.SpriteOptions> & {
		isMask?: boolean;
		// Fires once with the underlying PIXI.Sprite right after creation.
		// Lets callers drive cheap per-frame properties (e.g. rotation) directly
		// on the instance via a ticker, bypassing Svelte reactivity — critical
		// for hot 60fps animations where reactive prop sync is too expensive.
		oncreate?: (sprite: PIXI.Sprite) => void;
	};
</script>

<script lang="ts">
	import { propsSyncEffect } from '../utils.svelte';
	import { getContextParent } from '../context.svelte';

	const props: Props = $props();

	const parentContext = getContextParent();
	const sprite = new PIXI.Sprite(props.texture);

	propsSyncEffect({ props, target: sprite, ignore: ['isMask', 'oncreate'] });

	props.oncreate?.(sprite);

	$effect(() => {
		if (props.isMask !== undefined) {
			parentContext.parent.mask = props.isMask ? sprite : null;
		}
	});

	parentContext.addToParent(sprite);
</script>
