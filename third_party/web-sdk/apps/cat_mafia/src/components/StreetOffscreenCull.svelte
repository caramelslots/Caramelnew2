<script lang="ts">
	import { onMount } from 'svelte';

	import { getContextSpine } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		isStreetOffscreenCullActive,
		STREET_OFFSCREEN_SLOT_NAMES,
	} from '../game/streetOffscreenCull';

	const context = getContext();
	const spine = getContextSpine();

	let cullActivePlain = false;

	$effect(() => {
		cullActivePlain = isStreetOffscreenCullActive(
			context.stateLayoutDerived.layoutType(),
			context.stateLayoutDerived.canvasSizeType(),
		);
	});

	const offscreenSlots = STREET_OFFSCREEN_SLOT_NAMES.map((name) =>
		spine.skeleton.findSlot(name),
	).filter((slot) => slot != null);

	onMount(() => {
		const previous = spine.beforeUpdateWorldTransforms;
		spine.beforeUpdateWorldTransforms = (...args) => {
			previous?.(...args);
			if (!cullActivePlain) return;
			for (const slot of offscreenSlots) {
				slot.attachment = null;
			}
		};

		return () => {
			spine.beforeUpdateWorldTransforms = previous;
		};
	});
</script>
