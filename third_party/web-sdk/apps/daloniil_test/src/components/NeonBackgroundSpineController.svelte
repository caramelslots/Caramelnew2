<script lang="ts">
	import { onMount } from 'svelte';
	import { Skin } from '@esotericsoftware/spine-pixi-v8';

	import { getContextSpine } from 'pixi-svelte';
	import { BlendMode } from '@esotericsoftware/spine-pixi-v8';

	import {
		NEON_BONE_TUNING,
		NEON_BOARD_ALIGNMENT,
		NEON_FOREGROUND_BONE_SET,
		NEON_SLOT_TUNING,
		TEXT_WOK_SCALE_BY_LAYOUT,
		TEXT_WOK_OFFSET_BY_LAYOUT,
	} from '../game/neonBackgroundTuning';
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
		/** false = всі слоти приховані, анімація не грає (до кінця лоадера) */
		started: boolean;
	};

	const { skin, layer, boardBounds, overlayX, overlayY, overlayScale, started }: Props = $props();
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

					// During loading (before game entrance) hide everything completely.
			if (!started) {
				for (const slot of spine.skeleton.slots) {
					slot.color.a = 0;
				}
				return;
			}

			hideStaticSlots();
			filterSlotsByLayer();

			// During the "off" state (before delay elapses): force all additive
			// (glow/neon) slots to alpha=0 so they can't blink or show through.
			// isActivePlain is a plain JS variable (not $state) to ensure correct
			// reads inside this Pixi ticker closure.
			if (!isActivePlain) {
				for (const slot of spine.skeleton.slots) {
					if (slot.data.blendMode === BlendMode.Additive) {
						slot.color.a = 0;
					}
				}
				// Belt-and-suspenders: explicitly zero WOK FURY glow slots by name.
				for (const name of ['text_wok2', 'text_fury_ad']) {
					const s = spine.skeleton.findSlot(name);
					if (s) s.color.a = 0;
				}
			}

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

	/** Задержка (мс) между появлением игры и стартом анимации включения вывесок. */
	const NEON_START_DELAY_MS = 2000;

	/**
	 * Plain JS variable (NOT $state) — used inside the Pixi ticker closure set up
	 * in onMount. Using $state here risks stale reads in non-reactive contexts.
	 */
	let isActivePlain = false;

	$effect(() => {
		if (!started) return;
		isActivePlain = false;

		// Play "in" frozen at frame 0 → shows the "off" state:
		// panels visible, neon lights dark (frame 0 of "in" animation).
		spine.skeleton.setSlotsToSetupPose();
		const entry = spine.state.setAnimation(0, 'in', false);
		entry.timeScale = 0;

		entry.listener = {
			complete: () => {
				spine.state.setAnimation(0, 'idle', true);
			},
		};

		// After delay — unfreeze → neon lights turn on.
		const timer = setTimeout(() => {
			isActivePlain = true;
			entry.timeScale = 1;
		}, NEON_START_DELAY_MS);

		return () => {
			clearTimeout(timer);
			isActivePlain = false;
		};
	});
</script>
