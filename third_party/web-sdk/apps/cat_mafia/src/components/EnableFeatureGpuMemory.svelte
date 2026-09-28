<!--
	Duel dog / FS popup / outline: load on feature entry, Assets.unload on settled base.
	Cartridge (BT/BTImg): load on first FS, then stay resident — never unload.
	TIR (shot_bullet / target_board) is owned by EnableTirGpuMemory.
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		DUEL_MASCOT_KEYS,
		ensureFeatureKeysLoaded,
		FS_CARTRIDGE_KEYS,
		FS_OUTLINE_KEYS,
		FS_POPUP_KEYS,
		FS_POPUP_UNLOAD_DELAY_FRAMES,
		shouldKeepDuelMascotGpu,
		shouldKeepFsPopupGpu,
		shouldKeepOutlineReelGpu,
		unloadFeatureKeysAsync,
	} from '../game/featureGpuMemory';
	import assets from '../game/assets';
	import { spineAssetsPossiblyCached } from '../game/spineAtlasEvict';
	import { waitAnimationFrames } from '../game/tirGpuMemory';

	const app = getContextApp();
	const context = getContext();

	let syncGen = 0;

	$effect(() => {
		if (!app.stateApp.loaded) return;

		const gameType = context.stateGame.gameType;
		const upcoming = context.stateGame.transitionGameType ?? gameType;
		const isPortrait = context.stateLayoutDerived.layoutType() === 'portrait';
		const wantCartridge =
			gameType === 'freegame' ||
			upcoming === 'freegame' ||
			context.stateGame.freeSpinIntroActive;
		const wantDog = shouldKeepDuelMascotGpu(isPortrait);
		const wantOutline = shouldKeepOutlineReelGpu();
		const wantFsPopup = shouldKeepFsPopupGpu();
		void context.stateGame.winOverlayActive;

		const gen = ++syncGen;
		void (async () => {
			// Outline first — cat-slow on buy-spin must not wait on Assets.load mid-reel.
			if (wantOutline) {
				const patch = await ensureFeatureKeysLoaded(
					FS_OUTLINE_KEYS,
					(app.stateApp.loadedAssets ?? {}) as Record<string, unknown>,
				);
				if (gen !== syncGen) return;
				if (patch) {
					app.stateApp.loadedAssets = { ...app.stateApp.loadedAssets, ...patch };
				}
			} else {
				const loaded = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
				if (FS_OUTLINE_KEYS.some((key) => key in loaded)) {
					await waitAnimationFrames(FS_POPUP_UNLOAD_DELAY_FRAMES);
					if (gen !== syncGen) return;
					const latest = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
					if (FS_OUTLINE_KEYS.some((key) => key in latest) && !shouldKeepOutlineReelGpu()) {
						app.stateApp.loadedAssets = await unloadFeatureKeysAsync(FS_OUTLINE_KEYS, latest);
					}
				}
			}

			if (gen !== syncGen) return;
			if (wantCartridge) {
				const patch = await ensureFeatureKeysLoaded(
					FS_CARTRIDGE_KEYS,
					(app.stateApp.loadedAssets ?? {}) as Record<string, unknown>,
				);
				if (gen !== syncGen) return;
				if (patch) {
					app.stateApp.loadedAssets = { ...app.stateApp.loadedAssets, ...patch };
				}
			}
			// BT/BTImg stay in RAM after first FS — do not unload on base return.

			if (wantDog) {
				const patch = await ensureFeatureKeysLoaded(
					DUEL_MASCOT_KEYS,
					(app.stateApp.loadedAssets ?? {}) as Record<string, unknown>,
				);
				if (gen !== syncGen) return;
				if (patch) {
					app.stateApp.loadedAssets = { ...app.stateApp.loadedAssets, ...patch };
				}
			} else {
				const loaded = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
				if (DUEL_MASCOT_KEYS.some((key) => key in loaded)) {
					await waitAnimationFrames(FS_POPUP_UNLOAD_DELAY_FRAMES);
					if (gen !== syncGen) return;
					const latest = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
					if (
						DUEL_MASCOT_KEYS.some((key) => key in latest) &&
						!shouldKeepDuelMascotGpu(isPortrait)
					) {
						app.stateApp.loadedAssets = await unloadFeatureKeysAsync(DUEL_MASCOT_KEYS, latest);
					}
				}
			}

			if (gen !== syncGen) return;
			if (wantFsPopup) {
				const patch = await ensureFeatureKeysLoaded(
					FS_POPUP_KEYS,
					(app.stateApp.loadedAssets ?? {}) as Record<string, unknown>,
				);
				if (gen !== syncGen) return;
				if (patch) {
					app.stateApp.loadedAssets = { ...app.stateApp.loadedAssets, ...patch };
				}
			} else {
				const loaded = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
				const fsEntry = assets.fsPopup;
				const atlasUrl =
					fsEntry?.type === 'spine' && typeof fsEntry.src?.atlas === 'string'
						? fsEntry.src.atlas
						: undefined;
				const skeletonUrl =
					fsEntry?.type === 'spine' && typeof fsEntry.src?.skeleton === 'string'
						? fsEntry.src.skeleton
						: undefined;
				// Avoid 8-frame wait + fetch on every base tick when already clean.
				const needsEvict =
					FS_POPUP_KEYS.some((key) => key in loaded) ||
					(atlasUrl != null && spineAssetsPossiblyCached(atlasUrl, skeletonUrl));
				if (!needsEvict) return;
				// Wait for FreeSpinAnimation unmount before Assets.unload.
				await waitAnimationFrames(FS_POPUP_UNLOAD_DELAY_FRAMES);
				if (gen !== syncGen) return;
				if (shouldKeepFsPopupGpu()) return;
				const latest = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
				app.stateApp.loadedAssets = await unloadFeatureKeysAsync(FS_POPUP_KEYS, latest);
			}
		})();
	});
</script>
