<script lang="ts">
	/**
	 * Cat Mafia mascot — Spine HTML player to the right of the board.
	 * Paw coins fly into the hat (idle3 catch → reverse put-on).
	 */
	import '@esotericsoftware/spine-player/dist/spine-player.css';
	import { SpinePlayer } from '@esotericsoftware/spine-player';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		BOARD_LAYOUT_OFFSETS,
		isPopoutViewport,
	} from '../game/constants';
	import {
		portraitBuyPanelCanvasTop,
		portraitBuyPanelHeightCanvas,
	} from '../game/portraitHudLayout';
	import { devPreview } from '../game/devPreview.svelte';
	import {
		getMascotPortraitScreenBox,
		getMascotScreenBox,
		MASCOT_IDLE_VARIANTS,
		MASCOT_POSE_PLAYBACK,
		MASCOT_SPINE_ANIMATIONS,
		MASCOT_SPINE_VIEWPORT,
		nextMascotIdleVariantDelayMs,
		pickMascotIdleVariant,
		type MascotDevPreview,
		type MascotPose,
		type MascotSpineAnimation,
		resolveMascotSpineUrl,
	} from '../game/mascotHtmlSpine';

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const isPortrait = $derived(layoutType === 'portrait');
	/** Desktop / tablet / Stake popout / phone portrait. */
	const showMascotLayout = $derived(
		layoutType === 'desktop' ||
			layoutType === 'tablet' ||
			isPopout ||
			isPortrait,
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
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;

		const box = isPortrait
			? getMascotPortraitScreenBox({
					canvasWidth: canvasSizes.width,
					boardCenterY: centerY,
					halfH,
					buyPanelTop: portraitBuyPanelCanvasTop(context.stateLayoutDerived),
					buyPanelHeight: portraitBuyPanelHeightCanvas(context.stateLayoutDerived),
				})
			: getMascotScreenBox({
					centerX,
					centerY,
					halfW,
					halfH,
				});

		return `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;`;
	});

	let container = $state<HTMLDivElement | undefined>();
	let ready = $state(false);
	let player: SpinePlayer | undefined;
	let activePose: MascotPose | undefined;
	let activeForceAnim: MascotDevPreview | null | undefined;
	let idleVariantTimer: ReturnType<typeof setTimeout> | undefined;
	/** Delay elapsed — wait for idle to hit its loop start before playing. */
	let idleVariantArmed = false;
	/** blink / ears is currently playing (don't nest another). */
	let idleVariantPlaying = false;
	/** DEV idle3 = in-game hat catch sequence (forward → hold → reverse). */
	let forceIdle3Phase: 'catch' | 'hold' | 'on' | null = null;
	let forceIdle3HoldTimer: ReturnType<typeof setTimeout> | undefined;

	const clearIdleVariantTimer = () => {
		if (idleVariantTimer !== undefined) {
			clearTimeout(idleVariantTimer);
			idleVariantTimer = undefined;
		}
		idleVariantArmed = false;
	};

	const resetIdleVariants = () => {
		clearIdleVariantTimer();
		idleVariantPlaying = false;
	};

	const clearForceIdle3 = () => {
		if (forceIdle3HoldTimer !== undefined) {
			clearTimeout(forceIdle3HoldTimer);
			forceIdle3HoldTimer = undefined;
		}
		forceIdle3Phase = null;
	};

	/** Smile attachment pops abruptly — keep the slot cleared at runtime. */
	const hideSmileSlot = () => {
		const skeleton = player?.skeleton;
		if (!skeleton) return;
		try {
			skeleton.setAttachment('smile', null);
		} catch {
			const slot = skeleton.findSlot('smile');
			slot?.setAttachment(null);
		}
	};

	/**
	 * Play a clip.
	 * - Normal: hard cut via setup pose (clears leftover slots).
	 * - Soft / mix: keep current bones so idle → idle3 intro (hand/hat) animates in.
	 * - Reverse (hat on): TrackEntry.reverse from held end — hand fade-out is in idle3 RGBA.
	 */
	const playClip = (
		animation: MascotSpineAnimation,
		loop: boolean,
		opts?: { reverse?: boolean; holdEnd?: boolean; soft?: boolean; mix?: number },
	) => {
		if (!player || !ready) return;
		const skeleton = player.skeleton;
		const state = player.animationState;
		if (!skeleton || !state) {
			player.setAnimation(animation, loop);
			hideSmileSlot();
			return;
		}

		if (opts?.reverse) {
			// Seamless hat-on: keep current pose, play idle3 backwards from the end.
			const entry = state.setAnimation(0, animation, false);
			if (!entry) return;
			entry.reverse = true;
			entry.timeScale = 1;
			entry.trackTime = 0;
			if (opts.mix != null) entry.mixDuration = opts.mix;
			state.apply(skeleton);
			hideSmileSlot();
			return;
		}

		// Soft = keep bones (idle → hatCatch intro, or hatOn → idle).
		if (!opts?.soft) {
			state.clearTracks();
			skeleton.setToSetupPose();
		}
		const entry = state.setAnimation(0, animation, loop);
		if (!entry) return;
		entry.timeScale = 1;
		entry.reverse = false;
		if (opts?.mix != null) entry.mixDuration = opts.mix;

		state.apply(skeleton);
		hideSmileSlot();
	};

	const holdCurrentClipEnd = () => {
		const entry = player?.animationState?.getCurrent(0);
		if (!entry) return;
		entry.trackTime = entry.animationEnd;
		entry.timeScale = 0;
		entry.reverse = false;
	};

	/**
	 * Idle flavour (blink / ears):
	 * 1) wait a delay while pose is idle
	 * 2) arm — play only when `idle` completes a loop (back at start pose)
	 * 3) after the flavour clip finishes and idle is queued again, repeat
	 */
	const scheduleIdleVariant = () => {
		clearIdleVariantTimer();
		if (activeForceAnim || activePose !== 'idle' || idleVariantPlaying) return;

		idleVariantTimer = setTimeout(() => {
			if (!player || !ready || activeForceAnim || activePose !== 'idle' || idleVariantPlaying) {
				return;
			}
			// Don't interrupt mid-cycle — wait for the next idle loop boundary.
			idleVariantArmed = true;
		}, nextMascotIdleVariantDelayMs());
	};

	const playArmedIdleVariant = () => {
		if (!player || !ready) return;
		if (!idleVariantArmed || idleVariantPlaying) return;
		if (activeForceAnim || activePose !== 'idle') return;

		const current = player.animationState?.getCurrent(0);
		if (current?.animation?.name !== 'idle') return;

		idleVariantArmed = false;
		idleVariantPlaying = true;

		const variant = pickMascotIdleVariant();
		playClip(variant, false, { soft: true });
		player.animationState?.addAnimation(0, 'idle', true, 0);
	};

	const onIdleFlavourComplete = (name: MascotSpineAnimation) => {
		if (activeForceAnim || activePose !== 'idle') return false;

		if (idleVariantPlaying && (MASCOT_IDLE_VARIANTS as readonly string[]).includes(name)) {
			// Flavour finished; idle is next in the queue (start pose).
			idleVariantPlaying = false;
			scheduleIdleVariant();
			return true;
		}

		// Idle looped back to frame 0 — safe moment to start blink / ears.
		if (name === 'idle' && idleVariantArmed && !idleVariantPlaying) {
			playArmedIdleVariant();
			return true;
		}

		return false;
	};

	/** Same beats as pawCoinResolve: hat out → hold → hat on (loops in DEV). */
	const playForceIdle3Sequence = () => {
		forceIdle3Phase = 'catch';
		// Short mix — hand_palm fade-in in idle3 is ~0.45s and must stay visible.
		playClip('idle3', false, { holdEnd: true, soft: true, mix: 0.08 });
	};

	const applyForceAnimation = (animation: MascotDevPreview) => {
		if (!player || !ready) return;
		if (animation === activeForceAnim) return;

		activeForceAnim = animation;
		activePose = undefined;
		resetIdleVariants();
		clearForceIdle3();

		if (animation === 'idle3') {
			playForceIdle3Sequence();
			return;
		}

		// Other DEV clips loop so they stay visible while inspecting.
		playClip(animation, true);
	};

	const applyPose = (next: MascotPose) => {
		if (!player || !ready) return;
		if (activeForceAnim) return;
		if (next === activePose) return;

		const prev = activePose;
		activePose = next;
		resetIdleVariants();

		const playback = MASCOT_POSE_PLAYBACK[next];
		const fromIdleToHat = prev === 'idle' && next === 'hatCatch';
		const fromHatToIdle = prev === 'hatOn' && next === 'idle';
		playClip(playback.animation, playback.loop, {
			reverse: playback.reverse,
			holdEnd: playback.holdEnd,
			// Keep pose so idle3's hand/hat intro (and reverse outro) can play.
			// Short mix on hatCatch — longer mix ate the hand fade-in (hand "popped" in).
			soft: fromIdleToHat || fromHatToIdle,
			mix: fromIdleToHat ? 0.08 : fromHatToIdle ? 0.18 : undefined,
		});

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

				// Clear after every apply so smile can't flash back before render.
				const state = spinePlayer.animationState;
				if (state) {
					const apply = state.apply.bind(state);
					state.apply = (skeleton) => {
						const result = apply(skeleton);
						try {
							skeleton.setAttachment('smile', null);
						} catch {
							skeleton.findSlot('smile')?.setAttachment(null);
						}
						return result;
					};
				}

				spinePlayer.animationState?.addListener({
					complete: (entry) => {
						const name = entry.animation?.name as MascotSpineAnimation | undefined;

						// DEV: idle3 mirrors in-game hatCatch → hold → hatOn.
						if (activeForceAnim === 'idle3') {
							if (name !== 'idle3') return;
							if (forceIdle3Phase === 'catch') {
								holdCurrentClipEnd();
								forceIdle3Phase = 'hold';
								forceIdle3HoldTimer = setTimeout(() => {
									if (activeForceAnim !== 'idle3' || !player) return;
									forceIdle3Phase = 'on';
									playClip('idle3', false, { reverse: true });
								}, 800);
								return;
							}
							if (forceIdle3Phase === 'on') {
								playForceIdle3Sequence();
							}
							return;
						}

						if (activeForceAnim) return;
						if (!name || !activePose) return;

						if (onIdleFlavourComplete(name)) return;

						const playback = MASCOT_POSE_PLAYBACK[activePose];
						if (name !== playback.animation) return;

						if (playback.holdEnd) {
							holdCurrentClipEnd();
							return;
						}

						// Reverse clips complete when track time reaches the visual start.
						if (playback.reverse || playback.returnTo) {
							if (!playback.returnTo) return;
							const back = playback.returnTo;
							activePose = back === 'idle' ? 'idle' : activePose;
							playClip(back, true, {
								soft: playback.reverse,
								mix: playback.reverse ? 0.18 : undefined,
							});
							if (back === 'idle') scheduleIdleVariant();
						}
					},
				});
				ready = true;
				hideSmileSlot();
				if (forceAnim) applyForceAnimation(forceAnim);
				else applyPose(pose);
			},
			error: () => {
				/* Keep empty — game still playable without mascot. */
			},
		});
		player = created;

		return () => {
			resetIdleVariants();
			clearForceIdle3();
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
			clearForceIdle3();
			resetIdleVariants();
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
		/* Above CashStacksBuyBonusPanel (z-index 45) so hat/coins aren't clipped behind it. */
		z-index: 47;
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
