<script lang="ts" module>
	export type EmitterEventFreeSpinTargetPick =
		| {
				type: 'freeSpinTargetPick';
				targets: number[];
				chosenIndex: number;
				awardedFs: number;
		  }
		| { type: 'targetPickDismiss' };
</script>

<script lang="ts">
	/**
	 * Target pick on base: board slides in → shot → Spine flip.
	 * Board stays up until steam covers (`targetPickDismiss`); then symbols.
	 */
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { BOARD_LAYOUT_OFFSETS } from '../game/constants';
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
		TARGET_BOARD_DEV_VALUES,
		TARGET_BOARD_PICK_FLIP_MS_BY_ANIM,
		TARGET_PICK_SLIDE_MS,
		pickTargetFlipAnim,
		startTargetBoardPreload,
		targetPickInnerClip,
		type TargetBoardPickFlipAnim,
	} from '../game/targetBoardAssets';
	import TargetPickBoard from './TargetPickBoard.svelte';

	const context = getContext();

	let show = $state(false);
	let phase = $state<'prep' | 'pick' | 'shoot' | 'reveal'>('prep');
	let targets = $state<number[]>([...TARGET_BOARD_DEV_VALUES]);
	let chosenIndex = $state(0);
	let awardedFs = $state(10);
	let faceValues = $state<number[]>([...TARGET_BOARD_DEV_VALUES]);
	let flipped = $state<boolean[]>(Array.from({ length: 6 }, () => false));
	let spineSeat = $state<number | null>(null);
	let spineNonce = $state(0);
	let flipAnim = $state<TargetBoardPickFlipAnim>('v4');
	let oncomplete = $state(() => {});
	let onSpineResolve = $state<(() => void) | null>(null);
	let pickBoard = $state<TargetPickBoard | undefined>();

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

	/** Same inner-frame hole as the Pixi cabinet — seats stay on the wood. */
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

	const buildFaceValues = (clicked: number) => {
		const others = targets.filter((_, i) => i !== chosenIndex);
		return targets.map((_, i) => {
			if (i === clicked) return awardedFs;
			return others.shift() ?? 10;
		});
	};

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

	const onTargetClick = async (index: number) => {
		if (phase !== 'pick') return;
		faceValues = buildFaceValues(index);
		phase = 'shoot';

		const hit = pickBoard?.getSeatHit(index);

		stateGame.mascotPose = 'shoot';
		stateGame.mascotAnimToken += 1;

		// `gun_shot` holds its last frame — advance to `gun_shot_end` as soon as
		// the clip finishes, in parallel with the bullet / flip.
		const mascotAfterShot = (async () => {
			await wait(MASCOT_GUN_SHOT_MS);
			stateGame.mascotPose = 'gunShotEnd';
			await wait(MASCOT_GUN_SHOT_END_MS);
		})();

		// Wait for the `gun_shot` muzzle-flash beat before launching the projectile.
		await wait(TARGET_SHOT_MUZZLE_DELAY_MS);
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });

		let seatCx = 0;
		let seatCy = 0;
		if (hit) {
			flipAnim = pickTargetFlipAnim({ x: hit.offsetX, y: hit.offsetY });
			const muzzle = resolveMuzzlePoint();
			const center = pickBoard?.getSeatCenter(index);
			const endX = (center?.x ?? hit.x - hit.offsetX) + hit.offsetX;
			const endY = (center?.y ?? hit.y - hit.offsetY) + hit.offsetY;
			seatCx = center?.x ?? hit.x - hit.offsetX;
			seatCy = center?.y ?? hit.y - hit.offsetY;
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
				seatIndex: index,
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
			// Keep flight through impact so Pixi stage stays above HTML seats
			// (HTML overlay used to clear prop immediately; SpinePlayer kept going).
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

		// Flip with the explosion burst (~67ms into `explosion_bullet`), not on land.
		await wait(TARGET_SHOT_EXPLOSION_START_MS);
		phase = 'reveal';
		spineSeat = index;
		spineNonce += 1;
		const seatEl = document.querySelector(
			`[data-test="target-pick-board"] [data-seat="${index}"]`,
		) as HTMLElement | null;
		const seatBox = seatEl?.getBoundingClientRect();
		const size = seatBox ? Math.min(seatBox.width, seatBox.height) : 80;
		stateGame.targetShotFlips = [
			{
				nonce: spineNonce,
				seatIndex: index,
				anim: flipAnim,
				value: faceValues[index] ?? awardedFs,
				x: seatCx || pickBoard?.getSeatCenter(index)?.x || 0,
				y: seatCy || pickBoard?.getSeatCenter(index)?.y || 0,
				size,
			},
		];

		const flipMs = TARGET_BOARD_PICK_FLIP_MS_BY_ANIM[flipAnim];
		await waitForResolve((resolve) => {
			onSpineResolve = resolve;
			setTimeout(resolve, flipMs + 150);
		});
		onSpineResolve = null;

		flipped = flipped.map((v, i) => (i === index ? true : v));
		spineSeat = null;
		stateGame.targetShotFlips = [];
		stateGame.targetShotFlipLabels = {};

		await mascotAfterShot;
		stateGame.mascotPose = 'idle';

		// Keep the gallery up; freeSpinTrigger starts the cloud, and
		// `targetPickDismiss` snaps to symbols while the screen is covered.
		oncomplete();
	};

	context.eventEmitter.subscribeOnMount({
		targetPickDismiss: () => {
			stateGame.targetShotFlight = null;
			stateGame.targetShotFlips = [];
			stateGame.targetShotFlipLabels = {};
			stateGame.targetPickSlide = 0;
			stateGame.targetPickOpen = false;
			show = false;
			phase = 'prep';
		},
		freeSpinTargetPick: async (event) => {
			startShotBulletPreload();
			startTargetBoardPreload();
			targets = event.targets.length === 6 ? [...event.targets] : [...TARGET_BOARD_DEV_VALUES];
			chosenIndex = event.chosenIndex;
			awardedFs = event.awardedFs;
			faceValues = [...targets];
			flipped = Array.from({ length: 6 }, () => false);
			spineSeat = null;
			spineNonce = 0;
			flipAnim = 'v4';
			stateGame.targetShotFlight = null;
			stateGame.targetShotFlips = [];
			stateGame.targetShotFlipLabels = {};
			onSpineResolve = null;
			phase = 'prep';
			stateGame.targetPickSeatMode = 'six';
			stateGame.targetPickSlide = 0;
			stateGame.targetPickOpen = true;
			show = true;

			// Draw / aim as soon as target mode starts — parallel with the board slide,
			// not after the targets have finished arriving.
			stateGame.mascotPose = 'gunStatIdle';
			const mascotAimReady = (async () => {
				await wait(MASCOT_GUN_STAT_IDLE_MS);
				stateGame.mascotPose = 'aim';
			})();

			await Promise.all([tweenSlide(1), mascotAimReady]);
			// Short beat so the aim loop is readable before taps unlock.
			await wait(Math.min(280, MASCOT_GUN_SHOT_AIM_MS * 0.15));
			phase = 'pick';

			await waitForResolve((resolve) => {
				oncomplete = () => {
					// Leave slide/open as-is — dismissed mid-transition.
					resolve();
				};
			});
		},
	});
</script>

{#if show}
	<div class="overlay" data-test="target-pick-overlay">
		<div class="grid-clip" style={gridStyle}>
			<div class="slide">
				<TargetPickBoard
					bind:this={pickBoard}
					values={faceValues}
					{flipped}
					{spineSeat}
					{spineNonce}
					locked={phase !== 'pick'}
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
