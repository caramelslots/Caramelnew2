<!--
	Shot FX — Spine bullet on the gallery-hook arc + our SVG path (no Spine
	motion lines). Path wipes muzzle→hit after impact. Then explosion_bullet.
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { SpinePlayer } from '@esotericsoftware/spine-player';
	import '@esotericsoftware/spine-player/dist/spine-player.css';

	import { isHtmlWebglPaused } from '../game/htmlWebglPause';
	import {
		SHOT_BULLET_FLY_ANCHOR,
		SHOT_BULLET_FLY_ANIM,
		SHOT_BULLET_FLY_DISPLAY,
		SHOT_BULLET_FLY_SLOTS,
		SHOT_BULLET_FLY_VIEWPORT,
		SHOT_BULLET_IMPACT_ANCHOR,
		SHOT_BULLET_IMPACT_ANIM,
		SHOT_BULLET_IMPACT_SLOTS,
		SHOT_BULLET_IMPACT_VIEWPORT,
		TARGET_SHOT_FLY_MS,
		TARGET_SHOT_IMPACT_MS,
		TARGET_SHOT_PATH_FADE_MS,
		resolveShotBulletSpineUrl,
		sampleShotPath,
	} from '../game/shotBulletAssets';

	export type TargetShotFlight = {
		nonce: number;
		startX: number;
		startY: number;
		endX: number;
		endY: number;
		/** Dense muzzle→seat samples from `buildTargetShotCurve`. */
		points: { x: number; y: number }[];
		flyMs?: number;
	};

	type Props = {
		flight: TargetShotFlight | null;
	};

	const props: Props = $props();

	let phase = $state<'idle' | 'fly' | 'impact'>('idle');
	let wrapStyle = $state('opacity:0');
	let pathD = $state('');
	/** 0 = full path from muzzle; 1 = wiped through to the tip. */
	let pathTrim = $state(0);
	let host = $state<HTMLDivElement | undefined>();
	let player: SpinePlayer | undefined;
	let ready = $state(false);
	let raf = 0;
	let impactTimer: ReturnType<typeof setTimeout> | undefined;
	let pathFadeRaf = 0;
	let activeNonce = 0;

	const clearRaf = () => {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
	};

	const clearPathFade = () => {
		if (pathFadeRaf) cancelAnimationFrame(pathFadeRaf);
		pathFadeRaf = 0;
	};

	const clearImpactTimer = () => {
		if (impactTimer !== undefined) clearTimeout(impactTimer);
		impactTimer = undefined;
	};

	const showOnlySlots = (spinePlayer: SpinePlayer | undefined, names: readonly string[]) => {
		const skel = spinePlayer?.skeleton;
		if (!skel) return;
		// Impact clears the bullet attachment — restore setup pose first so the
		// next fly shot has a texture again.
		skel.setSlotsToSetupPose();
		const keep = new Set(names);
		for (const slot of skel.slots) {
			if (keep.has(slot.data.name)) continue;
			try {
				skel.setAttachment(slot.data.name, null);
			} catch {
				slot.setAttachment(null);
			}
		}
	};

	const playClip = (name: string, loop: boolean, slots: readonly string[]) => {
		if (!player?.animationState || !ready) return;
		player.paused = isHtmlWebglPaused();
		showOnlySlots(player, slots);
		player.animationState.setAnimation(0, name, loop);
	};

	const setFlyPose = (x: number, y: number, tipRotDeg: number, opacity: number) => {
		const ax = SHOT_BULLET_FLY_ANCHOR.x * 100;
		const ay = SHOT_BULLET_FLY_ANCHOR.y * 100;
		wrapStyle = [
			`left:${x}px`,
			`top:${y}px`,
			`width:${SHOT_BULLET_FLY_DISPLAY.width}px`,
			`height:${SHOT_BULLET_FLY_DISPLAY.height}px`,
			`opacity:${opacity}`,
			`transform-origin:${ax}% ${ay}%`,
			`transform:translate(-${ax}%,-${ay}%) rotate(${tipRotDeg}deg)`,
		].join(';');
	};

	const setImpactPose = (x: number, y: number) => {
		// Pin explosion root (skeleton 0,0) to the hit — not the fly tip anchor.
		const ax = SHOT_BULLET_IMPACT_ANCHOR.x * 100;
		const ay = SHOT_BULLET_IMPACT_ANCHOR.y * 100;
		wrapStyle = [
			`left:${x}px`,
			`top:${y}px`,
			`width:${SHOT_BULLET_FLY_DISPLAY.width}px`,
			`height:${SHOT_BULLET_FLY_DISPLAY.height}px`,
			`opacity:1`,
			`transform-origin:${ax}% ${ay}%`,
			`transform:translate(-${ax}%,-${ay}%)`,
		].join(';');
	};

	/** Wipe the stroke from the first point (muzzle) toward the tip. */
	const fadePathOut = (nonce: number) => {
		clearPathFade();
		const origin = performance.now();
		const tick = (now: number) => {
			if (nonce !== activeNonce) return;
			const t = Math.min(1, (now - origin) / TARGET_SHOT_PATH_FADE_MS);
			// Ease-in so the muzzle clears first and the tip lingers briefly.
			pathTrim = t * t;
			if (t < 1) {
				pathFadeRaf = requestAnimationFrame(tick);
				return;
			}
			pathTrim = 1;
			pathD = '';
		};
		pathFadeRaf = requestAnimationFrame(tick);
	};

	const endImpact = (nonce: number) => {
		if (nonce !== activeNonce) return;
		phase = 'idle';
		wrapStyle = 'opacity:0';
		player?.animationState?.setEmptyAnimation(0, 0);
	};

	const startImpact = (x: number, y: number, nonce: number) => {
		phase = 'impact';
		setImpactPose(x, y);
		playClip(SHOT_BULLET_IMPACT_ANIM, false, SHOT_BULLET_IMPACT_SLOTS);
		fadePathOut(nonce);
		clearImpactTimer();
		impactTimer = setTimeout(() => endImpact(nonce), TARGET_SHOT_IMPACT_MS);
	};

	// pathLength=1 → trim from muzzle (start) toward tip (end).
	const pathStrokeStyle = $derived(
		`stroke-dasharray:${Math.max(0, 1 - pathTrim)} 1;stroke-dashoffset:${-pathTrim}`,
	);

	onMount(() => {
		const el = host;
		if (!el) return;

		const created = new SpinePlayer(el, {
			jsonUrl: resolveShotBulletSpineUrl('shot_bullet.json'),
			atlasUrl: resolveShotBulletSpineUrl('shot_bullet.atlas'),
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: false,
			preserveDrawingBuffer: false,
			alpha: true,
			viewport: {
				...SHOT_BULLET_FLY_VIEWPORT,
				animations: {
					[SHOT_BULLET_FLY_ANIM]: SHOT_BULLET_FLY_VIEWPORT,
					[SHOT_BULLET_IMPACT_ANIM]: SHOT_BULLET_IMPACT_VIEWPORT,
					explosion: SHOT_BULLET_IMPACT_VIEWPORT,
				},
			},
			success: (spinePlayer) => {
				spinePlayer.skeleton!.scaleY = -1;
				showOnlySlots(spinePlayer, SHOT_BULLET_FLY_SLOTS);
				spinePlayer.animationState?.setEmptyAnimation(0, 0);
				spinePlayer.paused = isHtmlWebglPaused();
				ready = true;
			},
			error: (_p, msg) => {
				console.error('[TargetShotBulletOverlay]', msg);
			},
		});
		player = created;

		return () => {
			created.dispose();
			if (player === created) player = undefined;
			ready = false;
		};
	});

	$effect(() => {
		const flight = props.flight;
		if (!flight || flight.nonce < 1) return;
		if (flight.nonce === activeNonce && phase !== 'idle') return;

		clearRaf();
		clearPathFade();
		clearImpactTimer();
		activeNonce = flight.nonce;

		const pathPts =
			flight.points.length >= 2
				? flight.points
				: [
						{ x: flight.startX, y: flight.startY },
						{ x: flight.endX, y: flight.endY },
					];
		const endX = flight.endX;
		const endY = flight.endY;
		const flyMs = Math.max(280, flight.flyMs ?? TARGET_SHOT_FLY_MS);
		const nonce = flight.nonce;
		const pts: string[] = [];

		phase = 'fly';
		pathD = '';
		pathTrim = 0;
		playClip(SHOT_BULLET_FLY_ANIM, true, SHOT_BULLET_FLY_SLOTS);
		const origin = performance.now();

		const tick = (now: number) => {
			if (nonce !== activeNonce) return;
			const t = Math.min(1, (now - origin) / flyMs);
			const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
			const sample = sampleShotPath(pathPts, ease);
			const angleDeg = (Math.atan2(sample.ty, sample.tx) * 180) / Math.PI;
			const tipRot = angleDeg - 180;
			const opacity = t < 0.04 ? t / 0.04 : 1;

			setFlyPose(sample.x, sample.y, tipRot, opacity);

			pts.push(`${sample.x.toFixed(1)},${sample.y.toFixed(1)}`);
			pathD = pts.length > 1 ? `M ${pts.join(' L ')}` : '';
			pathTrim = 0;

			if (t < 1) {
				raf = requestAnimationFrame(tick);
				return;
			}

			startImpact(endX, endY, nonce);
		};

		raf = requestAnimationFrame(tick);
	});

	$effect(() => {
		if (ready && phase === 'fly' && props.flight) {
			playClip(SHOT_BULLET_FLY_ANIM, true, SHOT_BULLET_FLY_SLOTS);
		}
	});

	$effect(() => {
		if (!player || !ready) return;
		player.paused = isHtmlWebglPaused() || phase === 'idle';
	});

	onDestroy(() => {
		clearRaf();
		clearPathFade();
		clearImpactTimer();
		player?.dispose();
		player = undefined;
	});
