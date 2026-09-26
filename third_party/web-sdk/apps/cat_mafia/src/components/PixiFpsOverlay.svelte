<!--
	Optional HUD: live Pixi ticker FPS + 1s min (spin hitch detector).
	Pinned from Dev menu → FPS ON. Only mounted while SHOW_DEV_UI is on.
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { pixiFpsHud } from '../game/pixiFpsHud.svelte';

	const SAMPLE_MS = 200;
	const MIN_WINDOW_MS = 1000;

	const app = getContextApp();

	let fps = $state(0);
	let minFps = $state(0);
	let maxFpsCap = $state(0);
	/** Rolling frame times in the last ~1s for min FPS. */
	let frameTs: number[] = [];

	$effect(() => {
		if (!pixiFpsHud.overlay) return;

		let raf = 0;
		let sampleId = 0;
		let cancelled = false;

		const onFrame = (now: number) => {
			if (cancelled) return;
			frameTs.push(now);
			const cutoff = now - MIN_WINDOW_MS;
			while (frameTs.length > 2 && frameTs[0]! < cutoff) frameTs.shift();
			raf = requestAnimationFrame(onFrame);
		};
		raf = requestAnimationFrame(onFrame);

		const sample = () => {
			const pixi = app.stateApp.pixiApplication;
			const ticker = pixi?.ticker;
			fps = ticker ? Math.round(ticker.FPS) : 0;
			maxFpsCap = ticker?.maxFPS ?? 0;

			if (frameTs.length >= 2) {
				let worstDt = 0;
				for (let i = 1; i < frameTs.length; i++) {
					const dt = frameTs[i]! - frameTs[i - 1]!;
					if (dt > worstDt) worstDt = dt;
				}
				minFps = worstDt > 0 ? Math.round(1000 / worstDt) : fps;
			} else {
				minFps = fps;
			}
		};
		sample();
		sampleId = window.setInterval(sample, SAMPLE_MS);

		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
			clearInterval(sampleId);
			frameTs = [];
		};
	});

	const capLabel = $derived(maxFpsCap > 0 ? String(maxFpsCap) : '∞');
	const warn = $derived(fps > 0 && (fps < 50 || minFps < 40));
</script>

{#if pixiFpsHud.overlay}
	<div class="pixi-fps" class:pixi-fps--warn={warn} data-test="pixi-fps">
		<span class="pixi-fps__main">{fps || '—'} FPS</span>
		<span class="pixi-fps__meta">min {minFps || '—'} · cap {capLabel}</span>
	</div>
{/if}

<style lang="scss">
	.pixi-fps {
		position: fixed;
		top: 8px;
		left: 8px;
		z-index: 99999;
		pointer-events: none;
		padding: 6px 10px;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.72);
		color: #e8ffe8;
		font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		letter-spacing: 0.01em;
		backdrop-filter: blur(4px);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.pixi-fps--warn {
		color: #ffe08a;
	}

	.pixi-fps--warn .pixi-fps__main {
		color: #ffb4a0;
	}

	.pixi-fps__main {
		font-weight: 700;
		font-size: 14px;
		color: #9dffb0;
	}

	.pixi-fps__meta {
		opacity: 0.8;
		font-size: 11px;
	}
</style>
