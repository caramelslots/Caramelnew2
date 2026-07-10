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
		NEON_START_DELAY_MS,
		NEON_STAGGER_GAP_MS,
		NEON_STAGGER_GROUPS,
		TEXT_WOK_SCALE_BY_LAYOUT,
		TEXT_WOK_OFFSET_BY_LAYOUT,
	} from '../game/neonBackgroundTuning';
	import { alignNeonBoardBone, type BoardCanvasBounds } from '../game/neonBoardAlignment';
	import { applyNeonBoneTuning, applyNeonSlotTuning } from '../game/neonBackgroundTuningApply';
	import { getContext } from '../game/context';
	import { getPortraitMobileTier, getPortraitDeviceWidth } from '../game/constants';
	import { gameEntrance } from '../game/gameEntrance.svelte';

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

	/** Apply layout-aware scale/offset to the text_wok bone every frame. */
	const applyTextWokTransform = () => {
		const textWokBone = spine.skeleton.findBone('text_wok');
		if (!textWokBone) return;
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
	};

	onMount(() => {
		applySkin(skin);
		applyTuning();

		const previous = spine.beforeUpdateWorldTransforms;
		spine.beforeUpdateWorldTransforms = (...args) => {
			previous?.(...args);

			hideStaticSlots();

			if (!started) {
				if (gameEntrance.loadingCardsVisible) {
					// 3rd loader screen: show ALL non-hidden slots in off-state
					// (panels visible, glow=0) so WOK FURY appears on loader.
					for (const slot of spine.skeleton.slots) {
						if (slot.data.blendMode === BlendMode.Additive) slot.color.a = 0;
					}
					// Apply mobile-aware text_wok scaling on the loader too
					// (behind-layer shows text_wok during loader without layer filtering).
					applyTextWokTransform();
				} else {
					// Transition phase (user pressed continue, game not yet visible):
					// hide front-layer elements (WOK FURY, mivina) from behind-layer
					// so they are completely invisible during the transition animation.
					filterSlotsByLayer();
					for (const slot of spine.skeleton.slots) {
						if (slot.data.blendMode === BlendMode.Additive) slot.color.a = 0;
					}
				}
				return;
			}

			// Layer filtering only applies during game (after game entrance).
			// When started=true, filterSlotsByLayer immediately hides front-layer
			// elements from the behind-layer instance. This makes WOK FURY/mivina
			// disappear completely during the transition; the front-layer instance
			// (inside the showContent FadeContainer) then fades them back in
			// together with the board, just like any other game content.
			filterSlotsByLayer();

			// Staggered glow activation: zero slots whose group hasn't activated yet.
			// activeGlowSlots and isAnimationStarted are plain JS vars for safe
			// closure reads inside this Pixi ticker callback.
			if (!isAnimationStarted) {
				for (const slot of spine.skeleton.slots) {
					if (slot.data.blendMode === BlendMode.Additive) slot.color.a = 0;
				}
			} else {
				for (const slot of spine.skeleton.slots) {
					if (
						slot.data.blendMode === BlendMode.Additive &&
						!activeGlowSlots.has(slot.data.name)
					) {
						slot.color.a = 0;
					}
				}
			}

			if (layer === 'front') {
				applyTextWokTransform();
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

	/**
	 * Set of additive slot names whose glow is currently allowed to show.
	 * Plain JS (not $state) — mutated by setTimeout callbacks and read inside
	 * the Pixi ticker closure. Starts empty; groups are added progressively.
	 */
	const activeGlowSlots = new Set<string>();

	/**
	 * True once the "in" animation has been unfrozen (NEON_START_DELAY_MS elapsed).
	 * Plain JS variable for safe reads inside the Pixi ticker closure.
	 */
	let isAnimationStarted = false;

	$effect(() => {
		if (!started) return;
		activeGlowSlots.clear();
		isAnimationStarted = false;

		// Freeze "in" at frame 0 → off-state (panels visible, neon dark).
		spine.skeleton.setSlotsToSetupPose();
		const entry = spine.state.setAnimation(0, 'in', false);
		entry.timeScale = 0;
		entry.listener = {
			complete: () => {
				spine.state.setAnimation(0, 'idle', true);
			},
		};

		// After the initial delay: unfreeze the animation.
		const startTimer = setTimeout(() => {
			isAnimationStarted = true;
			entry.timeScale = 1;
		}, NEON_START_DELAY_MS);

		// Staggered group activation: each group joins NEON_STAGGER_GAP_MS apart.
		const groupTimers = NEON_STAGGER_GROUPS.map((group, i) =>
			setTimeout(
				() => {
					for (const name of group) activeGlowSlots.add(name);
				},
				NEON_START_DELAY_MS + i * NEON_STAGGER_GAP_MS,
			),
		);

		return () => {
			clearTimeout(startTimer);
			for (const t of groupTimers) clearTimeout(t);
			activeGlowSlots.clear();
			isAnimationStarted = false;
		};
	});
</script>
