<!--
	One persistent SpinePlayer (created on mount — not in $effect).
	Hit just calls setAnimation('v4'). Same viewport/scaleY as the working
	full-board QA player; CSS crops the single disc to the seat.
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { SpinePlayer } from '@esotericsoftware/spine-player';
	import '@esotericsoftware/spine-player/dist/spine-player.css';

	import { isHtmlWebglPaused } from '../game/htmlWebglPause';
	import {
		TARGET_BOARD_FLIP_VISIBLE_SLOTS,
		TARGET_BOARD_PICK_FLIP_ANIM,
		TARGET_BOARD_PICK_FLIP_MS_BY_ANIM,
		TARGET_BOARD_SPINE_VIEWPORT,
		resolveTargetBoardSpineUrl,
		type TargetBoardPickFlipAnim,
		type TargetBoardSpineAnim,
	} from '../game/targetBoardAssets';

	type Props = {
		/** Increment to (re)play flip. 0 = armed, not playing. */
		nonce: number;
		/** FS count drawn on the disc and scaled with the `front` bone. */
		value: number;
		/** Overrides the numeric label (e.g. "—" for a blank extra-FS seat). */
		displayText?: string;
		/** Hide the "FS" caption (blank seats). Default true. */
		showFsLabel?: boolean;
		animation?: TargetBoardSpineAnim;
		onready?: () => void;
		oncomplete?: () => void;
	};

	const props: Props = $props();
	const animation = $derived(props.animation ?? TARGET_BOARD_PICK_FLIP_ANIM);
	const flipMs = $derived(
		TARGET_BOARD_PICK_FLIP_MS_BY_ANIM[animation as TargetBoardPickFlipAnim] ??
			TARGET_BOARD_PICK_FLIP_MS_BY_ANIM.v4,
	);
	const labelText = $derived(props.displayText ?? String(props.value));
	const showFsLabel = $derived(props.showFsLabel !== false);

	let host = $state<HTMLDivElement | undefined>();
	let player: SpinePlayer | undefined;
	let ready = $state(false);
	let fsStyle = $state('opacity:0');
	let finished = false;
	let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

	/** Face mostly open — skip the edge-on squash. */
	const BACK_OPEN = 0.45;

	const syncFs = (spinePlayer: SpinePlayer) => {
		if (props.nonce < 1) {
			fsStyle = 'opacity:0';
			return;
		}
		const skel = spinePlayer.skeleton;
		const bone = skel?.findBone('front');
		if (!bone || !skel) {
			fsStyle = 'opacity:0';
			return;
		}
		const sx = Math.abs(bone.scaleX) || 1;
		const sy = Math.abs(bone.scaleY) || 1;
		const open = sy >= BACK_OPEN && sx >= BACK_OPEN;
		// Only on the wood `back` face — never on the bullseye `front`.
		const onBack = skel.findSlot('back')?.getAttachment() != null;
		const visible = onBack && open;
		fsStyle = [
			`opacity:${visible ? 1 : 0}`,
			`transform:scale(${sx},${sy})`,
		].join(';');
	};

	const clearFallback = () => {
		if (fallbackTimer !== undefined) {
			clearTimeout(fallbackTimer);
			fallbackTimer = undefined;
		}
	};

	const hideBoardSlots = (spinePlayer: SpinePlayer) => {
		const skel = spinePlayer.skeleton;
		if (!skel) return;
		const keep = new Set<string>(TARGET_BOARD_FLIP_VISIBLE_SLOTS);
		for (const slot of skel.slots) {
			if (keep.has(slot.data.name)) continue;
			try {
				skel.setAttachment(slot.data.name, null);
			} catch {
				slot.setAttachment(null);
			}
		}
	};

	const finish = () => {
		if (finished) return;
		finished = true;
		clearFallback();
		props.oncomplete?.();
	};

	const play = (anim: string) => {
		if (!player?.animationState || !ready) return;
		finished = false;
		clearFallback();
		player.paused = isHtmlWebglPaused();
		player.animationState.setAnimation(0, anim, false);
		fallbackTimer = setTimeout(finish, flipMs + 100);
	};

	onMount(() => {
		const el = host;
		if (!el) return;

		const created = new SpinePlayer(el, {
			jsonUrl: resolveTargetBoardSpineUrl('target_board.json'),
			atlasUrl: resolveTargetBoardSpineUrl('target_board.atlas'),
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: false,
			preserveDrawingBuffer: false,
			alpha: true,
			viewport: {
				...TARGET_BOARD_SPINE_VIEWPORT,
				animations: {
					v3: TARGET_BOARD_SPINE_VIEWPORT,
					v4: TARGET_BOARD_SPINE_VIEWPORT,
					[TARGET_BOARD_PICK_FLIP_ANIM]: TARGET_BOARD_SPINE_VIEWPORT,
				},
			},
			frame: (spinePlayer) => {
				if (!ready) return;
				syncFs(spinePlayer);
			},
			success: (spinePlayer) => {
				spinePlayer.skeleton!.scaleY = -1;
				hideBoardSlots(spinePlayer);
				spinePlayer.animationState?.addListener({
					complete: (entry) => {
						const name = entry.animation?.name;
						if (name === 'v3' || name === 'v4') finish();
					},
				});
				spinePlayer.animationState?.setEmptyAnimation(0, 0);
				spinePlayer.paused = isHtmlWebglPaused();
				ready = true;
				props.onready?.();
				if (props.nonce > 0) play(animation);
			},
			error: (_p, msg) => {
				console.error('[TargetFlipSpine]', msg);
				finish();
			},
		});
		player = created;

		return () => {
			clearFallback();
			created.dispose();
			if (player === created) player = undefined;
			ready = false;
		};
	});

	// Only (re)play — never dispose/recreate the WebGL player here.
	$effect(() => {
		const nonce = props.nonce;
		const anim = animation;
		if (!ready || nonce < 1) return;
		play(anim);
	});

	$effect(() => {
		if (!player || !ready) return;
		player.paused = isHtmlWebglPaused();
	});

	onDestroy(() => {
		clearFallback();
		player?.dispose();
		player = undefined;
	});
