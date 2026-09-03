<!--
	Keep front/back/edge slots; drive FS label visibility from the `front` bone
	(same windows as HTML TargetFlipSpine). `edge` is the side strip — without it
	flips look like a flat scaleY squash.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		slots: readonly string[];
		backA: readonly [number, number];
		backB: number;
		backOpen: number;
		onFrame: (scaleX: number, scaleY: number, visible: boolean) => void;
	};

	const props: Props = $props();
	const spine = getContextSpine();
	let raf = 0;

	const hideExtraSlots = () => {
		const skel = spine.skeleton;
		if (!skel) return;
		const keep = new Set(props.slots);
		for (const slot of skel.slots) {
			if (keep.has(slot.data.name)) continue;
			try {
				skel.setAttachment(slot.data.name, null);
			} catch {
				slot.setAttachment(null);
			}
		}
	};

	const tick = () => {
		const skel = spine.skeleton;
		const bone = skel?.findBone('front');
		const t = spine.state?.getCurrent(0)?.trackTime ?? 0;
		if (!bone) {
			props.onFrame(1, 1, false);
		} else {
			const onBack =
				(t >= props.backA[0] && t < props.backA[1]) || t >= props.backB;
			const open =
				Math.abs(bone.scaleY) >= props.backOpen && Math.abs(bone.scaleX) >= props.backOpen;
			props.onFrame(bone.scaleX, bone.scaleY, onBack && open);
		}
		raf = requestAnimationFrame(tick);
	};

	$effect(() => {
		void props.slots;
		hideExtraSlots();
		raf = requestAnimationFrame(tick);
		return () => {
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};
	});

	onDestroy(() => {
		if (raf) cancelAnimationFrame(raf);
	});
</script>
