<!--
	One Super Wild curtain column.

	Board SW is replaced by Spine `open` frame-0 (lying WILD = curtain foot).
	That foot falls to the column bottom while the curtain opens upward.

	Super bonus first spin: phase `dropIn` — already-open idle curtain slides
	down from above the board (no Spine `open`), then cat winds the drum and
	the × badge lands (same spin as expand — not pre-labeled).

	Base next spin: phase `dismiss` — idle curtain slides under the board mask
	while reels scroll (solid Spine, not Wild.webp tiles).
-->
<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicOut, linear } from 'svelte/easing';
	import { untrack } from 'svelte';
	import { Container, Graphics, SpineProvider } from 'pixi-svelte';

	import { SPIN_OPTIONS_DEFAULT } from '../game/constants';
	import { getSymbolX } from '../game/utils';
	import { gameSpeedMultFor } from '../game/gameSpeed';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		SUPER_WILD_OPEN0_ALIGN_Y_PX,
		SUPER_WILD_OPEN_MS,
		SUPER_WILD_DISMISS_DIST,
		SUPER_WILD_STICKY_DROP_IN_DIST,
		SUPER_WILD_STICKY_DROP_IN_MS,
		getSuperWildColumnX,
		getSuperWildOpen0TileCenterLocalY,
		getSuperWildOriginCellY,
		getSuperWildPixiTransform,
		superWildWheelEndDeg,
		superWildWheelStartDeg,
		prepareSuperWildDrumSpin,
	} from '../game/superWildHtmlSpine';
	import SuperWildCurtainController from './SuperWildCurtainController.svelte';
	import SuperWildDrumLabels from './SuperWildDrumLabels.svelte';
	import SuperWildResultBadge from './SuperWildResultBadge.svelte';

	type Phase = 'expanding' | 'dropIn' | 'dismiss' | 'done';

	type Props = {
		reel: number;
		mult: number;
		phase: Phase;
		/** Padded board row of the lying SW — open frame-0 aligns here. */
		originRow: number;
		playKey: string;
		boxW: number;
		boxH: number;
		colY: number;
	};

	const props: Props = $props();

	const transform = $derived(getSuperWildPixiTransform(props.boxW, props.boxH));
	const colX = $derived(getSuperWildColumnX(props.reel, getSymbolX(props.reel, 'SW')));

	const initialPrepared = prepareSuperWildDrumSpin(props.mult);
	const initialLanded = props.phase === 'done' || props.phase === 'dismiss';

	let wheelDeg = $state(
		initialLanded ? initialPrepared.endDeg : initialPrepared.startDeg,
	);
	let wheelLanded = $state(initialLanded);
	let landedSectorIndex = $state(initialPrepared.landSectorIndex);
	let wheelTargetMult = $state(props.mult);
	let drumSpinLabels = $state<number[]>(initialPrepared.labels);
	let badgePinned = $state(initialLanded);
	let prevPhase: Phase | null = null;

	/**
	 * 0→1 with Spine `open`. Shifts the column so open frame-0's lying WILD
	 * (curtain foot) starts on `originRow`, then settles to the full column
	 * (foot at the bottom) as `open` plays.
	 * Start at 0 when mounting mid-expand so the tile never flashes at the
	 * settled (top-of-column) pose.
	 */
	const alignT = new Tween(props.phase === 'expanding' ? 0 : 1);
	/** Super first-spin intro: open curtain parks from above into the column. */
	const dropInY = new Tween(props.phase === 'dropIn' ? -SUPER_WILD_STICKY_DROP_IN_DIST : 0);

	/** Board-local Y of open_0 tile center when spine is in the settled fit. */
	const open0LocalY = $derived(getSuperWildOpen0TileCenterLocalY(props.boxH));
	/** Shift so open_0's lying WILD sits on the padded SW cell at t=0. */
	const alignShift0 = $derived(
		getSuperWildOriginCellY(props.originRow) -
			props.boxH * 0.5 -
			open0LocalY +
			SUPER_WILD_OPEN0_ALIGN_Y_PX,
	);
	const columnY = $derived(props.colY + alignShift0 * (1 - alignT.current) + dropInY.current);

	/** Full-column clip — reveal motion is Spine `open`, not a wipe.
	 *  Keep mounted for the whole lifecycle: toggling `{#if}` destroys the
	 *  Graphics while Pixi still references it as a stencil → uid crash. */
	const drawColumnMask = $derived((g: PIXI.Graphics) => {
		const w = props.boxW * 1.08;
		const h = props.boxH;
		g.rect(-w * 0.5, -h * 0.5, w, h);
		g.fill(0xffffff);
	});

	$effect(() => {
		const phase = props.phase;
		if (phase === 'expanding' && prevPhase !== 'expanding') {
			badgePinned = false;
			wheelLanded = false;
			// Curtain open always 1× — turbo must not shorten (matches Spine controller).
			const duration = SUPER_WILD_OPEN_MS;
			untrack(() => {
				dropInY.set(0, { duration: 0 });
				alignT.set(0, { duration: 0 });
				// Working open motion (as before bounce clamps). Snap to 1 on
				// onOpenComplete so we don't leave a soft tail after Spine lands.
				void alignT.set(1, { duration, easing: cubicOut });
			});
		} else if (phase === 'dropIn' && prevPhase !== 'dropIn') {
			// Appear first — no × yet. Controller spins the drum after drop-in.
			badgePinned = false;
			wheelLanded = false;
			wheelTargetMult = props.mult;
			wheelDeg = superWildWheelStartDeg(superWildWheelEndDeg(props.mult));
			const duration = SUPER_WILD_STICKY_DROP_IN_MS;
			untrack(() => {
				alignT.set(1, { duration: 0 });
				dropInY.set(-SUPER_WILD_STICKY_DROP_IN_DIST, { duration: 0 });
				void dropInY.set(0, { duration, easing: cubicOut });
			});
		} else if (phase === 'dismiss' && prevPhase !== 'dismiss') {
			badgePinned = true;
			wheelLanded = true;
			// Match reel strip px/ms (includes turbo) so the curtain keeps pace
			// with the strip — no hole above. Same start stagger as spin.
			const speedMult = Math.max(0.01, gameSpeedMultFor(stateGame.gameSpeed));
			const speed = SPIN_OPTIONS_DEFAULT.reelSpinSpeed * speedMult;
			const duration = SUPER_WILD_DISMISS_DIST / speed;
			const delay =
				(SPIN_OPTIONS_DEFAULT.reelSpinDelay * props.reel) / speedMult;
			untrack(() => {
				alignT.set(1, { duration: 0 });
				dropInY.set(0, { duration: 0 });
				void dropInY.set(SUPER_WILD_DISMISS_DIST, { duration, delay, easing: linear });
			});
		} else if (phase === 'done') {
			untrack(() => {
				alignT.set(1, { duration: 0 });
				dropInY.set(0, { duration: 0 });
			});
			// Don't force × here — Super intro pins via onWheelLanded after spin.
			if (wheelLanded && !badgePinned) {
				wheelTargetMult = props.mult;
				badgePinned = true;
			}
		}
		prevPhase = phase;
	});
