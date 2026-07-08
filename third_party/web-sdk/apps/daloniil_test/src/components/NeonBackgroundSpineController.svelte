<script lang="ts">
	import { onMount } from 'svelte';
	import { Skin } from '@esotericsoftware/spine-pixi-v8';

	import { SpineTrack, getContextSpine } from 'pixi-svelte';

	import { NEON_BONE_TUNING, NEON_BOARD_ALIGNMENT, NEON_FOREGROUND_BONE_SET, NEON_SLOT_TUNING, TEXT_WOK_SCALE_BY_LAYOUT, TEXT_WOK_OFFSET_BY_LAYOUT } from '../game/neonBackgroundTuning';
	import { alignNeonBoardBone, type BoardCanvasBounds } from '../game/neonBoardAlignment';
	import { applyNeonBoneTuning, applyNeonSlotTuning } from '../game/neonBackgroundTuningApply';
	import { getContext } from '../game/context';
	import { getPortraitMobileTier, getPortraitDeviceWidth } from '../game/constants';

	type Props = {
		skin: 'day' | 'night';
		layer: 'behind' | 'front';
		boardBounds?: BoardCanvasBounds;
		overlayX: number;
		overlayY: number;
		overlayScale: number;
	};

	const { skin, layer, boardBounds, overlayX, overlayY, overlayScale }: Props = $props();
	const context = getContext();
	const spine = getContextSpine();

	// All board_glow_* slots use additive blending. On the light parchment board background
	// (R≈220, G≈192, B≈147), additive purple (R≈174, G≈133, B≈249) saturates channels to
	// white. The purple frame effect is preserved by Glow_purple_* child bone ring meshes
	// which are positioned at the board edges on a dark (background) area, not on parchment.
	const HIDDEN_SLOTS = [
		'background_1',
		'background_2',
		'board_day',
		'board_night',
		'board',
		'board_glow',
		'board_glow2',
		'board_glow_midlle2',
		'board_glow_midlle3',
		'board_glow_top2',
		'board_glow_top3',
		'Glow',
		'Glow2',
		'Glow_blue',
		'Glow_blue2',
	] as const;

	const applySkin = (skinName: 'day' | 'night') => {
		const combined = new Skin('neonBackground');
		const defaultSkin = spine.skeleton.data.findSkin('default');
		const themeSkin = spine.skeleton.data.findSkin(skinName);
		if (defaultSkin) combined.addSkin(defaultSkin);
		if (themeSkin) combined.addSkin(themeSkin);
		spine.skeleton.setSkin(combined);
		spine.skeleton.setSlotsToSetupPose();
	};

	const applyTuning = () => {
		applyNeonBoneTuning(spine, NEON_BONE_TUNING);
		applyNeonSlotTuning(spine, NEON_SLOT_TUNING);
		spine.skeleton.setSlotsToSetupPose();
		// Force-zero the alpha of board glow slots in setup pose data
		// so animation's rgba keyframes start from 0 and can't restore them
		for (const slotName of HIDDEN_SLOTS) {
			const slotData = spine.skeleton.data.findSlot(slotName);
			if (slotData) slotData.color.a = 0;
		}
	};

	const hideStaticSlots = () => {
		for (const slotName of HIDDEN_SLOTS) {
			const slot = spine.skeleton.findSlot(slotName);
			if (slot) {
				slot.attachment = null;
				slot.color.a = 0;
			}
		}
	};

	const filterSlotsByLayer = () => {
		for (const slot of spine.skeleton.slots) {
			const slotName = slot.data.name;
			if ((HIDDEN_SLOTS as readonly string[]).includes(slotName)) continue;

			const onForeground = NEON_FOREGROUND_BONE_SET.has(slot.bone.data.name);
			const show = layer === 'front' ? onForeground : !onForeground;
			if (!show) slot.attachment = null;
		}
	};

	onMount(() => {
		applySkin(skin);
		applyTuning();

		const previous = spine.beforeUpdateWorldTransforms;
		spine.beforeUpdateWorldTransforms = (...args) => {
			previous?.(...args);
			hideStaticSlots();
			filterSlotsByLayer();

			if (layer === 'front') {
				const textWokBone = spine.skeleton.findBone('text_wok');
				if (textWokBone) {
					const layoutType = context.stateLayoutDerived.layoutType();
					const layoutKey =
						layoutType === 'portrait'
							? `portrait-${getPortraitMobileTier(context.stateLayoutDerived.canvasSizeType(), getPortraitDeviceWidth(context.stateLayoutDerived.canvasSizes()))}`
							: layoutType;
					const s = TEXT_WOK_SCALE_BY_LAYOUT[layoutKey] ?? 1;
					textWokBone.scaleX = s;
					textWokBone.scaleY = s;
					const offset = TEXT_WOK_OFFSET_BY_LAYOUT[layoutKey];
					if (offset) {
						textWokBone.x = textWokBone.data.x + offset.x;
						textWokBone.y = textWokBone.data.y + offset.y;
					}
				}
			}

			if (layer === 'front' && boardBounds) {
				alignNeonBoardBone(
					spine,
					{ x: overlayX, y: overlayY, scale: overlayScale },
					boardBounds,
					NEON_BOARD_ALIGNMENT,
				);
			}
		};

		return () => {
			spine.beforeUpdateWorldTransforms = previous;
		};
	});

	type Phase = 'in' | 'idle';
	let phase = $state<Phase>('in');

	const onTrackComplete = (entry: { animation?: { name?: string } }) => {
		if (entry.animation?.name === 'in') {
			phase = 'idle';
		}
	};
</script>

<SpineTrack
	trackIndex={0}
	animationName={phase}
	loop={phase === 'idle'}
	listener={{ complete: onTrackComplete }}
/>
