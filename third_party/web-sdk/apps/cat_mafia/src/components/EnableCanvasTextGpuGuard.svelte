<!--
	Base, bonus normal, and duel must not keep leftover CanvasText atlas
	pages (unlabeled tex# ~4 MB). Super drum labels are BitmapText now;
	this sweeps orphans after mode / curtain changes.
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { releaseExcessCanvasTextGpu } from '../game/pixiTextureMemory';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { waitAnimationFrames } from '../game/tirGpuMemory';

	const app = getContextApp();
	const context = getContext();

	let syncGen = 0;

	const shouldGuard = () => {
		if (stateDuel.active || stateDuel.phase !== 'idle') return true;
		if (context.stateGame.gameType === 'freegame') {
			return context.stateGame.bonusMode !== 'super';
		}
		return true;
	};

	$effect(() => {
		if (!app.stateApp.loaded) return;
		void context.stateGame.gameType;
		void context.stateGame.bonusMode;
		void context.stateGame.transitionGameType;
		void stateDuel.active;
		void stateDuel.phase;
		void context.stateGame.superWildCurtains.length;
		void stateDuel.superWildCurtains.length;

		if (!shouldGuard()) return;

		const gen = ++syncGen;
		void waitAnimationFrames(2).then(() => {
			if (gen !== syncGen) return;
			if (!shouldGuard()) return;
			releaseExcessCanvasTextGpu(app.stateApp.pixiApplication ?? null);
		});
	});
</script>
