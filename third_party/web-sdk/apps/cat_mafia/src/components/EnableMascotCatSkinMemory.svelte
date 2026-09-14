<!--
	п.7 Phone: one cat atlas in GPU.
	Preload the destination skin when steam starts. Swap the visible Spine when
	the cloud covers the board (`onThemeSwitch` / gameType), not at FS end and
	not after the transition clip finishes.
	Desktop keeps both skins loaded; only updates stateGame.mascotCatSpineKey.
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateDuel } from '../game/stateDuel.svelte';
	import {
		ensureMascotCatSpineLoaded,
		isPhoneMascotCatSkinUnload,
		otherMascotCatSpineKey,
		unloadMascotCatSpineKey,
		waitAnimationFrames,
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

	/** Ensure atlas in memory (no visible swap). */
	const preloadSkin = async (key: MascotCatSpineKey, gen: number) => {
		const loaded = app.stateApp.loadedAssets ?? {};
		const patch = await ensureMascotCatSpineLoaded(key, loaded);
		if (gen !== syncGen) return;
		applyLoadedPatch(patch);
	};

	/** Apply visible key + optional phone unload of the other. */
	const applyVisibleSkin = async (want: MascotCatSpineKey, gen: number) => {
		await preloadSkin(want, gen);
		if (gen !== syncGen) return;

		context.stateGame.mascotCatSpineKey = want;

		if (!isPhoneMascotCatSkinUnload()) return;

		await waitAnimationFrames(2);
		if (gen !== syncGen) return;
		if (context.stateGame.mascotCatSpineKey !== want) return;

		const drop = otherMascotCatSpineKey(want);
		if (!app.stateApp.loadedAssets?.[drop]) return;
		app.stateApp.loadedAssets = unloadMascotCatSpineKey(
			drop,
			app.stateApp.loadedAssets as Record<string, unknown>,
		);
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
			// Steam started, theme not switched yet — preload only.
			// Swap on `onThemeSwitch` (gameType flips under the cloud), not after the clip.
			if (upcoming !== visible) {
				await preloadSkin(upcoming, gen);
				return;
			}
			await applyVisibleSkin(visible, gen);
		})();
	});
</script>
