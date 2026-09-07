<script lang="ts">
	/**
	 * Bonus: keep the designer clip-mask so the cat/bg stay inside the frame
	 * (no paws under the BONUS bar), but draw `frame` / `frame2` *after* the
	 * clip end slot so the gold rails + BONUS banner aren't covered by bg.
	 */
	import { onMount } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	const spine = getContextSpine();

	const FRAME_SLOT_NAMES = new Set(['frame', 'frame2']);

	onMount(() => {
		const order = spine.skeleton.drawOrder;
		const frames: typeof order = [];
		const others: typeof order = [];
		for (let i = 0; i < order.length; i++) {
			const slot = order[i];
			if (FRAME_SLOT_NAMES.has(slot.data.name)) frames.push(slot);
			else others.push(slot);
		}
		for (let i = 0; i < others.length; i++) order[i] = others[i];
		for (let i = 0; i < frames.length; i++) order[others.length + i] = frames[i];
	});
</script>
