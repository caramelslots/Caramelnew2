<script lang="ts">
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		skin: 'bronze' | 'silver' | 'gold';
	};

	const { skin }: Props = $props();
	const spine = getContextSpine();

	const TEXT_TO_PAW = {
		x1_bronze: 'paw_bronze',
		x2_silver: 'paw_silver',
		x3_gold: 'paw_gold',
	} as const;
	// appear_flash shows paw, then the reverse (x1/x2/x3). The board paw is not
	// a paying coin, so the reverse must still be a paw — not a blank disc.
	// Copy the paw attachment onto the text slots (don't strip them: the clip
	// still enables those slots at t≈0.53). Overlay SpinePlayer parses its own
	// json, so paying overlay coins keep their tier text.
	const mirrorPawOnReverse = () => {
		const data = spine.skeleton.data;
		for (const skinName of ['coin_bronze', 'coin_silver', 'coin_gold'] as const) {
			const skinData = data.findSkin(skinName);
			if (!skinData) continue;
			for (const [textSlotName, pawSlotName] of Object.entries(TEXT_TO_PAW)) {
				const textSlot = data.findSlot(textSlotName);
				const pawSlot = data.findSlot(pawSlotName);
				if (!textSlot || !pawSlot) continue;
				const pawAtt = skinData.getAttachment(pawSlot.index, pawSlotName);
				if (pawAtt) skinData.setAttachment(textSlot.index, textSlotName, pawAtt);
			}
		}
	};
	mirrorPawOnReverse();

	const applySkin = (name: Props['skin']) => {
		const skinData = spine.skeleton.data.findSkin(`coin_${name}`);
		if (!skinData) return;
		spine.skeleton.setSkin(skinData);
		spine.skeleton.setSlotsToSetupPose();
		// A frozen parent (autoUpdate=false) never ticks, so re-apply the
		// current track pose after the skin swap to render the new attachments.
		if (spine.autoUpdate === false) spine.update(0);
	};

	applySkin(skin);

	$effect(() => {
		applySkin(skin);
	});
</script>
