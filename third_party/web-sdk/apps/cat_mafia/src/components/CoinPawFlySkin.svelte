<!-- Paying overlay coins — keep tier skins (x1/x2/x3 text), no board paw-mirror. -->
<script lang="ts">
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		skin: 'bronze' | 'silver' | 'gold';
	};

	const { skin }: Props = $props();
	const spine = getContextSpine();

	const applySkin = (name: Props['skin']) => {
		const skinData = spine.skeleton.data.findSkin(`coin_${name}`);
		if (!skinData) return;
		spine.skeleton.setSkin(skinData);
		spine.skeleton.setSlotsToSetupPose();
		if (spine.autoUpdate === false) spine.update(0);
	};

	$effect(() => {
		applySkin(skin);
	});
</script>
