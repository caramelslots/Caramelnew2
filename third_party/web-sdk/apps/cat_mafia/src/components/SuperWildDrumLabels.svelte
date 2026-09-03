<!--
	×N labels parented to the Spine `wheel` slot so they spin with the drum cells.
	Labels are shuffled before spin; the wheel lands on the cell that already shows the math mult.
-->
<script lang="ts">
	import { Container, SpineSlot, Text } from 'pixi-svelte';

	import {
		SUPER_WILD_DRUM_LABEL_RADIUS,
		SUPER_WILD_WHEEL_SECTORS,
		superWildDrumLabelFontFrac,
		superWildPointerSectorIndex,
		superWildWheelSectorMidDeg,
	} from '../game/superWildHtmlSpine';

	type Props = {
		wheelLanded: boolean;
		wheelDeg: number;
		landedSectorIndex: number;
		/** Per-spin shuffled labels — one entry per physical sector. */
		spinLabels: readonly number[];
	};

	const props: Props = $props();

	const sectorCount = SUPER_WILD_WHEEL_SECTORS.length;

	/** Under the fixed pointer after stop. */
	const pointerSectorIndex = $derived(
		props.wheelLanded ? superWildPointerSectorIndex(props.wheelDeg) : props.landedSectorIndex,
	);

	/** Wheel attachment ~1452² in skeleton units (slot-object local space). */
	const WHEEL_ATTACH_SIZE = 1452;
	const labelRadius = WHEEL_ATTACH_SIZE * SUPER_WILD_DRUM_LABEL_RADIUS;
	const drumLabelFontSize = (mult: number) =>
		Math.round(WHEEL_ATTACH_SIZE * superWildDrumLabelFontFrac(mult));

	/** Mid-angle of sector i (deg), bone-local; POINTER_DEG renders at the visual arch pointer. */
	const sectorMidDeg = (i: number) => superWildWheelSectorMidDeg(i);
</script>

<SpineSlot slotName="wheel">
	<Container>
		{#each { length: sectorCount } as _, i (i)}
			{@const label = props.spinLabels[i] ?? SUPER_WILD_WHEEL_SECTORS[i]}
			{@const fontSize = drumLabelFontSize(label)}
			{@const strokeWidth = Math.max(8, Math.round(fontSize * 0.12))}
			{@const a = (sectorMidDeg(i) * Math.PI) / 180}
			<!--
				spine-pixi slot objects follow bone space with Y flipped vs raw Pixi.
				POINTER_DEG (180°) renders at the visual top under the arch pointer.
			-->
			{@const lx = Math.sin(a) * labelRadius}
			{@const ly = Math.cos(a) * labelRadius}
			<Container x={lx} y={ly} rotation={-a + Math.PI}>
				<Text
					text={`×${label}`}
					anchor={0.5}
					style={{
						fontFamily: 'proxima-nova, sans-serif',
						fontSize,
						fontWeight: '800',
						fill: props.wheelLanded && i === pointerSectorIndex ? 0xfff4c8 : 0xf3e6c0,
						align: 'center',
						stroke: { color: 0x1a1208, width: strokeWidth },
					}}
				/>
			</Container>
		{/each}
	</Container>
</SpineSlot>
