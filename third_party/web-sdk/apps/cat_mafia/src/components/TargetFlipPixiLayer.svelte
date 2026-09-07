<!--
	Tir seat flips in Pixi — disc only. FS labels are HTML (TargetFlipLabelHtml)
	with the same CSS as the static face so they do not jump after flip.
	Several seats may flip at once (Stage E rapid taps).
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
		type TargetShotFlipFx,
	} from '../game/targetBoardAssets';
	import TargetFlipSpineSlots from './TargetFlipSpineSlots.svelte';

	type Props = { zIndex?: number };

	const props: Props = $props();
	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const flips = $derived(context.stateGame.targetShotFlips);

	const BACK_A = [0.1, 0.3485] as const;
	const BACK_B = 0.6382;
	const BACK_OPEN = 0.45;

	const discY = (flip: TargetShotFlipFx) => -(flip.size * TARGET_PICK_DISC_LIFT_FRAC);

	$effect(() => {
		const live = new Set(flips.map((f) => f.nonce));
		const next = { ...stateGame.targetShotFlipLabels };
		let changed = false;
		for (const key of Object.keys(next)) {
			const nonce = Number(key);
			if (!live.has(nonce)) {
				delete next[nonce];
				changed = true;
			}
		}
		if (changed) stateGame.targetShotFlipLabels = next;
	});
</script>

{#if show}
	{#each flips as flip (flip.nonce)}
		{@const transform = getTargetFlipPixiTransform(flip.size)}
		<Container
			x={flip.x}
			y={flip.y + discY(flip)}
			zIndex={props.zIndex ?? 91}
			sortableChildren
		>
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
						stateGame.targetShotFlipLabels = {
							...stateGame.targetShotFlipLabels,
							[flip.nonce]: { visible, scaleX: sx, scaleY: sy },
						};
					}}
					backA={BACK_A}
					backB={BACK_B}
					backOpen={BACK_OPEN}
				/>
				<SpineTrack
					trackIndex={0}
					animationName={flip.anim}
					loop={false}
					timeScale={1}
				/>
			</SpineProvider>
		</Container>
	{/each}
{/if}
