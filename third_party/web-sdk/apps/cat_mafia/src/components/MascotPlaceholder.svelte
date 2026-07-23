<script lang="ts">
	/**
	 * Cat Mafia mascot — Spine HTML player to the right of the board
	 * (bag target for paw coins sits above this box).
	 */
	import '@esotericsoftware/spine-player/dist/spine-player.css';
	import { SpinePlayer } from '@esotericsoftware/spine-player';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		BOARD_LAYOUT_OFFSETS,
		isPopoutViewport,
	} from '../game/constants';
	import { devPreview } from '../game/devPreview.svelte';
	import {
		getMascotScreenBox,
		MASCOT_IDLE_VARIANTS,
		MASCOT_POSE_PLAYBACK,
		MASCOT_SPINE_ANIMATIONS,
		MASCOT_SPINE_VIEWPORT,
		type MascotPose,
		type MascotSpineAnimation,
		resolveMascotSpineUrl,
	} from '../game/mascotHtmlSpine';

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	/** Desktop / tablet / Stake popout — not phone portrait. */
	const showMascotLayout = $derived(
		layoutType === 'desktop' || layoutType === 'tablet' || isPopout,
	);
	const forceAnim = $derived(devPreview.mascotAnimation);
	const visible = $derived(show && (showMascotLayout || forceAnim !== null));
	const pose = $derived(
		(context.stateGame.bulletFly ? 'load' : context.stateGame.mascotPose || 'idle') as MascotPose,
	);

	const style = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const board = context.stateGameDerived.boardLayout();
		const box = getMascotScreenBox({
			centerX: ml.x + off.x * ml.scale,
			centerY: ml.y + off.y * ml.scale,
			halfW: (board.visualWidth / 2) * ml.scale,
			halfH: (board.visualHeight / 2) * ml.scale,
		});

		return `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;`;
	});

	let container = $state<HTMLDivElement | undefined>();
	let ready = $state(false);
	let player: SpinePlayer | undefined;
	let activePose: MascotPose | undefined;
	let activeForceAnim: MascotSpineAnimation | null | undefined;
	let idleVariantTimer: ReturnType<typeof setTimeout> | undefined;

	const clearIdleVariantTimer = () => {
		if (idleVariantTimer !== undefined) {
			clearTimeout(idleVariantTimer);
			idleVariantTimer = undefined;
		}
	};

	/** Hard cut — clears leftover attachments/slots from the previous clip. */
	const playClip = (animation: MascotSpineAnimation, loop: boolean) => {
		if (!player || !ready) return;
		const skeleton = player.skeleton;
		const state = player.animationState;
		if (!skeleton || !state) {
			player.setAnimation(animation, loop);
			return;
		}

		state.clearTracks();
		skeleton.setToSetupPose();
		state.setAnimation(0, animation, loop);
	};

	const scheduleIdleVariant = () => {
		clearIdleVariantTimer();
		if (activeForceAnim || activePose !== 'idle') return;

		idleVariantTimer = setTimeout(
			() => {
				if (!player || !ready || activeForceAnim || activePose !== 'idle') return;
				const variant =
					MASCOT_IDLE_VARIANTS[Math.floor(Math.random() * MASCOT_IDLE_VARIANTS.length)];
				playClip(variant, false);
				player.animationState?.addAnimation(0, 'idle', true, 0);
				scheduleIdleVariant();
			},
			4500 + Math.random() * 3500,
		);
	};

	const applyForceAnimation = (animation: MascotSpineAnimation) => {
		if (!player || !ready) return;
		if (animation === activeForceAnim) return;

		activeForceAnim = animation;
		activePose = undefined;
		clearIdleVariantTimer();
		// Loop in DEV so clips stay visible while inspecting.
		playClip(animation, true);
	};

	const applyPose = (next: MascotPose) => {
		if (!player || !ready) return;
		if (activeForceAnim) return;
		if (next === activePose) return;

		activePose = next;
		clearIdleVariantTimer();

		const playback = MASCOT_POSE_PLAYBACK[next];
		playClip(playback.animation, playback.loop);

		if (playback.loop && next === 'idle') {
			scheduleIdleVariant();
		}
	};

	$effect(() => {
		const el = container;
		if (!el || !visible) return;

		// Prevent stacked SpinePlayer DOM if effect re-enters before cleanup.
		player?.dispose();
		player = undefined;
		ready = false;
		el.replaceChildren();

		const viewportAnims = Object.fromEntries(
			MASCOT_SPINE_ANIMATIONS.map((name) => [name, MASCOT_SPINE_VIEWPORT]),
		);

		const created = new SpinePlayer(el, {
			jsonUrl: resolveMascotSpineUrl('mascot_cat.json'),
			atlasUrl: resolveMascotSpineUrl('mascot_cat.atlas'),
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			alpha: true,
			defaultMix: 0,
			viewport: {
				...MASCOT_SPINE_VIEWPORT,
				animations: viewportAnims,
			},
			success: (spinePlayer) => {
				if (player !== created) return;
				spinePlayer.skeleton!.scaleY = -1;
				spinePlayer.animationState?.addListener({

					complete: (entry) => {
						if (activeForceAnim) return;
						const name = entry.animation?.name as MascotSpineAnimation | undefined;
						if (!name || !activePose) return;

						const playback = MASCOT_POSE_PLAYBACK[activePose];
						if (playback.loop || !playback.returnTo) return;
						if (name !== playback.animation) return;

						playClip(playback.returnTo, true);
						if (playback.returnTo === 'idle') scheduleIdleVariant();
					},
				});
				ready = true;
				if (forceAnim) applyForceAnimation(forceAnim);
				else applyPose(pose);
			},
			error: () => {
				/* Keep empty — game still playable without mascot. */
			},
		});
		player = created;

		return () => {
			clearIdleVariantTimer();
			created.dispose();
			if (player === created) player = undefined;
			ready = false;
			activePose = undefined;
			activeForceAnim = undefined;
			el.replaceChildren();
		};
	});

	$effect(() => {
		if (!visible || !ready) return;

		const forced = forceAnim;
		if (forced) {
			applyForceAnimation(forced);
			return;
		}

		if (activeForceAnim) {
			activeForceAnim = null;
			activePose = undefined;
		}
		applyPose(pose);
	});
</script>

{#if visible}
	<div class="mascot" class:ready style={style} aria-hidden="true">
		<div class="mascot-spine" bind:this={container}></div>
	</div>
{/if}

<style lang="scss">
	.mascot {
		position: fixed;
		z-index: 42;
		pointer-events: none;
		filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.55));
		opacity: 0;
		transition: opacity 0.25s ease;

		&.ready {
			opacity: 1;
		}
	}

	.mascot-spine {
		position: relative;
		width: 100%;
		height: 100%;
		/* idle3 throws hat/arm outside the body bounds — don't clip */
		overflow: visible;
	}

	.mascot-spine :global(.spine-player) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: none !important;
	}

	.mascot-spine :global(.spine-player-canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
		background: transparent !important;
		border-radius: 0 !important;
	}

	.mascot-spine :global(.spine-player-controls),
	.mascot-spine :global(.spine-player-error),
	.mascot-spine :global(.spine-player-loading) {
		display: none !important;
	}
</style>
