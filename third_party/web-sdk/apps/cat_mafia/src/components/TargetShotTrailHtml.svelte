<!--
	SVG shot trail above HTML seats (z ~70). Reveals by trimming the polyline
	(no pathLength/dash — more reliable across browsers).
-->
<script lang="ts">
	import { onDestroy } from 'svelte';

	import { stateGame } from '../game/stateGame.svelte';
	import {
		TARGET_SHOT_FLY_MS,
		TARGET_SHOT_PATH_FADE_MS,
		polylineSvgPath,
	} from '../game/shotBulletAssets';

	const flight = $derived(stateGame.targetShotFlight);

	let pathD = $state('');
	let activeNonce = 0;
	let raf = 0;
	let pathFadeRaf = 0;
	let pathPts: { x: number; y: number }[] = [];

	const clearRaf = () => {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
	};
	const clearPathFade = () => {
		if (pathFadeRaf) cancelAnimationFrame(pathFadeRaf);
		pathFadeRaf = 0;
	};

	const setRevealed = (from: number, to: number) => {
		const pts = pathPts;
		if (pts.length < 2) {
			pathD = '';
			return;
		}
		const a = Math.max(0, Math.min(1, from));
		const b = Math.max(a, Math.min(1, to));
		if (b - a < 0.001) {
			pathD = '';
			return;
		}
		const i0 = Math.floor(a * (pts.length - 1));
		const i1 = Math.max(i0 + 1, Math.ceil(b * (pts.length - 1)));
		pathD = polylineSvgPath(pts.slice(i0, i1 + 1));
	};

	const fadePathOut = (nonce: number) => {
		clearPathFade();
		const origin = performance.now();
		const tick = (now: number) => {
			if (nonce !== activeNonce) return;
			const t = Math.min(1, (now - origin) / TARGET_SHOT_PATH_FADE_MS);
			const trim = t * t;
			setRevealed(trim, 1);
			if (t < 1) {
				pathFadeRaf = requestAnimationFrame(tick);
				return;
			}
			pathD = '';
		};
		pathFadeRaf = requestAnimationFrame(tick);
	};

	$effect(() => {
		const f = flight;
		if (!f || f.nonce < 1) return;
		if (f.nonce === activeNonce) return;

		clearRaf();
		clearPathFade();
		activeNonce = f.nonce;
		pathPts =
			f.points.length >= 2
				? f.points
				: [
						{ x: f.startX, y: f.startY },
						{ x: f.endX, y: f.endY },
					];
		const flyMs = Math.max(280, f.flyMs ?? TARGET_SHOT_FLY_MS);
		const nonce = f.nonce;

		setRevealed(0, 0);
		const origin = performance.now();

		const tick = (now: number) => {
			if (nonce !== activeNonce) return;
			const t = Math.min(1, (now - origin) / flyMs);
			const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
			setRevealed(0, ease);
			if (t < 1) {
				raf = requestAnimationFrame(tick);
				return;
			}
			fadePathOut(nonce);
		};
		raf = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		clearRaf();
		clearPathFade();
	});
</script>

{#if pathD}
	<svg class="path-layer" aria-hidden="true">
		<path class="path-glow" d={pathD} />
		<path class="path-core" d={pathD} />
	</svg>
{/if}

<style lang="scss">
	.path-layer {
		position: fixed;
		inset: 0;
		z-index: 70;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		overflow: visible;
	}

	.path-glow {
		fill: none;
		stroke: rgba(255, 200, 90, 0.45);
		stroke-width: 6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.path-core {
		fill: none;
		stroke: rgba(255, 236, 170, 0.95);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
