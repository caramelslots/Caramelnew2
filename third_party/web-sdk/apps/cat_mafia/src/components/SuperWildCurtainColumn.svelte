<!--
	One Super Wild curtain column — owns wheel/badge state so a neighbor's
	spin cannot clear this column's top ×.

	Board SW is replaced by Spine `open` frame-0 (lying WILD = curtain foot).
	That foot falls to the column bottom while the curtain opens upward.
-->
<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { untrack } from 'svelte';
	import { Container, Graphics, SpineProvider } from 'pixi-svelte';

	import { getSymbolX, getSymbolY } from '../game/utils';
	import { gameSpeedMultFor } from '../game/gameSpeed';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		SUPER_WILD_OPEN0_ALIGN_Y_PX,
		SUPER_WILD_OPEN_MS,
		getSuperWildColumnX,
		getSuperWildOpen0TileCenterLocalY,
		getSuperWildPixiTransform,
	} from '../game/superWildHtmlSpine';
	import SuperWildCurtainController from './SuperWildCurtainController.svelte';
	import SuperWildDrumLabels from './SuperWildDrumLabels.svelte';
	import SuperWildResultBadge from './SuperWildResultBadge.svelte';

	type Props = {
		reel: number;
		mult: number;
		phase: 'expanding' | 'done';
		/** Padded board row of the lying SW — open frame-0 aligns here. */
		originRow: number;
		playKey: string;
		boxW: number;
		boxH: number;
		colY: number;
	};

	const props: Props = $props();

	const transform = $derived(getSuperWildPixiTransform(props.boxW, props.boxH));
	const colX = $derived(getSuperWildColumnX(props.reel, getSymbolX(props.reel)));

	let wheelDeg = $state(0);
	let wheelLanded = $state(false);
	let landedSectorIndex = $state(0);
	let wheelTargetMult = $state(2);
	let badgePinned = $state(false);
	let prevPhase: 'expanding' | 'done' | null = null;

	/**
	 * 0→1 with Spine `open`. Shifts the column so open frame-0's lying WILD
	 * (curtain foot) starts on `originRow`, then settles to the full column
	 * (foot at the bottom) as `open` plays.
	 * Start at 0 when mounting mid-expand so the tile never flashes at the
	 * settled (top-of-column) pose.
	 */
	const alignT = new Tween(props.phase === 'expanding' ? 0 : 1);

	/** Board-local Y of open_0 tile center when spine is in the settled fit. */
	const open0LocalY = $derived(getSuperWildOpen0TileCenterLocalY(props.boxH));
	/** Shift so that tile sits on the lying SW cell at t=0 (not one row below). */
	const alignShift0 = $derived(
		getSymbolY(props.originRow) - props.boxH * 0.5 - open0LocalY + SUPER_WILD_OPEN0_ALIGN_Y_PX,
	);
	const columnY = $derived(props.colY + alignShift0 * (1 - alignT.current));

	/** Full-column clip — reveal motion is Spine `open`, not a wipe. */
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
			const duration =
				SUPER_WILD_OPEN_MS / Math.max(0.01, gameSpeedMultFor(stateGame.gameSpeed));
			untrack(() => {
				alignT.set(0, { duration: 0 });
				void alignT.set(1, { duration, easing: cubicOut });
			});
		} else if (phase === 'done') {
			untrack(() => {
				alignT.set(1, { duration: 0 });
			});
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
				onWheelLanded={(landed, sectorIndex, targetMult) => {
					wheelLanded = landed;
					landedSectorIndex = sectorIndex;
					wheelTargetMult = targetMult;
					if (landed) badgePinned = true;
				}}
			/>
			<SuperWildDrumLabels
				{wheelLanded}
				{landedSectorIndex}
				{wheelTargetMult}
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
