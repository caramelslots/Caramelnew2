<script lang="ts">
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		skin: 'bronze' | 'silver' | 'gold';
	};

	const { skin }: Props = $props();
	const spine = getContextSpine();

	// The board paw symbol is just a paw coin — the x1/x2/x3 tier text must NOT
	// render on it (only overlay coins show tiers). Every animation re-sets the
	// text-slot attachment each frame, so hiding the slot once is not enough:
	// strip the text attachments from the Pixi-parsed skins instead. The HTML
	// overlay parses its own copy of coins.json via SpinePlayer, so its tier
	// text is unaffected. Idempotent — safe to run on every paw mount.
	const TEXT_SLOTS = ['x1_bronze', 'x2_silver', 'x3_gold'];
	const stripTierTextAttachments = () => {
		const data = spine.skeleton.data;
		for (const skinName of ['coin_bronze', 'coin_silver', 'coin_gold']) {
			const skinData = data.findSkin(skinName);
			if (!skinData) continue;
			for (const slotName of TEXT_SLOTS) {
				const slotData = data.findSlot(slotName);
				if (slotData) skinData.removeAttachment(slotData.index, slotName);
			}
		}
	};
	stripTierTextAttachments();

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
