<!--
	Sync visible cat skin key (gray base / white FS|duel).
	Both atlases stay in loadedAssets — no phone unload.
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateDuel } from '../game/stateDuel.svelte';
	import {
		ensureMascotCatSpineLoaded,
		wantedMascotCatSpineKey,
		type MascotCatSpineKey,
	} from '../game/mascotCatSkinMemory';

	const app = getContextApp();
	const context = getContext();

	let syncGen = 0;

	const applyLoadedPatch = (patch: Record<string, unknown> | null) => {
		if (!patch) return;
		app.stateApp.loadedAssets = {
			...app.stateApp.loadedAssets,
			...patch,
		};
	};

	const ensureSkin = async (key: MascotCatSpineKey, gen: number) => {
		const loaded = app.stateApp.loadedAssets ?? {};
		const patch = await ensureMascotCatSpineLoaded(key, loaded);
		if (gen !== syncGen) return;
		applyLoadedPatch(patch);
	};

	$effect(() => {
		if (!app.stateApp.loaded) return;

		const gameType = context.stateGame.gameType;
		const duelActive = stateDuel.active;
		const transitionGameType = context.stateGame.transitionGameType;

		const visible = wantedMascotCatSpineKey({ gameType, duelActive });
		const upcoming = wantedMascotCatSpineKey({
			gameType,
			duelActive,
			transitionGameType,
		});

		const gen = ++syncGen;
		void (async () => {
			// Steam started, theme not switched yet — preload destination only.
			if (upcoming !== visible) {
				await ensureSkin(upcoming, gen);
				return;
			}
			await ensureSkin(visible, gen);
			if (gen !== syncGen) return;
			context.stateGame.mascotCatSpineKey = visible;
		})();
	});
</script>
