<!--
	Sync visible cat skin (gray base / white FS|duel).
	Preload the destination under steam, then drop the idle atlas.
	Portrait duel parks both skins — flanking mascots are not on screen.
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { isBuyBonusWhiteMascotGpuLive } from '../game/buyBonusSharedPixi';
	import { getContext } from '../game/context';
	import { areDuelBoardMascotsParked } from '../game/featureGpuMemory';
	import { stateDuel } from '../game/stateDuel.svelte';
	import {
		ensureMascotCatSpineLoaded,
		MASCOT_CAT_SPINE_GRAY,
		MASCOT_CAT_SPINE_WHITE,
		otherMascotCatSpineKey,
		unloadMascotCatSpine,
		wantedMascotCatSpineKey,
		type MascotCatSpineKey,
	} from '../game/mascotCatSkinMemory';
	import { waitAnimationFrames } from '../game/tirGpuMemory';

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

	const dropIdleSkin = (live: MascotCatSpineKey) => {
		const idle = otherMascotCatSpineKey(live);
		if (idle === MASCOT_CAT_SPINE_WHITE && isBuyBonusWhiteMascotGpuLive()) return;
		const loaded = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
		if (!(idle in loaded)) return;
		app.stateApp.loadedAssets = unloadMascotCatSpine(idle, loaded);
	};

	$effect(() => {
		if (!app.stateApp.loaded) return;

		const gameType = context.stateGame.gameType;
		const duelActive = stateDuel.active;
		const transitionGameType = context.stateGame.transitionGameType;
		const isPortrait = context.stateLayoutDerived.layoutType() === 'portrait';
		const parkBoard = areDuelBoardMascotsParked(isPortrait);

		const visible = wantedMascotCatSpineKey({ gameType, duelActive });
		const upcoming = wantedMascotCatSpineKey({
			gameType,
			duelActive,
			transitionGameType,
		});

		const gen = ++syncGen;
		void (async () => {
			if (parkBoard) {
				let loaded = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
				const dropWhite =
					MASCOT_CAT_SPINE_WHITE in loaded && !isBuyBonusWhiteMascotGpuLive();
				const dropGray = MASCOT_CAT_SPINE_GRAY in loaded;
				if (!dropWhite && !dropGray) {
					context.stateGame.mascotCatSpineKey = MASCOT_CAT_SPINE_GRAY;
					return;
				}
				await waitAnimationFrames(2);
				if (gen !== syncGen) return;
				loaded = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
				if (MASCOT_CAT_SPINE_WHITE in loaded && !isBuyBonusWhiteMascotGpuLive()) {
					loaded = unloadMascotCatSpine(MASCOT_CAT_SPINE_WHITE, loaded);
				}
				if (MASCOT_CAT_SPINE_GRAY in loaded) {
					loaded = unloadMascotCatSpine(MASCOT_CAT_SPINE_GRAY, loaded);
				}
				app.stateApp.loadedAssets = loaded;
				context.stateGame.mascotCatSpineKey = MASCOT_CAT_SPINE_GRAY;
				return;
			}

			// Steam started, theme not switched yet — preload destination only.
			if (upcoming !== visible) {
				await ensureSkin(upcoming, gen);
				return;
			}
			await ensureSkin(visible, gen);
			if (gen !== syncGen) return;
			context.stateGame.mascotCatSpineKey = visible;
			await waitAnimationFrames(2);
			if (gen !== syncGen) return;
			dropIdleSkin(visible);
		})();
	});
</script>
