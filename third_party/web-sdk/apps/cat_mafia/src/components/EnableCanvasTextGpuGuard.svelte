<!--
	CanvasText VRAM guard (historically reset/destroy unlabeled atlases).
	Hard GPU drops raced live TightCanvasText BindGroups → `_resourceId` freeze
	on FS Super Press-to-Continue. Sweep is a no-op; keep the effect for future
	safe orphan detection without changing call sites.
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
