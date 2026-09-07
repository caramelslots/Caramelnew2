<!--
	п.7 Phone: one cat atlas in GPU.
	Preload under steam; swap visible key only when gameType/duel actually changes
	(not at transition start — that flashed white too early).
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

		/** What the player should see now (theme switch / duel). */
		const visible = wantedMascotCatSpineKey({ gameType, duelActive });
		/** Upcoming skin while steam covers — preload only. */
		const upcoming = wantedMascotCatSpineKey({
			gameType,
			duelActive,
			transitionGameType,
		});

		const gen = ++syncGen;
		void (async () => {
			if (upcoming !== visible) {
				await preloadSkin(upcoming, gen);
				if (gen !== syncGen) return;
			}
			await applyVisibleSkin(visible, gen);
		})();
	});
</script>