</script>

<div class="flip-crop" aria-hidden="true">
	<div class="flip-shift" bind:this={host}></div>
	<span class="fs" style={fsStyle}>
		<span class="fs-num">{labelText}</span>
		{#if showFsLabel}
			<span class="fs-label">FS</span>
		{/if}
	</span>
</div>

<style lang="scss">
	/* Seat-sized window. Player uses the full-board viewport (same as QA);
	   we scale/shift so the single disc fills this crop. */
	.flip-crop {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 2;
	}

	.flip-shift {
		position: absolute;
		/* Disc lives near v≈0.357 of the full-board viewport. 64% was empty
		   space (wrong Y-up assumption) and cropped the disc away. Nudge
		   35.7 → 38.5 so the disc sits a bit higher in the holder. */
		width: 485.8%;
		height: 472.3%;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -38.5%);
	}

	.flip-shift :global(.spine-player) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: none !important;
	}

	.flip-shift :global(.spine-player-canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
		background: transparent !important;
		border-radius: 0 !important;
	}

	.flip-shift :global(.spine-player-controls),
	.flip-shift :global(.spine-player-error),
	.flip-shift :global(.spine-player-loading) {
		display: none !important;
	}

	/* Lives in the seat crop (disc window), not the oversized canvas. */
	.fs {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1;
		color: #f0d78c;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.55),
			0 2px 8px rgba(0, 0, 0, 0.85);
		user-select: none;
		pointer-events: none;
		transform-origin: center center;
		will-change: transform, opacity;
	}

	.fs-num {
		font-family: 'proxima-nova', sans-serif;
		font-size: clamp(1.35rem, 3.8vw, 2.35rem);
		font-weight: 800;
	}

	.fs-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: clamp(0.55rem, 1.4vw, 0.75rem);
		letter-spacing: 0.14em;
		margin-top: 0.12em;
	}
</style>
