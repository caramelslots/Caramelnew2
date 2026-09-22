<!--
	Tir seat flips in Pixi — disc + FS label. Labels live here (not HTML) so
	they stay on the raised canvas under steam (`above-html-ui`) with the spine
	until tir dismiss. Several seats may flip at once (Stage E rapid taps).
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
	import TightCanvasText from './TightCanvasText.svelte';

	type Props = { zIndex?: number };

	const props: Props = $props();
	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const flips = $derived(context.stateGame.targetShotFlips);
	const labels = $derived(stateGame.targetShotFlipLabels);
	const layerZ = $derived(props.zIndex ?? 91);

	const BACK_A = [0.1, 0.3485] as const;
	const BACK_B = 0.6382;
	const BACK_OPEN = 0.45;

	const discY = (flip: TargetShotFlipFx) => -(flip.size * TARGET_PICK_DISC_LIFT_FRAC);

	const numFontSize = (size: number) => Math.round(Math.max(14, size * 0.42));
	const fsFontSize = (size: number) => Math.round(Math.max(8, size * 0.16));

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
		{@const lab = labels[flip.nonce]}
		<Container
			x={flip.x}
			y={flip.y + discY(flip)}
			zIndex={layerZ}
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

			{#if lab?.visible}
				<Container zIndex={2} scale={{ x: lab.scaleX, y: lab.scaleY }}>
					<TightCanvasText
						text={flip.displayText ?? String(flip.value)}
						anchor={0.5}
						y={-flip.size * 0.06}
						style={{
							fontFamily: 'proxima-nova, sans-serif',
							fontSize: numFontSize(flip.size),
							fontWeight: '800',
							fill: 0xf0d78c,
							align: 'center',
							stroke: {
								color: 0x000000,
								width: Math.max(2, Math.round(flip.size * 0.04)),
							},
						}}
					/>
					{#if flip.showFsLabel !== false}
						<TightCanvasText
							text="FS"
							anchor={0.5}
							y={flip.size * 0.18}
							style={{
								fontFamily: 'proxima-nova, sans-serif',
								fontSize: fsFontSize(flip.size),
								fontWeight: '800',
								letterSpacing: 2,
								fill: 0xf0d78c,
								align: 'center',
								stroke: {
									color: 0x000000,
									width: Math.max(1, Math.round(flip.size * 0.02)),
								},
							}}
						/>
					{/if}
				</Container>
			{/if}
		</Container>
	{/each}
{/if}