</script>

<Container x={colX} y={columnY} sortableChildren>
	<Container>
		<Graphics isMask draw={drawColumnMask} eventMode="none" />
		<SpineProvider
			key="superWildCurtain"
			x={transform.spineX}
			y={transform.spineY}
			scale={transform.scale}
			autoUpdate
		>
			<SuperWildCurtainController
				playKey={props.playKey}
				phase={props.phase}
				mult={props.mult}
				{wheelDeg}
				{wheelLanded}
				onWheelDeg={(deg) => {
					wheelDeg = deg;
				}}
				onWheelLanded={(landed, sectorIndex, targetMult, labels) => {
					wheelLanded = landed;
					wheelTargetMult = targetMult;
					if (!landed) {
						landedSectorIndex = sectorIndex;
						if (labels) drumSpinLabels = labels;
					} else {
						landedSectorIndex = sectorIndex;
						badgePinned = true;
					}
				}}
				onOpenComplete={() => {
					alignT.set(1, { duration: 0 });
				}}
			/>
			<SuperWildDrumLabels
				{wheelLanded}
				wheelDeg={wheelDeg}
				{landedSectorIndex}
				spinLabels={drumSpinLabels}
			/>
		</SpineProvider>
	</Container>
	<SuperWildResultBadge
		visible={badgePinned}
		mult={wheelTargetMult}
		boxH={props.boxH}
		boxW={props.boxW}
	/>
</Container>
