<script lang="ts">
	/**
	 * Hides Spine slots every frame so base/overlay BoardFrame layers can
	 * share one skeleton: desk body under reels, crest/glow above symbols.
	 */
	import { onMount } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		/** Slot names to clear (no attachment) while this layer is mounted. */
		hiddenSlots: readonly string[];
		/**
		 * Additive glow slots that are fully opaque in setup pose — force
		 * alpha 0 until the celebrate clip keys them.
		 */
		zeroAlphaSlots?: readonly string[];
	};

	const props: Props = $props();
	const spine = getContextSpine();

	const hidden = props.hiddenSlots
		.map((name) => spine.skeleton.findSlot(name))
		.filter((slot) => slot != null);

	const zeroAlpha = (props.zeroAlphaSlots ?? [])
		.map((name) => spine.skeleton.findSlot(name))
		.filter((slot) => slot != null);

	onMount(() => {
		for (const slot of zeroAlpha) {
			slot.color.a = 0;
		}

		const previous = spine.beforeUpdateWorldTransforms;
		spine.beforeUpdateWorldTransforms = (...args) => {
			previous?.(...args);
			for (const slot of hidden) {
				slot.attachment = null;
			}
		};

		return () => {
			spine.beforeUpdateWorldTransforms = previous;
		};
	});
</script>
