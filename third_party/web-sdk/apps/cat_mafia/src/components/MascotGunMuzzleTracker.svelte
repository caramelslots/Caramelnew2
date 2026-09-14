<!--
	Samples the live muzzle-flash bone (`main4`) into screen space so the
	shot projectile leaves the barrel tip (same place as the Spine flash).
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import {
		getMascotGunMuzzlePoint,
		spineWorldToMascotScreen,
		type MascotScreenBox,
	} from '../game/mascotHtmlSpine';
	import { stateGame } from '../game/stateGame.svelte';

	type Props = {
		box: MascotScreenBox;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	/**
	 * `main4` carries the muzzle-flash attachments (`1_0000*`) on `gun_shot`.
	 * `revolver2` is the glow_line tip — secondary fallback.
	 */
	const FLASH_BONE = 'main4';
	const TIP_BONE = 'revolver2';

	let raf = 0;
	let prevAfter: ((s: typeof spine) => void) | undefined;

	const gunZoneOk = (pt: { x: number; y: number }, box: MascotScreenBox) => {
		// Raised pistol sits in the upper-left of the mascot box while aiming.
		const x0 = box.left;
		const x1 = box.left + box.width * 0.62;
		const y0 = box.top + box.height * 0.08;
		const y1 = box.top + box.height * 0.58;
		return pt.x >= x0 && pt.x <= x1 && pt.y >= y0 && pt.y <= y1;
	};

	const sample = () => {
		const box = props.box;
		const fallback = getMascotGunMuzzlePoint(box);
		const pose = stateGame.mascotPose;
		const tracking = pose === 'aim' || pose === 'shoot';
		if (!tracking) {
			stateGame.mascotGunMuzzleScreen = fallback;
			return;
		}

		const skeleton = spine.skeleton;
		const bone = skeleton?.findBone(FLASH_BONE) ?? skeleton?.findBone(TIP_BONE);
		if (!bone) {
			stateGame.mascotGunMuzzleScreen = fallback;
			return;
		}

		const framed = spineWorldToMascotScreen(box, { x: bone.worldX, y: bone.worldY });
		// `main4` origin sits above the visible flash/tip — nudge down to the barrel.
		framed.y += box.height * 0.07;
		stateGame.mascotGunMuzzleScreen = gunZoneOk(framed, box) ? framed : fallback;
	};

	$effect(() => {
		void props.box.left;
		void props.box.top;
		void props.box.width;
		void props.box.height;

		// Sample after Spine updates world transforms so bone.world* is current.
		prevAfter = spine.afterUpdateWorldTransforms;
		spine.afterUpdateWorldTransforms = (s) => {
			prevAfter?.(s);
			sample();
		};

		// Also tick once in case the spine is paused between frames.
		raf = requestAnimationFrame(sample);

		return () => {
			spine.afterUpdateWorldTransforms = prevAfter ?? (() => {});
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};
	});

	onDestroy(() => {
		if (raf) cancelAnimationFrame(raf);
		if (spine.afterUpdateWorldTransforms) {
			spine.afterUpdateWorldTransforms = prevAfter ?? (() => {});
		}
		stateGame.mascotGunMuzzleScreen = null;
	});
</script>
