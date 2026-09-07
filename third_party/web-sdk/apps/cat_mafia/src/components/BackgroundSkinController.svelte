<script lang="ts">
	import { Skin } from '@esotericsoftware/spine-pixi-v8';
	import { getContextSpine } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { isPhoneCanvasSizeType } from '../game/streetOffscreenCull';

	type Props = {
		/** `day` = basegame (light), `night` = freegame / FS (dark). */
		skin: 'day' | 'night';
	};

	const { skin }: Props = $props();
	const spine = getContextSpine();
	const context = getContext();

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

	// Spine.autoUpdate=true adds a Pixi ticker listener with no duplicate guard.
	// Passing it as a SpineProvider prop would register a second listener (2× speed).
	// Phones + loading screen: keep the street static (no idle spine tick).
	$effect(() => {
		const phone = isPhoneCanvasSizeType(context.stateLayoutDerived.canvasSizeType());
		const loading = context.stateLayout.showLoadingScreen;
		const next = !phone && !loading && !context.stateGame.winOverlayActive;
		if (spine.autoUpdate !== next) spine.autoUpdate = next;
		if (phone || loading) {
			// One pose refresh so StreetOffscreenCull / skin apply still settle.
			spine.update(0);
		}
	});
</script>
