<script lang="ts">
	import { Skin } from '@esotericsoftware/spine-pixi-v8';
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

	/**
	 * Board PB/PS/PG: appear_flash flips to the reverse face. Paying overlay
	 * coins must keep x1/x2/x3 on the shared `coin_*` skins — so mirror paw
	 * onto the text slots only on a per-SkeletonData clone, never mutate the
	 * asset skins (PawCoinPixiLayer shares `coinsPaw` with the board).
	 */
	const boardSkinCache = new WeakMap<object, Map<string, Skin>>();

	const boardSkinFor = (name: Props['skin']): Skin | null => {
		const data = spine.skeleton.data;
		const base = data.findSkin(`coin_${name}`);
		if (!base) return null;

		let byName = boardSkinCache.get(data);
		if (!byName) {
			byName = new Map();
			boardSkinCache.set(data, byName);
		}
		const cached = byName.get(name);
		if (cached) return cached;

		const board = new Skin(`coin_${name}_board`);
		board.addSkin(base);
		for (const [textSlotName, pawSlotName] of Object.entries(TEXT_TO_PAW)) {
			const textSlot = data.findSlot(textSlotName);
			const pawSlot = data.findSlot(pawSlotName);
			if (!textSlot || !pawSlot) continue;
			const pawAtt = board.getAttachment(pawSlot.index, pawSlotName);
			if (pawAtt) board.setAttachment(textSlot.index, textSlotName, pawAtt);
		}
		byName.set(name, board);
		return board;
	};

	const applySkin = (name: Props['skin']) => {
		const skinData = boardSkinFor(name);
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
