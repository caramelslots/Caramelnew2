<!--
	Keep front/back/edge slots; drive FS label visibility from the `front` bone
	+ live `back` attachment (same idea as HTML TargetFlipSpine). `edge` is the
	side strip — without it flips look like a flat scaleY squash.

	Reward text only while the wood `back` face is up — never on the bullseye
	`front`. Same value the whole flip; abs scale so glyphs do not mirror.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		slots: readonly string[];
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
		if (!bone || !skel) {
			props.onFrame(1, 1, false);
		} else {
			const sx = bone.scaleX;
			const sy = bone.scaleY;
			const open = Math.abs(sy) >= props.backOpen && Math.abs(sx) >= props.backOpen;
			// Live attachment — works for v3 and v4 without hardcoded time windows.
			const onBack = skel.findSlot('back')?.getAttachment() != null;
			const visible = onBack && open;
			props.onFrame(Math.abs(sx) || 1, Math.abs(sy) || 1, visible);
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
