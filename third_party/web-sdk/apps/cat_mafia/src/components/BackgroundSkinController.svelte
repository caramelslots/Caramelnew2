<script lang="ts">
	import { Skin } from '@esotericsoftware/spine-pixi-v8';
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		/** `day` = basegame (light), `night` = freegame / FS (dark). */
		skin: 'day' | 'night';
	};

	const { skin }: Props = $props();
	const spine = getContextSpine();

	const applySkin = (skinName: 'day' | 'night') => {
		const combined = new Skin('catBackground');
		const defaultSkin = spine.skeleton.data.findSkin('default');
		const themeSkin = spine.skeleton.data.findSkin(skinName);
		if (defaultSkin) combined.addSkin(defaultSkin);
		if (themeSkin) combined.addSkin(themeSkin);
		spine.skeleton.setSkin(combined);
		spine.skeleton.setSlotsToSetupPose();
	};

	applySkin(skin);

	$effect(() => {
		applySkin(skin);
	});
</script>
