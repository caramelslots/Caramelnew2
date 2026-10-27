<!-- Hide all shot-bullet slots except the active fly/impact set. -->
<script lang="ts">
	import { getContextSpine } from 'pixi-svelte';

	type Props = { slots: readonly string[] };

	const props: Props = $props();
	const spine = getContextSpine();

	$effect(() => {
		const keep = new Set(props.slots);
		const skel = spine.skeleton;
		if (!skel) return;
		skel.setupPoseSlots();
		for (const slot of skel.slots) {
			if (keep.has(slot.data.name)) continue;
			try {
				skel.setAttachment(slot.data.name, null);
			} catch {
				slot.pose.setAttachment(null);
				slot.appliedPose.setAttachment(null);
			}
		}
	});
</script>
