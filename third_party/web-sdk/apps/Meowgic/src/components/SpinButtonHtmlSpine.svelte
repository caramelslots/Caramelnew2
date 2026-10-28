<script lang="ts" module>
	import { SpinePlayer } from '@esotericsoftware/spine-player';

	import {
		SPIN_BUTTON_SPINE_VIEWPORT,
		resolveSpinButtonSpineUrl,
	} from '../game/spinButtonHtmlSpine';

	let sharedPlayer: SpinePlayer | undefined;
	let sharedRoot: HTMLElement | undefined;
	let sharedReady = false;
	let activeHost: HTMLDivElement | undefined;
	let createStarted = false;
	const readyListeners = new Set<(ready: boolean) => void>();

	const notifyReady = () => {
		for (const listener of readyListeners) listener(sharedReady);
	};

	const rememberRoot = (host: HTMLDivElement) => {
		const root = host.querySelector('.spine-player');
		if (root instanceof HTMLElement) sharedRoot = root;
	};

	const attachRoot = (host: HTMLDivElement) => {
		activeHost = host;
		if (!sharedRoot || sharedRoot.parentElement === host) return;
		host.appendChild(sharedRoot);
	};

	/** Detach only. dispose() calls loseContext and can blank the main canvas. */
	const releaseHost = (host: HTMLDivElement) => {
		if (activeHost !== host) return;
		activeHost = undefined;
		const player = sharedPlayer;
		if (player) {
			try {
				player.paused = true;
			} catch {
				/* not ready */
			}
		}
		sharedRoot?.remove();
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import '@esotericsoftware/spine-player/dist/spine-player.css';

	import { isHtmlWebglPaused } from '../game/htmlWebglPause';

	let container = $state<HTMLDivElement>();
	let ready = $state(false);

	// TEMP DEBUG: spin button press after Spine 4.3 — remove once fixed.
	const debugPress = (stage: string) => {
		if (!import.meta.env.DEV) return;
		try {
			const p = sharedPlayer as unknown as Record<string, any> | undefined;
			const canvas = p?.canvas as HTMLCanvasElement | undefined;
			const gl = p?.context?.gl as WebGLRenderingContext | undefined;
			const track = p?.animationState?.getTrack?.(0);
			const rect = canvas?.getBoundingClientRect();
			const style = container ? getComputedStyle(container) : undefined;
			console.warn(
				'[SPIN-DEBUG]',
				stage,
				JSON.stringify({
					container: !!container,
					player: !!p,
					sharedReady,
					ready,
					webglPaused: isHtmlWebglPaused(),
					error: p?.error,
					errorText: (p?.dom as HTMLElement | undefined)?.querySelector('.spine-player-error')?.textContent ?? null,
					paused: p?.paused,
					stopRaf: p?.stopRequestAnimationFrame,
					disposed: p?.disposed,
					hasSkeleton: !!p?.skeleton,
					track: track?.animation?.name ?? null,
					trackTime: track?.trackTime,
					spinRot: p?.skeleton?.findBone?.('spin')?.appliedPose?.rotation,
					ctxLost: gl?.isContextLost?.(),
					canvas: canvas ? [canvas.width, canvas.height] : null,
					rect: rect ? [rect.x, rect.y, rect.width, rect.height].map(Math.round) : null,
					rootInHost: !!sharedRoot && sharedRoot.parentElement === container,
					rootConnected: sharedRoot?.isConnected,
					opacity: style?.opacity,
					display: style?.display,
					visibility: style?.visibility,
				}),
			);
		} catch (error) {
			console.warn('[SPIN-DEBUG] failed', error);
		}
	};

	export function playPress() {
		debugPress('press');
		setTimeout(() => debugPress('+400ms'), 400);
		if (!container || !sharedPlayer || !sharedReady || isHtmlWebglPaused()) return;
		attachRoot(container);
		sharedPlayer.paused = false;
		sharedPlayer.setAnimation('animation', false);
	}

	onMount(() => {
		if (!container) return;
		const host = container;
		const onReady = (value: boolean) => {
			ready = value;
		};
		readyListeners.add(onReady);
		attachRoot(host);
		if (sharedReady) ready = true;

		if (!createStarted) {
			createStarted = true;
			sharedPlayer = new SpinePlayer(host, {
			skeleton: resolveSpinButtonSpineUrl('spin_button.json'),
			atlasUrl: resolveSpinButtonSpineUrl('spin_button.atlas'),
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: false,
			preserveDrawingBuffer: false,
			alpha: true,
			viewport: {
				...SPIN_BUTTON_SPINE_VIEWPORT,
				animations: {
					animation: SPIN_BUTTON_SPINE_VIEWPORT,
				},
			},
			success: (spinePlayer) => {
				sharedPlayer = spinePlayer;
				rememberRoot(host);
				if (activeHost) attachRoot(activeHost);
				spinePlayer.skeleton!.scaleY = -1;
				spinePlayer.animationState?.setEmptyAnimation(0, 0);
				spinePlayer.animationState?.addListener({
					complete: (entry) => {
						if (entry.animation?.name !== 'animation') return;
						spinePlayer.animationState?.setEmptyAnimation(0, 0);
						spinePlayer.paused = true;
					},
				});
				spinePlayer.paused = true;
				sharedReady = true;
				notifyReady();
			},
			});
		}

		return () => {
			readyListeners.delete(onReady);
			releaseHost(host);
			ready = false;
		};
	});

	$effect(() => {
		if (!sharedPlayer || !ready || !isHtmlWebglPaused()) return;
		sharedPlayer.animationState?.setEmptyAnimation(0, 0);
		sharedPlayer.paused = true;
	});
</script>

<div class="spin-button-spine" class:ready bind:this={container}></div>

<style lang="scss">
	.spin-button-spine {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: hidden;
		opacity: 0;

		&.ready {
			opacity: 1;
		}
	}

	.spin-button-spine :global(.spine-player) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: none !important;
	}

	.spin-button-spine :global(.spine-player-canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
		background: transparent !important;
		border-radius: 0 !important;
	}

	.spin-button-spine :global(.spine-player-controls),
	.spin-button-spine :global(.spine-player-error),
	.spin-button-spine :global(.spine-player-loading) {
		display: none !important;
	}
</style>
