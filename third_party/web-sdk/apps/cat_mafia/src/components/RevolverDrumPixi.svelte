<!--
	Revolver drum in the Pixi stage so it sits under Transition steam (z100)
	and FreeSpinOutro / Win coins (z10). HTML cannot do that — the whole
	canvas would cover it until the cloud ends, which looked like a late pop-in.
-->
<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { BULLET_INSERT_MS } from '../game/constants';
	import { DRUM_SHAKE_MS, DRUM_SPIN_MS } from '../game/drumShoot';
	import {
		CHAMBER_HOLE_AT_DESKTOP,
		CHAMBER_POS_FRAC,
		DRUM_MAX,
		getDrumBoxScreenPos,
		getDrumSize,
		isDrumChamberFilled,
	} from '../game/revolverDrumLayout';

	type Props = {
		forceShow?: boolean;
		filled?: number;
		zIndex?: number;
	};

	const props: Props = $props();
	const context = getContext();

	const filled = $derived(
		Math.max(0, Math.min(DRUM_MAX, props.filled ?? context.stateGame.drumCount)),
	);
	const firingChamber = $derived(context.stateGame.drumFiringChamber);
	const spentChambers = $derived(context.stateGame.drumSpentChambers);
	const shootActive = $derived(context.stateGame.drumShootActive);
	const shakeKey = $derived(context.stateGame.drumShakeKey);
	const rotationDeg = $derived(context.stateGame.drumRotationDeg);

	const show = $derived.by(() => {
		if (!gameEntrance.showContent) return false;
		if (props.forceShow) return true;
		// HTML drum takes over while the shoot overlay sits above the canvas.
		if (shootActive) return false;
		// Wait for theme switch (steam closed) — not the start of the cloud anim.
		return context.stateGame.gameType === 'freegame';
	});

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const showOnLayout = $derived(true);

	const box = $derived(
		getDrumBoxScreenPos({
			mainLayout: context.stateLayoutDerived.mainLayout(),
			layoutType,
			board: context.stateGameDerived.boardLayout(),
			isDesktop: layoutType !== 'portrait',
			layoutDerived: context.stateLayoutDerived,
		}),
	);
	const useSideChrome = $derived(!!box.rim);

	const holePx = $derived(CHAMBER_HOLE_AT_DESKTOP * (box.size / getDrumSize(true)));

	const rotorTween = new Tween(0);
	$effect(() => {
		const next = (rotationDeg * Math.PI) / 180;
		void rotorTween.set(next, { duration: DRUM_SPIN_MS, easing: cubicOut });
	});
	const rotorAngle = $derived(rotorTween.current);

	/** Per-chamber seat fade/scale (0→1) when a round is loaded. */
	const seatTweens = Array.from({ length: DRUM_MAX }, () => new Tween(1));
	let prevFilledMask = 0;
	let seatTrackingReady = false;

	$effect(() => {
		const count = filled;
		let mask = 0;
		for (let i = 0; i < DRUM_MAX; i++) {
			if (isDrumChamberFilled(i, count)) mask |= 1 << i;
		}
		if (!seatTrackingReady) {
			prevFilledMask = mask;
			seatTrackingReady = true;
			return;
		}
		const added = mask & ~prevFilledMask;
		const removed = prevFilledMask & ~mask;
		prevFilledMask = mask;

		for (let i = 0; i < DRUM_MAX; i++) {
			const bit = 1 << i;
			if (added & bit) {
				seatTweens[i].set(0, { duration: 0 });
				void seatTweens[i].set(1, { duration: BULLET_INSERT_MS, easing: cubicOut });
			} else if (removed & bit) {
				seatTweens[i].set(1, { duration: 0 });
			}
		}
	});

	const chambers = $derived(
		Array.from({ length: DRUM_MAX }, (_, i) => {
			const pos = CHAMBER_POS_FRAC[i];
			const orients = context.stateGame.drumBulletOrientDeg;
			const firing = firingChamber === i;
			const spent = !!spentChambers[i];
			const seat = seatTweens[i].current;
			const seatScale = 0.55 + 0.45 * seat;
			return {
				i,
				x: (pos.x - 0.5) * box.size,
				y: (pos.y - 0.5) * box.size,
				orientRad: ((orients[i] ?? 0) * Math.PI) / 180,
				filled: isDrumChamberFilled(i, filled),
				useFiredArt: spent || firing,
				alpha: seat,
				size: holePx * seatScale,
			};
		}),
	);

	let shakeAngle = $state(0);
	let shakeToken = 0;

	$effect(() => {
		const key = shakeKey;
		if (key <= 0) return;

		const token = ++shakeToken;
		const start = performance.now();
		const tick = (now: number) => {
			if (token !== shakeToken) return;
			const t = Math.min(1, (now - start) / DRUM_SHAKE_MS);
			shakeAngle =
				t < 0.35
					? -9 * (t / 0.35)
					: t < 0.7
						? -9 + 18 * ((t - 0.35) / 0.35)
						: 9 * (1 - (t - 0.7) / 0.3);
			if (t < 1) requestAnimationFrame(tick);
			else shakeAngle = 0;
		};
		requestAnimationFrame(tick);
	});
</script>

{#if show && showOnLayout}
	<Container zIndex={props.zIndex ?? 8} x={box.centerX} y={box.centerY} angle={shakeAngle}>
		<Container rotation={rotorAngle}>
			<Sprite key="revolverBarrel" width={box.size} height={box.size} anchor={0.5} />
			{#each chambers as c (c.i)}
				{#if c.filled}
					<Sprite
						key={c.useFiredArt ? 'revolverBullet2' : 'revolverBullet1'}
						x={c.x}
						y={c.y}
						width={c.size}
						height={c.size}
						anchor={0.5}
						rotation={c.orientRad}
						alpha={c.alpha}
					/>
				{/if}
			{/each}
		</Container>
		<Sprite key="revolverOverlay" width={box.size} height={box.size} anchor={0.5} />
		{#if useSideChrome && box.rim}
			{@const rim = box.rim}
			<!-- Gold frame above the cylinder so the barrel sits cleanly in the hole. -->
			<Sprite
				key="revolverBarrelRim"
				x={rim.left + rim.width * 0.5 - box.centerX}
				y={rim.top + rim.height * 0.5 - box.centerY}
				width={rim.width}
				height={rim.height}
				anchor={0.5}
				angle={rim.angle ?? 0}
			/>
		{/if}
	</Container>
{/if}
