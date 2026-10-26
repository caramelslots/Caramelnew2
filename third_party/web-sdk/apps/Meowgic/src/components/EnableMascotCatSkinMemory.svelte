<!--
	One wizard cat for base, free spins, and duel. No gray/white atlas swap.
-->
<script lang="ts">
	import { getContext } from '../game/context';
	import { MASCOT_CAT_SPINE_WHITE } from '../game/mascotCatSkinMemory';

	const context = getContext();

	$effect(() => {
		context.stateGame.mascotCatSpineKey = MASCOT_CAT_SPINE_WHITE;
	});
</script>
