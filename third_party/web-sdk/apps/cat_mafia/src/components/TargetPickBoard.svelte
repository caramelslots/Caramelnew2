<!--
	Shooting-gallery board: 6 HTML hit seats. Flip FX + settled FS faces stay in
	Pixi (TargetFlipPixiLayer) so typography does not jump after the clip.
-->
<script lang="ts">
	import { getContext } from '../game/context';
	import { isPopoutSmallViewport } from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		TARGET_BOARD_CONTENT,
		TARGET_BOARD_SLOTS,
		TARGET_BOARD_SPRITES,
		targetBoardSlotStyle,
	} from '../game/targetBoardAssets';
	import { randomTargetHitOffset } from '../game/shotBulletAssets';

	type Props = {
		values: number[];
		flipped: boolean[];
		spineSeat?: number | null;
		spineNonce?: number;
		locked?: boolean;
		onSelect?: (index: number) => void;
	};

	const props: Props = $props();
	const context = getContext();

	let root = $state<HTMLDivElement | undefined>();
	/** Board-driven prompt size — tighter on popout-s so it fits the plaque. */
	let promptFs = $state(14);

	const locked = $derived(props.locked === true);
	const artStyle = $derived(
		[
			`--board-bg:url('${TARGET_BOARD_SPRITES.background}')`,
			`--cl:${TARGET_BOARD_CONTENT.left}`,
			`--ct:${TARGET_BOARD_CONTENT.top}`,
			`--cw:${TARGET_BOARD_CONTENT.width}`,
			`--ch:${TARGET_BOARD_CONTENT.height}`,
			`--prompt-fs:${promptFs}px`,
		].join(';'),
	);
	const spineSeat = $derived(props.spineSeat ?? null);
	const spineNonce = $derived(props.spineNonce ?? 0);
	/** Pixi flip still mounted (spinning or settled hold). */
	const flippingSeats = $derived(
		new Set(stateGame.targetShotFlips.map((f) => f.seatIndex)),
	);

	const syncPromptSize = () => {
		const w = root?.clientWidth ?? 0;
		const h = root?.clientHeight ?? 0;
		if (w <= 0) return;
		const canvas = context.stateLayoutDerived.canvasSizes();
		const popoutS = isPopoutSmallViewport(canvas);
		const byWidth = w * (popoutS ? 0.022 : 0.034);
		const byHeight = h * (popoutS ? 0.026 : 0.042);
		const fs = Math.min(byWidth, byHeight);
		const min = popoutS ? 6.5 : 9;
		const max = popoutS ? 11 : 24;
		promptFs = Math.round(Math.max(min, Math.min(max, fs)) * 10) / 10;
	};

	$effect(() => {
		const el = root;
		void context.stateLayoutDerived.canvasSizes().width;
		void context.stateLayoutDerived.canvasSizes().height;
		if (!el) return;
		syncPromptSize();
		const ro = new ResizeObserver(() => syncPromptSize());
		ro.observe(el);
		return () => ro.disconnect();
	});

	export function getSeatCenter(index: number): { x: number; y: number } | null {
		const el = root?.querySelector<HTMLElement>(`[data-seat="${index}"]`);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
	}

	/** Seat center + small random disc offset for shot impact variety. */
	export function getSeatHit(index: number): {
		x: number;
		y: number;
		offsetX: number;
		offsetY: number;
	} | null {
		const el = root?.querySelector<HTMLElement>(`[data-seat="${index}"]`);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		const cx = r.left + r.width * 0.5;
		const cy = r.top + r.height * 0.5;
		const offset = randomTargetHitOffset(Math.min(r.width, r.height));
		return {
			x: cx + offset.x,
			y: cy + offset.y,
			offsetX: offset.x,
			offsetY: offset.y,
		};
	}

	const onClick = (index: number) => {
		if (locked) return;
		if (props.flipped[index]) return;
		props.onSelect?.(index);
	};
</script>

<div class="board" bind:this={root} style={artStyle} data-test="target-pick-board">
	<p class="prompt" aria-hidden="true">{context.i18nDerived.targetPickTitle()}</p>

	{#each TARGET_BOARD_SLOTS as slot, i (i)}
		{@const isFlipped = props.flipped[i] === true}
		{@const isSpinning =
			(spineSeat === i && spineNonce > 0) || flippingSeats.has(i)}
		<button
			type="button"
			class="target"
			class:flipped={isFlipped}
			class:spinning={isSpinning}
			data-seat={i}
			style={targetBoardSlotStyle(slot)}
			disabled={locked || isFlipped || isSpinning}
			onclick={() => onClick(i)}
			aria-label={`Target ${i + 1}`}
		></button>
	{/each}
</div>

<style lang="scss">
	.board {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.prompt {
		position: absolute;
		left: 50%;
		top: 3.5%;
		z-index: 3;
		width: 40%;
		margin: 0;
		transform: translateX(-50%);
		text-align: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: var(--prompt-fs, 14px);
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		line-height: 1;
		white-space: nowrap;
		color: #f0d78c;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.55),
			0 2px 10px rgba(0, 0, 0, 0.85);
		pointer-events: none;
		user-select: none;
	}

	.target {
		position: absolute;
		width: 22.5%;
		aspect-ratio: 1;
		transform: translate(-50%, calc(-50% + 5px));
		border: none;
		padding: 0;
		background: transparent;
		cursor: pointer;
	}

	.target:disabled {
		cursor: default;
	}
</style>
