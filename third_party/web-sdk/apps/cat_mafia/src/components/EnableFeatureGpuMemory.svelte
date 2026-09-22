<!--
	Duel dog / tir / FS popup: load on feature entry, drop on settled base.
	Cartridge (BT/BTImg): load on first FS, then stay resident — never unload.
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
		unloadFeatureKeys,
	} from '../game/featureGpuMemory';
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
					await waitAnimationFrames(2);
					if (gen !== syncGen) return;
					const latest = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
					if (DUEL_MASCOT_KEYS.some((key) => key in latest)) {
						app.stateApp.loadedAssets = unloadFeatureKeys(DUEL_MASCOT_KEYS, latest);
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
				if (FS_POPUP_KEYS.some((key) => key in loaded)) {
					// Wait for FreeSpinAnimation unmount before Assets.unload —
					// too-early drop caused missing-key + `_resourceId` freezes.
					await waitAnimationFrames(FS_POPUP_UNLOAD_DELAY_FRAMES);
					if (gen !== syncGen) return;
					const latest = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
					if (FS_POPUP_KEYS.some((key) => key in latest) && !shouldKeepFsPopupGpu()) {
						app.stateApp.loadedAssets = unloadFeatureKeys(FS_POPUP_KEYS, latest);
					}
				}
			}

			if (gen !== syncGen) return;
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
					app.stateApp.loadedAssets = unloadFeatureKeys(FS_OUTLINE_KEYS, loaded);
				}
			}
		})();
	});
</script>
