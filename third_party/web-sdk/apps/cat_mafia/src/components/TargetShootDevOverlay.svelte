<!--
	DEV-only: Stage E 9-target cabinet in the gold frame (Pixi wood + HTML seats).
	Toggled from DevButtons via `devPreview.forceShowTargetShoot`.
-->
<script lang="ts">
	import { fade } from 'svelte/transition';

	import { getContext } from '../game/context';
	import { BOARD_LAYOUT_OFFSETS } from '../game/constants';
	import { devPreview } from '../game/devPreview.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		TARGET_BOARD_SPRITES,
		TARGET_SHOOT_SEAT_COUNT,
		startTargetBoardPreload,
		targetPickInnerClip,
	} from '../game/targetBoardAssets';
	import TargetShootBoard from './TargetShootBoard.svelte';

	const context = getContext();
	const show = $derived(devPreview.forceShowTargetShoot);

	const sampleValues = Array.from({ length: TARGET_SHOOT_SEAT_COUNT }, (_, i) =>
		i % 4 === 0 ? 0 : (i % 3) + 1,
	);
	const flipped = Array.from({ length: TARGET_SHOOT_SEAT_COUNT }, () => false);

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
		].join(';');
	});

	$effect(() => {
		if (!show) return;

		startTargetBoardPreload();
		stateGame.targetPickSeatMode = 'nine';
		stateGame.targetPickFlipped = [...flipped];
		stateGame.targetPickSpineSeat = null;
		stateGame.targetPickSlide = 1;
		stateGame.targetPickOpen = true;

		return () => {
			if (devPreview.forceShowTargetShoot) return;
			stateGame.targetPickOpen = false;
			stateGame.targetPickSlide = 0;
			stateGame.targetPickSeatMode = 'six';
			stateGame.targetPickFlipped = [];
			stateGame.targetPickSpineSeat = null;
		};
	});

	const close = () => {
		devPreview.forceShowTargetShoot = false;
	};
</script>

{#if show}
	<div
		class="overlay"
		transition:fade={{ duration: 160 }}
		data-test="target-shoot-dev-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Target shoot board preview"
	>
		<div class="grid-clip" style={gridStyle}>
			<TargetShootBoard values={sampleValues} {flipped} locked />
		</div>

		<div class="toolbar">
			<p class="hint">
				Stage E · 9 seats · <code>{TARGET_BOARD_SPRITES.background9.split('/').pop()}</code>
			</p>
			<button type="button" class="tool-btn" onclick={close}>Close</button>
		</div>
	</div>
{/if}

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 70;
		pointer-events: none;
		background: transparent;
	}

	.grid-clip {
		position: absolute;
		overflow: hidden;
		pointer-events: none;
	}

	.grid-clip :global(.board) {
		width: 100% !important;
		height: 100% !important;
		max-height: none;
		aspect-ratio: auto !important;
	}

	.toolbar {
		position: fixed;
		left: 50%;
		bottom: 1.25rem;
		z-index: 71;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.65rem 1rem;
		transform: translateX(-50%);
		pointer-events: auto;
		padding: 0.55rem 0.85rem;
		border-radius: 8px;
		border: 1px solid rgba(201, 162, 74, 0.45);
		background: rgba(18, 14, 10, 0.92);
	}

	.hint {
		margin: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.78);
	}

	.hint code {
		font-size: 0.8em;
		color: #f0d78c;
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

	.tool-btn:hover {
		border-color: #f0d78c;
	}
</style>
