<!--
	Tir shot FX in Pixi — bullet spine only. Trail is HTML (TargetShotTrailHtml)
	so it stacks above seats without lifting the opaque Pixi stage over the HUD.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Container, SpineProvider, SpineTrack } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		SHOT_BULLET_FLY_ANIM,
		SHOT_BULLET_FLY_SLOTS,
		SHOT_BULLET_IMPACT_ANIM,
		SHOT_BULLET_IMPACT_SLOTS,
		TARGET_SHOT_FLY_MS,
		TARGET_SHOT_IMPACT_MS,
		getShotBulletPixiTransform,
		sampleShotPath,
		type TargetShotFlight,
	} from '../game/shotBulletAssets';
	import TargetShotBulletSpineSlots from './TargetShotBulletSpineSlots.svelte';

	type Props = { zIndex?: number };

	const props: Props = $props();
	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const flight = $derived(context.stateGame.targetShotFlight);

	const transform = getShotBulletPixiTransform();

	let phase = $state<'idle' | 'fly' | 'impact'>('idle');
	let live = $state<TargetShotFlight | null>(null);
	let bulletX = $state(0);
	let bulletY = $state(0);
	let bulletRot = $state(0);
	let bulletAlpha = $state(0);
	let activeNonce = 0;
	let raf = 0;
	let impactTimer: ReturnType<typeof setTimeout> | undefined;
	let useImpactAnchor = $state(false);

	const clearRaf = () => {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
	};
	const clearImpactTimer = () => {
		if (impactTimer !== undefined) clearTimeout(impactTimer);
		impactTimer = undefined;
	};

	const slots = $derived(phase === 'impact' ? SHOT_BULLET_IMPACT_SLOTS : SHOT_BULLET_FLY_SLOTS);
	const animName = $derived(phase === 'impact' ? SHOT_BULLET_IMPACT_ANIM : SHOT_BULLET_FLY_ANIM);
	const loop = $derived(phase === 'fly');
	const spineX = $derived(useImpactAnchor ? transform.impactSpineX : transform.spineX);
	const spineY = $derived(useImpactAnchor ? transform.impactSpineY : transform.spineY);

	const endImpact = (nonce: number) => {
		if (nonce !== activeNonce) return;
		phase = 'idle';
		bulletAlpha = 0;
		useImpactAnchor = false;
		live = null;
	};

	const startImpact = (x: number, y: number, nonce: number) => {
		phase = 'impact';
		bulletX = x;
		bulletY = y;
		bulletRot = 0;
		bulletAlpha = 1;
		useImpactAnchor = true;
		clearImpactTimer();
		impactTimer = setTimeout(() => endImpact(nonce), TARGET_SHOT_IMPACT_MS);
	};

	$effect(() => {
		const f = flight;
		if (!f || f.nonce < 1) return;
		if (f.nonce === activeNonce && phase !== 'idle') return;

		clearRaf();
		clearImpactTimer();
		activeNonce = f.nonce;
		live = f;
		const pathPts =
			f.points.length >= 2
				? f.points
				: [
						{ x: f.startX, y: f.startY },
						{ x: f.endX, y: f.endY },
					];
		const flyMs = Math.max(280, f.flyMs ?? TARGET_SHOT_FLY_MS);
		const nonce = f.nonce;
		const endX = f.endX;
		const endY = f.endY;

		phase = 'fly';
		useImpactAnchor = false;
		const origin = performance.now();

		const tick = (now: number) => {
			if (nonce !== activeNonce) return;
			const t = Math.min(1, (now - origin) / flyMs);
			const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
			const sample = sampleShotPath(pathPts, ease);
			const angleDeg = (Math.atan2(sample.ty, sample.tx) * 180) / Math.PI;
			bulletX = sample.x;
			bulletY = sample.y;
			bulletRot = ((angleDeg - 180) * Math.PI) / 180;
			bulletAlpha = t < 0.04 ? t / 0.04 : 1;
			if (t < 1) {
				raf = requestAnimationFrame(tick);
				return;
			}
			startImpact(endX, endY, nonce);
		};
		raf = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		clearRaf();
		clearImpactTimer();
	});
</script>

{#if show && live && phase !== 'idle'}
	<Container zIndex={props.zIndex ?? 90} sortableChildren>
		<Container x={bulletX} y={bulletY} rotation={bulletRot} alpha={bulletAlpha}>
			<SpineProvider
				key="shotBullet"
				x={spineX}
				y={spineY}
				scale={transform.scale}
				autoUpdate={phase !== 'idle'}
			>
				<TargetShotBulletSpineSlots {slots} />
				<SpineTrack trackIndex={0} animationName={animName} {loop} timeScale={1} />
			</SpineProvider>
		</Container>
	</Container>
{/if}