</script>

<svg class="path-layer" aria-hidden="true">
	{#if pathD}
		<path class="path-glow" pathLength="1" d={pathD} style={pathStrokeStyle} />
		<path class="path-core" pathLength="1" d={pathD} style={pathStrokeStyle} />
	{/if}
</svg>

<div
	class="shot-wrap"
	class:on={phase !== 'idle'}
	class:fly={phase === 'fly'}
	class:impact={phase === 'impact'}
	style={wrapStyle}
	aria-hidden="true"
>
	<div class="shot-host" bind:this={host}></div>
</div>

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
		stroke: rgba(255, 200, 90, 0.5);
		stroke-width: 8;
		stroke-linecap: round;
		stroke-linejoin: round;
		filter: blur(2.5px);
	}

	.path-core {
		fill: none;
		stroke: rgba(255, 236, 170, 0.95);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.shot-wrap {
		position: fixed;
		z-index: 72;
		left: -9999px;
		top: -9999px;
		width: 480px;
		height: 360px;
		pointer-events: none;
		opacity: 0;
		overflow: visible;
		background: transparent !important;
		will-change: left, top, transform, opacity;
	}

	.shot-wrap.on {
		opacity: 1;
	}

	.shot-host {
		position: absolute;
		inset: 0;
		background: transparent !important;
	}

	.shot-host :global(.spine-player),
	.shot-host :global(.spine-player-content) {
		position: absolute !important;
		inset: 0 !important;
		width: 100% !important;
		height: 100% !important;
		background: transparent !important;
		background-color: transparent !important;
		box-shadow: none !important;
		border: none !important;
		overflow: visible !important;
	}

	.shot-host :global(.spine-player-canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
		background: transparent !important;
		border-radius: 0 !important;
	}

	.shot-host :global(.spine-player-controls),
	.shot-host :global(.spine-player-error),
	.shot-host :global(.spine-player-loading) {
		display: none !important;
	}
</style>
