<script lang="ts" module>
	export type EmitterEventTargetShootRound = {
		type: 'targetShootRound';
		shots: { targetIndex: number; reward: 0 | 1 | 2 | 3 }[];
		extraFs: number;
	};
</script>

<script lang="ts">
	/**
	 * Stage E: after main FS, 9-target board slides in → player taps (drum shots) →
	 * FreeSpinIntro while the board slides up. Math fixes the reward queue;
	 * click only picks which face shows each reward.
	 */
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { BOARD_LAYOUT_OFFSETS } from '../game/constants';
	import {
		alignDrumForNextShot,
		playDrumChamberShot,
		advanceDrumAfterShot,
		syncDrumLoadRotation,
	} from '../game/drumShoot';
	import {
		MASCOT_GUN_SHOT_AIM_MS,
		MASCOT_GUN_SHOT_END_MS,
		MASCOT_GUN_SHOT_MS,
		MASCOT_GUN_STAT_IDLE_MS,
		getMascotGunMuzzlePoint,
		getMascotPortraitScreenBox,
		getMascotScreenBox,
	} from '../game/mascotHtmlSpine';
	import {
		portraitBuyPanelCanvasTop,
		portraitBuyPanelHeightCanvas,
	} from '../game/portraitHudLayout';
	import {
		TARGET_SHOT_EXPLOSION_START_MS,
		TARGET_SHOT_IMPACT_MS,
		TARGET_SHOT_MUZZLE_DELAY_MS,
		buildTargetShotCurve,
		startShotBulletPreload,
		type TargetShotFlight,
	} from '../game/shotBulletAssets';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		TARGET_BOARD_PICK_FLIP_MS_BY_ANIM,
		TARGET_PICK_SLIDE_MS,
		TARGET_SHOOT_SEAT_COUNT,
		pickTargetFlipAnim,
		startTargetBoardPreload,
		targetPickInnerClip,
		type TargetBoardPickFlipAnim,
	} from '../game/targetBoardAssets';
	import TargetShootBoard from './TargetShootBoard.svelte';

	const context = getContext();

	let show = $state(false);
	let phase = $state<'prep' | 'pick' | 'done'>('prep');
	let rewardQueue = $state<(0 | 1 | 2 | 3)[]>([]);
	let extraFs = $state(0);
	let faceValues = $state<number[]>(Array.from({ length: TARGET_SHOOT_SEAT_COUNT }, () => 0));
	let flipped = $state<boolean[]>(Array.from({ length: TARGET_SHOOT_SEAT_COUNT }, () => false));
	let spineSeat = $state<number | null>(null);
	let spineNonce = $state(0);
	let flipAnim = $state<TargetBoardPickFlipAnim>('v4');
	let pendingSeats = $state<number[]>([]);
	let reservedSeats = $state<Set<number>>(new Set());
	let draining = $state(false);
	let oncomplete = $state(() => {});
	let onSpineResolve = $state<(() => void) | null>(null);
	let shootBoard = $state<TargetShootBoard | undefined>();

	const seatsLocked = $derived(phase !== 'pick');

	$effect(() => {
		if (!show) return;
		stateGame.targetPickFlipped = flipped;
		stateGame.targetPickSpineSeat = spineSeat;
	});

	const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

	const tweenSlide = (to: number, ms = TARGET_PICK_SLIDE_MS) =>
		new Promise<void>((resolve) => {
			const from = stateGame.targetPickSlide;
			const origin = performance.now();
			const tick = (now: number) => {
				const t = Math.min(1, (now - origin) / ms);
				const ease = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
				stateGame.targetPickSlide = from + (to - from) * ease;
				if (t < 1) {
					requestAnimationFrame(tick);
					return;
				}
				stateGame.targetPickSlide = to;
				resolve();
			};
			requestAnimationFrame(tick);
		});

	const gridStyle = $derived.by(() => {
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
		return [
			`left:${originX + hole.x * cell}px`,
			`top:${originY + hole.y * cell}px`,
			`width:${hole.width * cell}px`,
			`height:${hole.height * cell}px`,
			`--slide:${stateGame.targetPickSlide}`,
		].join(';');
	});

	const resolveMuzzlePoint = () => {
		const live = stateGame.mascotGunMuzzleScreen;
		if (live) return { x: live.x, y: live.y };

		const ml = context.stateLayoutDerived.mainLayout();
		const layout = context.stateLayoutDerived.layoutType();
		const board = context.stateGameDerived.boardLayout();
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;
		const mascotCenterX = ml.x + (board.x - ml.width * 0.5) * ml.scale;
		const mascotCenterY = ml.y + (board.y - ml.height * 0.5) * ml.scale;
		const canvas = context.stateLayoutDerived.canvasSizes();
		const mascot =
			layout === 'portrait'
				? getMascotPortraitScreenBox({
						canvasWidth: canvas.width,
						boardCenterY: mascotCenterY,
						halfH,
						buyPanelTop: portraitBuyPanelCanvasTop(context.stateLayoutDerived),
						buyPanelHeight: portraitBuyPanelHeightCanvas(context.stateLayoutDerived),
					})
				: getMascotScreenBox({
						centerX: mascotCenterX,
						centerY: mascotCenterY,
						halfW,
						halfH,
					});
		return getMascotGunMuzzlePoint(mascot);
	};

	const closeBoard = async () => {
		phase = 'done';
		pendingSeats = [];
		reservedSeats = new Set();
		stateGame.targetShotFlight = null;
		stateGame.targetShotFlip = null;
		stateGame.targetShotFlipLabel = null;
		// Out of ammo — only now hide the gun.
		stateGame.mascotPose = 'gunShotEnd';
		await wait(MASCOT_GUN_SHOT_END_MS);
		stateGame.mascotPose = 'idle';
		stateGame.drumFiringChamber = null;

		const slideOut = tweenSlide(0);
		if (extraFs > 0) {
			context.eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
			await context.eventEmitter.broadcastAsync({
				type: 'freeSpinIntroUpdate',
				totalFreeSpins: extraFs,
				mode: 'extra',
			});
			context.eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		}
		await slideOut;

		stateGame.targetPickOpen = false;
		stateGame.targetPickSeatMode = 'six';
		stateGame.drumShootActive = false;
		show = false;
		oncomplete();
	};

	const seatSizePx = (index: number) => {
		const el = shootBoard
			? (document.querySelector(`[data-test="target-shoot-board"] [data-seat="${index}"]`) as
					| HTMLElement
					| null)
			: null;
		if (!el) return 72;
		const r = el.getBoundingClientRect();
		return Math.min(r.width, r.height);
	};

	const fireOneShot = async (index: number) => {
		if (rewardQueue.length === 0) {
			reservedSeats = new Set([...reservedSeats].filter((i) => i !== index));
			return;
		}

		const reward = rewardQueue[0];
		rewardQueue = rewardQueue.slice(1);
		faceValues = faceValues.map((v, i) => (i === index ? reward : v));

		const chamber = await alignDrumForNextShot((ms) => wait(ms));
		if (chamber === null) {
			reservedSeats = new Set([...reservedSeats].filter((i) => i !== index));
			rewardQueue = [];
			return;
		}

		const hit = shootBoard?.getSeatHit(index);

		stateGame.mascotPose = 'shoot';
		stateGame.mascotAnimToken += 1;

		// Keep the gun out: after `gun_shot` return to looped aim (not gun_shot_end).
		void (async () => {
			await wait(MASCOT_GUN_SHOT_MS);
			if (phase === 'done') return;
			stateGame.mascotPose = 'aim';
		})();

		await wait(TARGET_SHOT_MUZZLE_DELAY_MS);
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });

		let impactX = 0;
		let impactY = 0;
		if (hit) {
			flipAnim = pickTargetFlipAnim({ x: hit.offsetX, y: hit.offsetY });
			const muzzle = resolveMuzzlePoint();
			const center = shootBoard?.getSeatCenter(index);
			const endX = (center?.x ?? hit.x - hit.offsetX) + hit.offsetX;
			const endY = (center?.y ?? hit.y - hit.offsetY) + hit.offsetY;
			impactX = center?.x ?? hit.x - hit.offsetX;
			impactY = center?.y ?? hit.y - hit.offsetY;
			const curve = buildTargetShotCurve({
				startX: muzzle.x,
				startY: muzzle.y,
				endX,
				endY,
				seatIndex: index,
				orientation:
					context.stateLayoutDerived.layoutType() === 'portrait' ? 'below' : 'side',
			});
			const nextFlight: TargetShotFlight = {
				nonce: (stateGame.targetShotFlightSeq += 1),
				startX: muzzle.x,
				startY: muzzle.y,
				endX,
				endY,
				points: curve.points,
				svgPath: curve.svgPath,
				flyMs: curve.flyMs,
			};
			stateGame.targetShotFlight = nextFlight;
			await wait(curve.flyMs);
			const landedNonce = nextFlight.nonce;
			void (async () => {
				await wait(TARGET_SHOT_IMPACT_MS);
				if (stateGame.targetShotFlight?.nonce === landedNonce) {
					stateGame.targetShotFlight = null;
				}
			})();
		} else {
			await wait(480);
		}

		await playDrumChamberShot((ms) => wait(ms));

		await wait(TARGET_SHOT_EXPLOSION_START_MS);
		spineSeat = index;
		spineNonce += 1;
		const size = seatSizePx(index);
		const center = shootBoard?.getSeatCenter(index);
		stateGame.targetShotFlip = {
			nonce: spineNonce,
			anim: flipAnim,
			value: reward,
			displayText: reward <= 0 ? '-' : `+${reward}`,
			showFsLabel: reward > 0,
			x: center?.x ?? impactX,
			y: center?.y ?? impactY,
			size,
		};

		const flipMs = TARGET_BOARD_PICK_FLIP_MS_BY_ANIM[flipAnim];
		await waitForResolve((resolve) => {
			onSpineResolve = resolve;
			setTimeout(resolve, flipMs + 150);
		});
		onSpineResolve = null;

		flipped = flipped.map((v, i) => (i === index ? true : v));
		spineSeat = null;
		stateGame.targetShotFlip = null;
		stateGame.targetShotFlipLabel = null;
		reservedSeats = new Set([...reservedSeats].filter((i) => i !== index));

		await advanceDrumAfterShot((ms) => wait(ms));
	};

	const drainShotQueue = async () => {
		if (draining) return;
		draining = true;
		while (pendingSeats.length > 0 && phase === 'pick') {
			const index = pendingSeats[0];
			pendingSeats = pendingSeats.slice(1);
			await fireOneShot(index);
		}
		draining = false;

		if (phase !== 'pick') return;
		if (rewardQueue.length === 0) {
			await closeBoard();
			return;
		}
		stateGame.mascotPose = 'aim';
	};

	const onTargetClick = (index: number) => {
		// Accept taps immediately while a prior shot is still animating.
		if (phase !== 'pick') return;
		if (flipped[index] || reservedSeats.has(index)) return;
		const reserved = reservedSeats.size;
		if (rewardQueue.length <= reserved) return;

		reservedSeats = new Set([...reservedSeats, index]);
		pendingSeats = [...pendingSeats, index];
		void drainShotQueue();
	};

	context.eventEmitter.subscribeOnMount({
		targetShootRound: async (event) => {
			startShotBulletPreload();
			startTargetBoardPreload();
			rewardQueue = event.shots.map((s) => s.reward as 0 | 1 | 2 | 3);
			extraFs = event.extraFs;
			faceValues = Array.from({ length: TARGET_SHOOT_SEAT_COUNT }, () => 0);
			flipped = Array.from({ length: TARGET_SHOOT_SEAT_COUNT }, () => false);
			spineSeat = null;
			spineNonce = 0;
			flipAnim = 'v4';
			stateGame.targetShotFlight = null;
			stateGame.targetShotFlip = null;
			stateGame.targetShotFlipLabel = null;
			pendingSeats = [];
			reservedSeats = new Set();
			draining = false;
			onSpineResolve = null;
			phase = 'prep';

			stateGame.targetPickSeatMode = 'nine';
			stateGame.targetPickSlide = 0;
			stateGame.targetPickOpen = true;
			stateGame.drumShootActive = true;
			syncDrumLoadRotation();
			show = true;

			stateGame.mascotPose = 'gunStatIdle';
			const mascotAimReady = (async () => {
				await wait(MASCOT_GUN_STAT_IDLE_MS);
				stateGame.mascotPose = 'aim';
			})();

			await Promise.all([tweenSlide(1), mascotAimReady]);
			await wait(Math.min(280, MASCOT_GUN_SHOT_AIM_MS * 0.15));

			if (rewardQueue.length === 0) {
				await closeBoard();
				return;
			}

			phase = 'pick';
			await waitForResolve((resolve) => {
				oncomplete = () => {
					stateGame.targetPickSlide = 0;
					stateGame.targetPickOpen = false;
					stateGame.targetPickSeatMode = 'six';
					stateGame.drumShootActive = false;
					show = false;
					resolve();
				};
			});
		},
	});
</script>

{#if show}
	<div class="overlay" data-test="target-shoot-overlay">
		<div class="grid-clip" style={gridStyle}>
			<div class="slide">
				<TargetShootBoard
					bind:this={shootBoard}
					values={faceValues}
					{flipped}
					{spineSeat}
					{spineNonce}
					locked={seatsLocked}
					onSelect={onTargetClick}
				/>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		pointer-events: none;
		background: transparent;
	}

	.grid-clip {
		position: absolute;
		overflow: hidden;
		pointer-events: auto;
	}

	.slide {
		width: 100%;
		height: 100%;
		transform: translateY(calc((var(--slide, 0) - 1) * 100%));
		will-change: transform;
	}

	.slide :global(.board) {
		width: 100% !important;
		height: 100% !important;
		max-height: none;
		aspect-ratio: auto !important;
	}
</style>
