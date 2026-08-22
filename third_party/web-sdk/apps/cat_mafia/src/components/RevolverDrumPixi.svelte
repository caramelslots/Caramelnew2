<!--
	Revolver drum in the Pixi stage so it sits under Transition steam (z100)
	and FreeSpinOutro / Win coins (z10). HTML cannot do that — the whole
	canvas would cover it until the cloud ends, which looked like a late pop-in.
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { DRUM_SHAKE_MS } from '../game/drumShoot';
	import {
		CHAMBER_HOLE_AT_DESKTOP,
		CHAMBER_POS_FRAC,
		DRUM_MAX,
		getDrumBoxScreenPos,
		getDrumLoadChamberIndex,
		getDrumRotationDeg,
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
	const rotationDeg = $derived(getDrumRotationDeg(filled));
	const loadChamber = $derived(getDrumLoadChamberIndex(filled));

	const show = $derived.by(() => {
		if (!gameEntrance.showContent) return false;
		if (props.forceShow) return true;
		// HTML drum takes over while the shoot overlay sits above the canvas.
		if (shootActive) return false;
		// Wait for theme switch (steam closed) — not the start of the cloud anim.
		return context.stateGame.gameType === 'freegame';
	});

	const isDesktop = $derived(context.stateLayoutDerived.layoutType() === 'desktop');

	const box = $derived(
		getDrumBoxScreenPos({
			mainLayout: context.stateLayoutDerived.mainLayout(),
			layoutType: context.stateLayoutDerived.layoutType(),
			board: context.stateGameDerived.boardLayout(),
			isDesktop,
		}),
	);

	const drumSize = $derived(getDrumSize(isDesktop));
	const holePx = $derived(CHAMBER_HOLE_AT_DESKTOP * (drumSize / getDrumSize(true)));
	const rotorAngle = $derived((rotationDeg * Math.PI) / 180);

	const chambers = $derived(
		Array.from({ length: DRUM_MAX }, (_, i) => {
			const pos = CHAMBER_POS_FRAC[i];
			const orients = context.stateGame.drumBulletOrientDeg;
			const firing = firingChamber === i;
			const spent = !!spentChambers[i];
			return {
				i,
				x: (pos.x - 0.5) * box.size,
				y: (pos.y - 0.5) * box.size,
				orientRad: ((orients[i] ?? 0) * Math.PI) / 180,
				filled: isDrumChamberFilled(i, filled),
				useFiredArt: spent || firing,
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

{#if show && isDesktop}
	<Container zIndex={props.zIndex ?? 8} x={box.centerX} y={box.centerY} angle={shakeAngle}>
		<Container rotation={rotorAngle}>
			<Sprite key="revolverBarrel" width={box.size} height={box.size} anchor={0.5} />
			{#each chambers as c (c.i)}
				{#if c.filled}
					<Sprite
						key={c.useFiredArt ? 'revolverBullet2' : 'revolverBullet1'}
						x={c.x}
						y={c.y}
						width={holePx}
						height={holePx}
						anchor={0.5}
						rotation={c.orientRad}
					/>
				{/if}
			{/each}
		</Container>
		<Sprite key="revolverOverlay" width={box.size} height={box.size} anchor={0.5} />
	</Container>
{/if}
