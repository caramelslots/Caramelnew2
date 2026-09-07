<script lang="ts">
	import { onMount } from 'svelte';

	import { getContextSpine } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateDuel } from '../game/stateDuel.svelte';
	import {
		DUEL_HIDDEN_BACKGROUND_SLOTS,
		isStreetOffscreenCullActive,
		STREET_OFFSCREEN_SLOT_NAMES,
	} from '../game/streetOffscreenCull';

	const context = getContext();
	const spine = getContextSpine();

	let cullActivePlain = false;
	let hideDuelCar = false;

	$effect(() => {
		cullActivePlain = isStreetOffscreenCullActive(
			context.stateLayoutDerived.layoutType(),
			context.stateLayoutDerived.canvasSizeType(),
		);
		hideDuelCar = stateDuel.active || stateDuel.phase === 'outro';
	});

	const offscreenSlots = STREET_OFFSCREEN_SLOT_NAMES.map((name) =>
		spine.skeleton.findSlot(name),
	).filter((slot) => slot != null);

	const duelHiddenSlots = DUEL_HIDDEN_BACKGROUND_SLOTS.map((name) =>
		spine.skeleton.findSlot(name),
	).filter((slot) => slot != null);

	onMount(() => {
		const previous = spine.beforeUpdateWorldTransforms;
		spine.beforeUpdateWorldTransforms = (...args) => {
			previous?.(...args);
			if (cullActivePlain) {
				for (const slot of offscreenSlots) {
					slot.attachment = null;
				}
			}
			if (hideDuelCar) {
				for (const slot of duelHiddenSlots) {
					slot.attachment = null;
				}
			}
		};

		return () => {
			spine.beforeUpdateWorldTransforms = previous;
		};
	});
</script>
