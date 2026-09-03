<!--
	TargetBoardOverlay — DEV preview for designer_assets/target.

	Modes:
	  - pick — same board + hit-seat Spine v3/v4 as freeSpinTargetPick
	  - spine — full SpinePlayer + all flip clips (QA)
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { SpinePlayer } from '@esotericsoftware/spine-player';
	import '@esotericsoftware/spine-player/dist/spine-player.css';
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { devPreview } from '../game/devPreview.svelte';
	import { isHtmlWebglPaused } from '../game/htmlWebglPause';
	import {
		getMascotGunMuzzlePoint,
		getMascotPortraitScreenBox,
		getMascotScreenBox,
		MASCOT_GUN_SHOT_END_MS,
		MASCOT_GUN_SHOT_MS,
	} from '../game/mascotHtmlSpine';
	import {
		portraitBuyPanelCanvasTop,
		portraitBuyPanelHeightCanvas,
	} from '../game/portraitHudLayout';
	import {
		TARGET_SHOT_EXPLOSION_START_MS,
		TARGET_SHOT_MUZZLE_DELAY_MS,
		buildTargetShotCurve,
		startShotBulletPreload,
	} from '../game/shotBulletAssets';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		TARGET_BOARD_DEV_VALUES,
		TARGET_BOARD_PICK_FLIP_MS_BY_ANIM,
		TARGET_BOARD_SPINE_ANIMS,
		TARGET_BOARD_SPINE_VIEWPORT,
		pickTargetFlipAnim,
		resolveTargetBoardSpineUrl,
		type TargetBoardPickFlipAnim,
		type TargetBoardSpineAnim,
	} from '../game/targetBoardAssets';
	import TargetPickBoard from './TargetPickBoard.svelte';
	import TargetShotBulletOverlay, {
		type TargetShotFlight,
	} from './TargetShotBulletOverlay.svelte';

	type Mode = 'pick' | 'spine';

	const context = getContext();
	const show = $derived(devPreview.forceShowTargetBoard);

	let mode = $state<Mode>('pick');
	let flipped = $state<boolean[]>(Array.from({ length: 6 }, () => false));
	let values = $state<number[]>([...TARGET_BOARD_DEV_VALUES]);
	let pickBusy = $state(false);
	let activeAnim = $state<TargetBoardSpineAnim | null>(null);
	let winnerIndex = $state<number | null>(null);
	let shotFlight = $state<TargetShotFlight | null>(null);
	let spineSeat = $state<number | null>(null);
	let spineNonce = $state(0);
	let flipAnim = $state<TargetBoardPickFlipAnim>('v4');
	let onSpineResolve = $state<(() => void) | null>(null);
	let pickBoard = $state<TargetPickBoard | undefined>();

	let spineHost = $state<HTMLDivElement | undefined>();
	let player: SpinePlayer | undefined;
	let spineReady = $state(false);

	const spineAspect =
		TARGET_BOARD_SPINE_VIEWPORT.width / TARGET_BOARD_SPINE_VIEWPORT.height;

	const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

	const resetPickBoard = () => {
		flipped = Array.from({ length: 6 }, () => false);
		values = [...TARGET_BOARD_DEV_VALUES];
		pickBusy = false;
		winnerIndex = null;
		shotFlight = null;
		spineSeat = null;
		spineNonce = 0;
		flipAnim = 'v4';
		onSpineResolve = null;
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

	const disposeSpine = () => {
		player?.dispose();
		player = undefined;
		spineReady = false;
		activeAnim = null;
		spineHost?.replaceChildren();
	};

	$effect(() => {
		if (!show) {
			disposeSpine();
			return;
		}
		startShotBulletPreload();
		resetPickBoard();
		mode = 'pick';
	});

	$effect(() => {
		if (!show || mode !== 'spine') {
			disposeSpine();
			return;
		}
		const el = spineHost;
		if (!el) return;

		let disposed = false;
		el.replaceChildren();
		spineReady = false;
		activeAnim = null;

		const viewportAnims = Object.fromEntries(
			TARGET_BOARD_SPINE_ANIMS.map((name) => [name, TARGET_BOARD_SPINE_VIEWPORT]),
		);

		const created = new SpinePlayer(el, {
			jsonUrl: resolveTargetBoardSpineUrl('target_board.json'),
			atlasUrl: resolveTargetBoardSpineUrl('target_board.atlas'),
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: false,
			alpha: true,
			viewport: {
				...TARGET_BOARD_SPINE_VIEWPORT,
				animations: viewportAnims,
			},
			success: (spinePlayer) => {
				if (disposed) return;
				spinePlayer.skeleton!.scaleY = -1;
				spinePlayer.animationState?.setEmptyAnimation(0, 0);
				spinePlayer.animationState?.addListener({
					complete: (entry) => {
						const name = entry.animation?.name;
						if (name && (TARGET_BOARD_SPINE_ANIMS as readonly string[]).includes(name)) {
							spinePlayer.animationState?.setEmptyAnimation(0, 0);
							activeAnim = null;
						}
					},
				});
				spinePlayer.paused = isHtmlWebglPaused();
				spineReady = true;
			},
		});
		player = created;

		return () => {
			disposed = true;
			created.dispose();
			if (player === created) player = undefined;
			spineReady = false;
			activeAnim = null;
		};
	});

	$effect(() => {
		if (!player || !spineReady) return;
		player.paused = isHtmlWebglPaused();
	});

	onDestroy(() => disposeSpine());

	const onSpineComplete = () => {
		onSpineResolve?.();
		onSpineResolve = null;
	};

	const onTargetClick = async (index: number) => {
		if (!show || mode !== 'pick' || pickBusy) return;
		if (flipped[index]) return;

		pickBusy = true;
		const hit = pickBoard?.getSeatHit(index);

		stateGame.mascotPose = 'shoot';
		stateGame.mascotAnimToken += 1;

		const mascotAfterShot = (async () => {
			await wait(MASCOT_GUN_SHOT_MS);
			stateGame.mascotPose = 'gunShotEnd';
			await wait(MASCOT_GUN_SHOT_END_MS);
		})();

		await wait(TARGET_SHOT_MUZZLE_DELAY_MS);

		if (hit) {
			flipAnim = pickTargetFlipAnim({ x: hit.offsetX, y: hit.offsetY });
			const muzzle = resolveMuzzlePoint();
			// Re-sample seat center at launch (board may have moved during aim/flash).
			const center = pickBoard?.getSeatCenter(index);
			const endX = (center?.x ?? hit.x - hit.offsetX) + hit.offsetX;
			const endY = (center?.y ?? hit.y - hit.offsetY) + hit.offsetY;
			const curve = buildTargetShotCurve({
				startX: muzzle.x,
				startY: muzzle.y,
				endX,
				endY,
				seatIndex: index,
				orientation:
					context.stateLayoutDerived.layoutType() === 'portrait' ? 'below' : 'side',
			});
			shotFlight = {
				nonce: (shotFlight?.nonce ?? 0) + 1,
				seatIndex: index,
				startX: muzzle.x,
				startY: muzzle.y,
				endX,
				endY,
				points: curve.points,
				svgPath: curve.svgPath,
				flyMs: curve.flyMs,
			};
			await wait(curve.flyMs);
		} else {
			await wait(480);
		}

		shotFlight = null;

		// Flip with the explosion burst (~67ms into `explosion_bullet`), not on land.
		await wait(TARGET_SHOT_EXPLOSION_START_MS);
		spineSeat = index;
		spineNonce += 1;
		const flipMs = TARGET_BOARD_PICK_FLIP_MS_BY_ANIM[flipAnim];
		await waitForResolve((resolve) => {
			onSpineResolve = resolve;
			setTimeout(resolve, flipMs + 120);
		});
		onSpineResolve = null;

		winnerIndex = index;
		flipped = flipped.map((v, i) => (i === index ? true : v));
		spineSeat = null;

		await mascotAfterShot;
		stateGame.mascotPose = 'idle';
		pickBusy = false;
	};

	const playSpineAnim = (name: TargetBoardSpineAnim) => {
		if (!player?.animationState || !spineReady) return;
		activeAnim = name;
		player.animationState.setAnimation(0, name, false);
	};

	const close = () => {
		devPreview.forceShowTargetBoard = false;
	};
</script>

{#if show}
	<div
		class="overlay"
		transition:fade={{ duration: 180 }}
		data-test="target-board-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Target board preview"
	>
		<div class="stage">
			<div class="mode-row" role="tablist" aria-label="Target board mode">
				<button
					type="button"
					class="mode-btn"
					class:active={mode === 'pick'}
					role="tab"
					aria-selected={mode === 'pick'}
					onclick={() => (mode = 'pick')}
				>
					Pick ×6
				</button>
				<button
					type="button"
					class="mode-btn"
					class:active={mode === 'spine'}
					role="tab"
					aria-selected={mode === 'spine'}
					onclick={() => (mode = 'spine')}
				>
					Spine QA
				</button>
			</div>

			{#if mode === 'pick'}
				<TargetPickBoard
					bind:this={pickBoard}
					{values}
					{flipped}
					{spineSeat}
					{spineNonce}
					{flipAnim}
					locked={pickBusy}
					onSelect={onTargetClick}
					onSpineComplete={onSpineComplete}
				/>
			{:else}
				<div class="spine-wrap" style={`aspect-ratio:${spineAspect}`}>
					<div class="spine-host" class:ready={spineReady} bind:this={spineHost}></div>
					{#if !spineReady}
						<p class="spine-loading">Loading spine…</p>
					{/if}
				</div>
				<div class="anim-row">
					{#each TARGET_BOARD_SPINE_ANIMS as anim (anim)}
						<button
							type="button"
							class="tool-btn"
							class:active={activeAnim === anim}
							disabled={!spineReady}
							onclick={() => playSpineAnim(anim)}
						>
							{anim}
						</button>
					{/each}
				</div>
			{/if}

			<div class="toolbar">
				<p class="hint">
					{#if mode === 'pick'}
						Same UI as freeSpinTargetPick · shot + Spine v4 on hit only
					{:else}
						Full board spine · all flip clips
					{/if}
				</p>
				<div class="actions">
					{#if mode === 'pick'}
						<button type="button" class="tool-btn" onclick={resetPickBoard}>Reset</button>
					{/if}
					<button type="button" class="tool-btn" onclick={close}>Close</button>
				</div>
			</div>
		</div>
	</div>

	<TargetShotBulletOverlay flight={shotFlight} />
{/if}

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		pointer-events: none;
		padding: 1rem;
	}

	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: min(720px, 72vw);
		pointer-events: auto;
	}

	.mode-row {
		display: flex;
		gap: 0.4rem;
	}

	.mode-btn {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.8rem;
		letter-spacing: 0.06em;
		padding: 0.4rem 0.9rem;
		border-radius: 6px;
		border: 1px solid rgba(201, 162, 74, 0.4);
		background: rgba(18, 14, 10, 0.85);
		color: rgba(240, 215, 140, 0.75);
		cursor: pointer;
	}

	.mode-btn.active {
		border-color: #f0d78c;
		color: #f0d78c;
		background: rgba(48, 36, 18, 0.95);
	}

	.spine-wrap {
		position: relative;
		width: min(100%, calc(78vh * 2050 / 1993));
		filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.65));
	}

	.spine-host {
		position: absolute;
		inset: 0;
		opacity: 0;
	}

	.spine-host.ready {
		opacity: 1;
	}

	.spine-host :global(.spine-player) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: none !important;
	}

	.spine-host :global(.spine-player-canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
		background: transparent !important;
		border-radius: 0 !important;
	}

	.spine-host :global(.spine-player-controls),
	.spine-host :global(.spine-player-error),
	.spine-host :global(.spine-player-loading) {
		display: none !important;
	}

	.spine-loading {
		position: absolute;
		inset: 0;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'proxima-nova', sans-serif;
		color: rgba(255, 255, 255, 0.65);
	}

	.anim-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem;
		max-width: 100%;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.65rem 1rem;
	}

	.hint {
		margin: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.72);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.tool-btn {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.8rem;
		letter-spacing: 0.06em;
		padding: 0.4rem 0.85rem;
		border-radius: 6px;
		border: 1px solid rgba(201, 162, 74, 0.55);
		background: rgba(18, 14, 10, 0.92);
		color: #f0d78c;
		cursor: pointer;
	}

	.tool-btn:hover:not(:disabled) {
		border-color: #f0d78c;
	}

	.tool-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.tool-btn.active {
		border-color: #f0d78c;
		background: rgba(48, 36, 18, 0.95);
	}
</style>
