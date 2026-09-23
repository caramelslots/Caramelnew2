<!--
	Tir seat flips in Pixi — disc + FS label. Labels live here (not HTML) so
	they stay on the raised canvas under steam (`above-html-ui`) with the spine
	until tir dismiss. Several seats may flip at once (Stage E rapid taps).

	After the clip ends we drop the spine and hold the same TightCanvasText on a
	static wood back — no HTML handoff, so font size / stroke never jump.

	Clipped to the same gold-frame hole as TargetPickPixiLayer so slide-out
	does not paint over the crest / frame chrome.
-->
<script lang="ts">
	import { BaseSprite, Container, Graphics, SpineProvider, SpineTrack } from 'pixi-svelte';
	import * as PIXI from 'pixi.js';

	import { getContext } from '../game/context';
	import { BOARD_LAYOUT_OFFSETS } from '../game/constants';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		TARGET_BOARD_FLIP_VISIBLE_SLOTS,
		TARGET_BOARD_SPRITES,
		TARGET_PICK_DISC_LIFT_FRAC,
		getTargetFlipPixiTransform,
		isTargetBoardSpriteLive,
		targetFaceFsFontPx,
		targetFaceFsStrokePx,
		targetFaceNumFontPx,
		targetFaceNumStrokePx,
		targetPickInnerClip,
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
	const needsBack = $derived(flips.length > 0);
	const hasFlips = $derived(flips.length > 0);

	/**
	 * Flip x/y are captured in screen px while the cabinet is fully in (slide=1).
	 * Match HTML `.slide` / Pixi cabinet: translate with (slide - 1) × hole height
	 * so settled faces ride out with the board instead of floating over the reels.
	 */
	const holeScreen = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const layoutType = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const board = context.stateGameDerived.boardLayout();
		const hole = targetPickInnerClip();
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const cell = board.scale * ml.scale;
		const originX = centerX - board.width * 0.5 * cell;
		const originY = centerY - board.height * 0.5 * cell;
		return {
			x: originX + hole.x * cell,
			y: originY + hole.y * cell,
			width: hole.width * cell,
			height: hole.height * cell,
		};
	});

	const slideOffsetY = $derived((stateGame.targetPickSlide - 1) * holeScreen.height);

	/** Same inner-window clip as the cabinet — hide discs over the gold crest. */
	const drawHoleMask = $derived((g: PIXI.Graphics) => {
		const h = holeScreen;
		g.clear();
		g.rect(h.x, h.y, h.width, h.height);
		g.fill(0xffffff);
	});

	/** Face mostly open — skip the edge-on squash. */
	const BACK_OPEN = 0.45;
	/** Tir faces: few labels — bake sharp, not the 64px SuperWild memory cap. */
	const LABEL_MAX_BAKE = 128;
	const LABEL_BAKE_RES = 2;

	let backTex = $state<PIXI.Texture>(PIXI.Texture.EMPTY);

	const discY = (flip: TargetShotFlipFx) => -(flip.size * TARGET_PICK_DISC_LIFT_FRAC);

	const resolveTex = (loaded: unknown) =>
		loaded instanceof PIXI.Texture ? loaded : PIXI.Texture.from(loaded as never);

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

	$effect(() => {
		if (!needsBack) return;
		if (backTex !== PIXI.Texture.EMPTY) return;
		const url = TARGET_BOARD_SPRITES.back;
		let cancelled = false;
		void (async () => {
			try {
				if (isTargetBoardSpriteLive(url)) {
					backTex = resolveTex(PIXI.Assets.get(url));
					return;
				}
				const loaded = await PIXI.Assets.load(url);
				if (!cancelled) backTex = resolveTex(loaded);
			} catch (error) {
				console.error('[tir] flip back sprite failed', error);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	const renderLabel = (flip: TargetShotFlipFx, scaleX: number, scaleY: number) => ({
		scaleX,
		scaleY,
		numSize: targetFaceNumFontPx(flip.size),
		fsSize: targetFaceFsFontPx(flip.size),
		numStroke: targetFaceNumStrokePx(flip.size),
		fsStroke: targetFaceFsStrokePx(flip.size),
	});
</script>

{#if show && hasFlips}
	<Container zIndex={layerZ} sortableChildren>
		<Graphics isMask draw={drawHoleMask} />
		{#each flips as flip (flip.nonce)}
			{@const transform = getTargetFlipPixiTransform(flip.size)}
			{@const lab = labels[flip.nonce]}
			{@const settled = flip.settled === true}
			{@const showLabel = settled || lab?.visible}
			{@const labelScale = settled
				? renderLabel(flip, 1, 1)
				: lab
					? renderLabel(flip, lab.scaleX, lab.scaleY)
					: null}
			<Container
				x={flip.x}
				y={flip.y + discY(flip) + slideOffsetY}
				sortableChildren
			>
				{#if settled}
					{#if backTex !== PIXI.Texture.EMPTY}
						<BaseSprite
							texture={backTex}
							anchor={0.5}
							width={flip.size}
							height={flip.size}
							zIndex={1}
						/>
					{/if}
				{:else}
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
							backOpen={BACK_OPEN}
						/>
						<SpineTrack
							trackIndex={0}
							animationName={flip.anim}
							loop={false}
							timeScale={1}
						/>
					</SpineProvider>
				{/if}

				{#if showLabel && labelScale}
					<Container zIndex={2} scale={{ x: labelScale.scaleX, y: labelScale.scaleY }}>
						<TightCanvasText
							text={flip.displayText ?? String(flip.value)}
							anchor={0.5}
							y={-flip.size * 0.06}
							maxBakePx={LABEL_MAX_BAKE}
							bakeResolution={LABEL_BAKE_RES}
							style={{
								fontFamily: 'proxima-nova, sans-serif',
								fontSize: labelScale.numSize,
								fontWeight: '800',
								fill: 0xf0d78c,
								align: 'center',
								stroke: {
									color: 0x000000,
									width: labelScale.numStroke,
								},
							}}
						/>
						{#if flip.showFsLabel !== false}
							<TightCanvasText
								text="FS"
								anchor={0.5}
								y={flip.size * 0.18}
								maxBakePx={LABEL_MAX_BAKE}
								bakeResolution={LABEL_BAKE_RES}
								style={{
									fontFamily: 'proxima-nova, sans-serif',
									fontSize: labelScale.fsSize,
									fontWeight: '800',
									letterSpacing: 2,
									fill: 0xf0d78c,
									align: 'center',
									stroke: {
										color: 0x000000,
										width: labelScale.fsStroke,
									},
								}}
							/>
						{/if}
					</Container>
				{/if}
			</Container>
		{/each}
	</Container>
{/if}
