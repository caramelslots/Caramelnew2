<!--
	Tir seat flip in Pixi — disc only. FS label is HTML (TargetFlipLabelHtml)
	with the same CSS as the static face so it does not jump after flip.
-->
<script lang="ts">
	import { Container, SpineProvider, SpineTrack } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		TARGET_BOARD_FLIP_VISIBLE_SLOTS,
		TARGET_PICK_DISC_LIFT_FRAC,
		getTargetFlipPixiTransform,
	} from '../game/targetBoardAssets';
	import TargetFlipSpineSlots from './TargetFlipSpineSlots.svelte';

	type Props = { zIndex?: number };

	const props: Props = $props();
	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const flip = $derived(context.stateGame.targetShotFlip);

	const seatSize = $derived(flip?.size ?? 80);
	const transform = $derived(getTargetFlipPixiTransform(seatSize));
	const discY = $derived(-(seatSize * TARGET_PICK_DISC_LIFT_FRAC));

	const BACK_A = [0.1, 0.3485] as const;
	const BACK_B = 0.6382;
	const BACK_OPEN = 0.45;

	$effect(() => {
		if (!flip) stateGame.targetShotFlipLabel = null;
	});
</script>

{#if show && flip}
	<Container x={flip.x} y={flip.y + discY} zIndex={props.zIndex ?? 91} sortableChildren>
		<SpineProvider
			key="targetBoardFlip"
			x={transform.spineX}
			y={transform.spineY}
			scale={transform.scale}
			autoUpdate
		>
			<TargetFlipSpineSlots
				slots={TARGET_BOARD_FLIP_VISIBLE_SLOTS}
				onFrame={(sx, sy, visible) => {
					stateGame.targetShotFlipLabel = { visible, scaleX: sx, scaleY: sy };
				}}
				backA={BACK_A}
				backB={BACK_B}
				backOpen={BACK_OPEN}
			/>
			{#key flip.nonce}
				<SpineTrack
					trackIndex={0}
					animationName={flip.anim}
					loop={false}
					timeScale={1}
				/>
			{/key}
		</SpineProvider>
	</Container>
{/if}
