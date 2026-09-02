<!--
	×N labels parented to the Spine `wheel` slot so they spin with the drum cells.
-->
<script lang="ts">
	import { Container, SpineSlot, Text } from 'pixi-svelte';

	import {
		SUPER_WILD_DRUM_LABEL_FONT_FRAC,
		SUPER_WILD_DRUM_LABEL_RADIUS,
		SUPER_WILD_DRUM_SECTOR_OFFSET_DEG,
		SUPER_WILD_WHEEL_SECTORS,
		SUPER_WILD_WHEEL_SECTOR_DEG,
	} from '../game/superWildHtmlSpine';

	type Props = {
		wheelLanded: boolean;
		landedSectorIndex: number;
		wheelTargetMult: number;
	};

	const props: Props = $props();

	/** Wheel attachment ~1452² in skeleton units (slot-object local space). */
	const WHEEL_ATTACH_SIZE = 1452;
	const labelRadius = WHEEL_ATTACH_SIZE * SUPER_WILD_DRUM_LABEL_RADIUS;
	const labelFontSize = Math.round(WHEEL_ATTACH_SIZE * SUPER_WILD_DRUM_LABEL_FONT_FRAC);
	const strokeWidth = Math.max(8, Math.round(labelFontSize * 0.12));

	/** Mid-angle of sector i (deg), bone-local; 0° = under the pointer. */
	const sectorMidDeg = (i: number) =>
		i * SUPER_WILD_WHEEL_SECTOR_DEG + SUPER_WILD_DRUM_SECTOR_OFFSET_DEG;
</script>

<SpineSlot slotName="wheel">
	<Container>
		{#each SUPER_WILD_WHEEL_SECTORS as sector, i (i)}
			{@const label = i === props.landedSectorIndex ? props.wheelTargetMult : sector}
			{@const a = (sectorMidDeg(i) * Math.PI) / 180}
			<!--
				spine-pixi slot objects follow bone space with Y flipped vs raw Pixi.
				a=0 → top (under pointer): (+sin, +cos) lands on the upper cell.
			-->
			{@const lx = Math.sin(a) * labelRadius}
			{@const ly = Math.cos(a) * labelRadius}
			<Container x={lx} y={ly} rotation={-a + Math.PI}>
				<Text
					text={`×${label}`}
					anchor={0.5}
					style={{
						fontFamily: 'proxima-nova, sans-serif',
						fontSize: labelFontSize,
						fontWeight: '800',
						fill: props.wheelLanded && i === props.landedSectorIndex ? 0xfff4c8 : 0xf3e6c0,
						align: 'center',
						stroke: { color: 0x1a1208, width: strokeWidth },
					}}
				/>
			</Container>
		{/each}
	</Container>
</SpineSlot>
