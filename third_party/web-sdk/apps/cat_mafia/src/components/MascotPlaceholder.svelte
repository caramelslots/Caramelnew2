<script lang="ts">
	/**
	 * Cat Mafia mascot — Spine HTML player to the right of the board.
	 * Paw coins fly into the hat (hat catch → reverse put-on).
	 */
	import '@esotericsoftware/spine-player/dist/spine-player.css';
	import { SpinePlayer } from '@esotericsoftware/spine-player';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		isPopoutViewport,
		GAME_ENTRANCE_MS,
		MASCOT_ENTRANCE_DELAY_MS,
		MASCOT_TRANSITION_FADE_MS,
	} from '../game/constants';
	import {
		portraitBuyPanelCanvasTop,
		portraitBuyPanelLayoutHeightCanvas,
	} from '../game/portraitHudLayout';
	import { devPreview } from '../game/devPreview.svelte';
	import { stateDuel } from '../game/stateDuel.svelte';
	import {
		computeDuelScreenLayout,
		getDuelCatMascotBox,
		getDuelDogMascotBox,
	} from '../game/duelLayout';
	import {
		getMascotPortraitScreenBox,
		getMascotScreenBox,
		MASCOT_COIN_FLY_WAIT_MS,
		MASCOT_IDLE_VARIANTS,
		MASCOT_POSE_PLAYBACK,
		MASCOT_PHONE_MAX_DPR,
		MASCOT_SSAA,
		MASCOT_SPINE_ANIMATIONS,
		MASCOT_SPINE_VIEWPORT,
		nextMascotIdleVariantDelayMs,
		pickMascotIdleVariant,
		type MascotDevPreview,
		type MascotPose,
		type MascotSpineAnimation,
		resolveMascotSpineUrl,
	} from '../game/mascotHtmlSpine';

	type Props = {
		/** `duelDog` — dog mascot on the left during Duel (mirrored to face boards). */
		variant?: 'primary' | 'duelDog';
	};

	const props: Props = $props();
	const variant = $derived(props.variant ?? 'primary');
	const isDuelDog = $derived(variant === 'duelDog');
	const isPlayerMascot = $derived(
		stateDuel.active &&
			((isDuelDog && stateDuel.playerSide === 'dog') ||
				(!isDuelDog && stateDuel.playerSide === 'cat')),
	);

	const capPlayerCanvasDpr = (spinePlayer: SpinePlayer, maxDpr: number) => {
		const renderer = spinePlayer.sceneRenderer;
		if (!renderer) return;
		const original = renderer.resize.bind(renderer);
		renderer.resize = (mode) => {
			original(mode);
			const nativeDpr = window.devicePixelRatio || 1;
			if (nativeDpr <= maxDpr) return;
			const canvas = renderer.canvas;
			const w = Math.round(canvas.clientWidth * maxDpr);
			const h = Math.round(canvas.clientHeight * maxDpr);
			if (canvas.width === w && canvas.height === h) return;
			canvas.width = w;
			canvas.height = h;
			renderer.context.gl.viewport(0, 0, w, h);
			renderer.camera.setViewport(w, h);
			renderer.camera.update();
		};
	};

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const isPortrait = $derived(layoutType === 'portrait');
	const isPhonePortrait = $derived(
		isPortrait &&
			(context.stateLayoutDerived.canvasSizeType() === 'mobile' ||
				context.stateLayoutDerived.canvasSizeType() === 'smallMobile'),
	);
	const mascotSsaa = $derived(isPhonePortrait ? 1 : MASCOT_SSAA);
	/** Primary: all layouts except duel-portrait. Dog twin: non-portrait duel. */
	const showMascotLayout = $derived(
		isDuelDog
			? stateDuel.active &&
					!isPortrait &&
					(layoutType === 'desktop' ||
						layoutType === 'tablet' ||
						layoutType === 'landscape' ||
						isPopout)
			: (layoutType === 'desktop' ||
					layoutType === 'tablet' ||
					layoutType === 'landscape' ||
					isPopout ||
					isPortrait) &&
					!(stateDuel.active && isPortrait),
	);
	const forceAnim = $derived(isDuelDog ? null : devPreview.mascotAnimation);
	// Маунт и загрузка Spine — уже на preloadContent (во время лоадера/cloud
	// transition), чтобы к входу доски плеер был готов. До входа держим
	// opacity: 0 — проявление синхронно с FadeContainer доски (showContent).
	const mounted = $derived(
		gameEntrance.preloadContent &&
			(isDuelDog
				? layoutType === 'desktop' ||
					layoutType === 'tablet' ||
					layoutType === 'landscape' ||
					isPopout
				: showMascotLayout || forceAnim !== null),
	);
	const pose = $derived(
		(context.stateGame.mascotPose || 'idle') as MascotPose,
	);
	/** Always 1× — turbo must not speed up mascot clips. */
	const spineTimeScale = 1;

	const style = $derived.by(() => {
		const canvas = canvasSizes;
		if (stateDuel.active && !isPortrait) {
			const ml = context.stateLayoutDerived.mainLayout();
			const board = context.stateGameDerived.baseBoardLayout();
			const duel = computeDuelScreenLayout({
				canvasWidth: canvas.width,
				canvasHeight: canvas.height,
				layoutType,
				mainLayout: ml,
				boardLayout: board,
			});
			const box = isDuelDog ? getDuelDogMascotBox(duel) : getDuelCatMascotBox(duel);
			const mirror = isDuelDog ? 'transform:scaleX(-1);' : '';
			return `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;${mirror}`;
		}

		if (isDuelDog) {
			return 'left:0;top:0;width:0;height:0;opacity:0;';
		}

		const ml = context.stateLayoutDerived.mainLayout();
		const board = context.stateGameDerived.boardLayout();
		/** visualWidth/Height already include board.scale (parchment on portrait). */
		const centerX = ml.x + (board.x - ml.width * 0.5) * ml.scale;
		const centerY = ml.y + (board.y - ml.height * 0.5) * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;

		const box = isPortrait
			? getMascotPortraitScreenBox({
					canvasWidth: canvas.width,
					boardCenterY: centerY,
					halfH,
					buyPanelTop: portraitBuyPanelCanvasTop(context.stateLayoutDerived),
					buyPanelHeight: portraitBuyPanelLayoutHeightCanvas(context.stateLayoutDerived),
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
	/** Latch после первого проявления — пересоздание плеера (ресайз) фейдит быстро. */
	let entranceDone = $state(false);
	let player: SpinePlayer | undefined;
	let activePose: MascotPose | undefined;
	let activeForceAnim: MascotDevPreview | null | undefined;
	let idleVariantTimer: ReturnType<typeof setTimeout> | undefined;
	/** Delay elapsed — wait for idle to hit its loop start before playing. */
	let idleVariantArmed = false;
	/** blink / ears is currently playing (don't nest another). */
	let idleVariantPlaying = false;
	/** DEV hat = in-game hat catch sequence (forward → hold → reverse). */
	let forceIdle3Phase: 'catch' | 'hold' | 'on' | null = null;
	let forceIdle3HoldTimer: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Проявление — в тот же кадр, что и фейд доски (showContent): класс ready
	 * вешается только когда плеер загружен И вход начался. Если загрузка
	 * не успела к входу — дофейживается по готовности тем же длинным фейдом.
	 */
	const revealed = $derived(
		ready && (show || entranceDone) && (!isDuelDog || showMascotLayout),
	);
	/**
	 * FS cloud transition (оба направления): маскот растворяется за
	 * MASCOT_TRANSITION_FADE_MS под набегающим облаком — z-флип pixi-stage
	 * отложен на то же время в Game.svelte, поэтому поп-кадра за непрозрачной
	 * доской нет. Обратно проявляется фейдом: в момент снятия флага opacity 0.
	 */
	const hiding = $derived(context.stateGame.transitionActive);
	const shown = $derived(revealed && !hiding);
	/**
	 * Fade-out (переход) — 300мс ease-in; fade-in — GAME_ENTRANCE_MS cubicOut
	 * (задержка MASCOT_ENTRANCE_DELAY_MS только на самом первом входе).
	 */
	const transitionStyle = $derived(
		hiding
			? `transition:opacity ${MASCOT_TRANSITION_FADE_MS}ms ease-in;`
			: entranceDone
				? `transition:opacity ${GAME_ENTRANCE_MS}ms cubic-bezier(0.215, 0.61, 0.355, 1);`
				: `transition:opacity ${GAME_ENTRANCE_MS}ms cubic-bezier(0.215, 0.61, 0.355, 1) ${MASCOT_ENTRANCE_DELAY_MS}ms;`,
	);

	$effect(() => {
		if (revealed) entranceDone = true;
	});

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
	 * - Soft / mix: keep current bones so idle → hat intro (hand/hat) animates in.
	 * - Reverse (hat on): TrackEntry.reverse from held end — hand fade-out is in hat RGBA.
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

		state.timeScale = spineTimeScale;

		if (opts?.reverse) {
			// Seamless hat-on: keep current pose, play hat backwards from the end.
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
		if (variant === 'idle' || !(MASCOT_IDLE_VARIANTS as readonly string[]).includes(variant)) {
			idleVariantPlaying = false;
			scheduleIdleVariant();
			return;
		}
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
		const current = player?.animationState?.getCurrent(0)?.animation?.name;
		const soft =
			current === 'idle' || current === 'idle_blink' || current === 'idle_ears';
		// Short mix — hand_palm fade-in in hat is ~0.45s and must stay visible.
		// Hard-cut from idle_gyn: gun slots would otherwise wipe the hand before hat keys in.
		playClip('hat', false, { holdEnd: true, soft, mix: soft ? 0.08 : undefined });
	};

	const applyForceAnimation = (animation: MascotDevPreview) => {
		if (!player || !ready) return;
		if (animation === activeForceAnim) return;

		activeForceAnim = animation;
		activePose = undefined;
		resetIdleVariants();
		clearForceIdle3();

		if (animation === 'hat') {
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
		const current = player.animationState?.getCurrent(0)?.animation?.name;
		const fromSafeIdle =
			prev === 'idle' &&
			(current === 'idle' || current === 'idle_blink' || current === 'idle_ears');
		const fromIdleToHat = fromSafeIdle && next === 'hatCatch';
		const fromHatToIdle = prev === 'hatOn' && next === 'idle';
		playClip(playback.animation, playback.loop, {
			reverse: playback.reverse,
			holdEnd: playback.holdEnd,
			// Keep pose so hat's hand/hat intro (and reverse outro) can play.
			// Short mix on hatCatch — longer mix ate the hand fade-in (hand "popped" in).
			// Never soft-mix from idle_gyn (gun hand) into hat.
			soft: fromIdleToHat || fromHatToIdle,
			mix: fromIdleToHat ? 0.08 : fromHatToIdle ? 0.18 : undefined,
		});

		if (playback.loop && next === 'idle') {
			scheduleIdleVariant();
		}
	};

	$effect(() => {
		const el = container;
		if (!el || !mounted) return;
		const phoneDprCap = isPhonePortrait ? MASCOT_PHONE_MAX_DPR : null;

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
			premultipliedAlpha: false,
			// Atlas page is padded to 2048² (POT) so mipmaps can kick in when
			// the mascot is drawn smaller than the source art (phones).
			mipmaps: true,
			preserveDrawingBuffer: false,
			alpha: true,
			defaultMix: 0,
			viewport: {
				...MASCOT_SPINE_VIEWPORT,
				animations: viewportAnims,
			},
			success: (spinePlayer) => {
				if (player !== created) return;
				if (phoneDprCap != null) capPlayerCanvasDpr(spinePlayer, phoneDprCap);
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

						// DEV: hat mirrors in-game hatCatch → hold → hatOn.
						if (activeForceAnim === 'hat') {
							if (name !== 'hat') return;
							if (forceIdle3Phase === 'catch') {
								holdCurrentClipEnd();
								forceIdle3Phase = 'hold';
								forceIdle3HoldTimer = setTimeout(() => {
									if (activeForceAnim !== 'hat' || !player) return;
									forceIdle3Phase = 'on';
									playClip('hat', false, { reverse: true });
								}, MASCOT_COIN_FLY_WAIT_MS);
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
		if (!mounted || !ready) return;

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

	$effect(() => {
		const scale = spineTimeScale;
		const state = player?.animationState;
		if (state) state.timeScale = scale;
	});
</script>

{#if mounted}
	<div
		class="mascot"
		class:ready={shown}
		class:player-side={isPlayerMascot}
		style="{style}{transitionStyle}"
		aria-hidden="true"
	>
		<!--
			SSAA: Spine draws into a larger canvas, then we CSS-scale down so
			eye/ear layer edges don't alias into hard seams on small phones.
		-->
		<div
			class="mascot-spine"
			bind:this={container}
			style="width:{100 * mascotSsaa}%;height:{100 * mascotSsaa}%;transform:scale({1 /
				mascotSsaa})"
		></div>
	</div>
{/if}

<style lang="scss">
	.mascot {
		position: fixed;
		/* Stacking set by .html-mascot-layer (under HUD z44 / Buy Bonus z45). */
		z-index: 0;
		pointer-events: none;
		filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.55));
		opacity: 0;
		/* transition приезжает inline из скрипта: fade-in — GAME_ENTRANCE_MS
		   (как FadeContainer доски, +MASCOT_ENTRANCE_DELAY_MS на первом входе),
		   fade-out на FS-переход — MASCOT_TRANSITION_FADE_MS ease-in. */
		/* Clip layout overflow from the pre-scale SSAA box; hat still paints
		   outside via transform (overflow:visible on the scaled child). */
		overflow: visible;

		&.ready {
			opacity: 1;
		}

		&.player-side.ready {
			filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.55))
				drop-shadow(0 0 18px rgba(255, 200, 90, 0.55));
		}
	}

	.mascot-spine {
		position: absolute;
		left: 0;
		top: 0;
		transform-origin: top left;
		/* hat throws hat/arm outside the body bounds — don't clip */
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
