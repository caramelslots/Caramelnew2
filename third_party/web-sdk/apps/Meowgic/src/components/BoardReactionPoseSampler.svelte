<!--
	Reads `main_board` after each spine pose so reel symbols can scale
	with the spin reaction. Mount once per desk, inside that desk's SpineProvider.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import {
		acquireBoardReactionSampler,
		publishBoardReactionScale,
		releaseBoardReactionSampler,
	} from '../game/boardReactionPose.svelte';

	const spine = getContextSpine();
	const id = acquireBoardReactionSampler();

	const sample = () => {
		const bone = spine.skeleton?.findBone('main_board');
		if (!bone) return;
		const setup = bone.data.setupPose.scaleX || 1;
		publishBoardReactionScale(id, bone.appliedPose.scaleX / setup);
	};

	const previous = spine.afterUpdateWorldTransforms;
	spine.afterUpdateWorldTransforms = (updated) => {
		previous?.(updated);
		sample();
	};

	onDestroy(() => {
		spine.afterUpdateWorldTransforms = previous;
		releaseBoardReactionSampler(id);
	});
</script>
