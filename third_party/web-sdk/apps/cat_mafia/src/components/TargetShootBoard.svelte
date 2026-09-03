<!--
	Stage E shoot board: 9 HTML hit seats on background_9.webp (3×3 shelves).
	Flip FX in Pixi (TargetFlipPixiLayer); HTML keeps the reward face after flip.
-->
<script lang="ts">
	import { getContext } from '../game/context';
	import { isPopoutSmallViewport } from '../game/constants';
	import {
		TARGET_BOARD_SPRITES,
		TARGET_SHOOT_CONTENT,
		TARGET_SHOOT_SEAT_WIDTH_FRAC,
		TARGET_SHOOT_SLOTS,
		targetBoardSlotStyle,
		targetPickInnerClip,
	} from '../game/targetBoardAssets';
	import { randomTargetHitOffset } from '../game/shotBulletAssets';

	type Props = {
		/** Per-seat reward (0–3). Shown after flip. */
		values: number[];
		flipped: boolean[];
		spinningSeats?: ReadonlySet<number> | number[];
		locked?: boolean;
		onSelect?: (index: number) => void;
	};

	const props: Props = $props();
	const context = getContext();

	let root = $state<HTMLDivElement | undefined>();

	const locked = $derived(props.locked === true);
	const spinningSet = $derived.by(() => {
		const raw = props.spinningSeats;
		if (!raw) return new Set<number>();
		return raw instanceof Set ? raw : new Set(raw);
	});
	const seatW = `${TARGET_SHOOT_SEAT_WIDTH_FRAC * 100}%`;

	/** Stable plaque size from layout — avoids ResizeObserver first-paint jump. */
	const promptFs = $derived.by(() => {
		const hole = targetPickInnerClip();
		const board = context.stateGameDerived.boardLayout();
		const ml = context.stateLayoutDerived.mainLayout();
		const cell = board.scale * ml.scale;
		const w = hole.width * cell;
		const h = hole.height * cell;
		const canvas = context.stateLayoutDerived.canvasSizes();
		const popoutS = isPopoutSmallViewport(canvas);
		const byWidth = w * (popoutS ? 0.022 : 0.034);
		const byHeight = h * (popoutS ? 0.026 : 0.042);
		const fs = Math.min(byWidth, byHeight);
		const min = popoutS ? 6.5 : 9;
		const max = popoutS ? 11 : 24;
		return Math.round(Math.max(min, Math.min(max, fs)) * 10) / 10;
	});

	const artStyle = $derived(
		[
			`--board-bg:url('${TARGET_BOARD_SPRITES.background9}')`,
			`--cl:${TARGET_SHOOT_CONTENT.left}`,
			`--ct:${TARGET_SHOOT_CONTENT.top}`,
			`--cw:${TARGET_SHOOT_CONTENT.width}`,
			`--ch:${TARGET_SHOOT_CONTENT.height}`,
			`--prompt-fs:${promptFs}px`,
			`--seat-w:${seatW}`,
		].join(';'),
	);

	const rewardLabel = (r: number) => (r <= 0 ? '-' : `+${r}`);

	export function getSeatCenter(index: number): { x: number; y: number } | null {
		const el = root?.querySelector<HTMLElement>(`[data-seat="${index}"]`);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
	}

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

<div class="board" bind:this={root} style={artStyle} data-test="target-shoot-board">
	<p class="prompt" aria-hidden="true">{context.i18nDerived.targetShootTitle()}</p>

	{#each TARGET_SHOOT_SLOTS as slot, i (i)}
		{@const isFlipped = props.flipped[i] === true}
		{@const isSpinning = spinningSet.has(i)}
		{@const reward = props.values[i] ?? 0}
		<button
			type="button"
			class="target"
			class:flipped={isFlipped}
			class:spinning={isSpinning}
			data-seat={i}
			style={targetBoardSlotStyle(slot, TARGET_SHOOT_CONTENT)}
			disabled={locked || isFlipped || isSpinning}
			onclick={() => onClick(i)}
			aria-label={`Target ${i + 1}`}
		>
			{#if isFlipped && !isSpinning}
				<span class="disc">
					<span class="face back" style={`background-image:url('${TARGET_BOARD_SPRITES.back}')`}>
						<span class="fs">
							<span class="fs-num">{rewardLabel(reward)}</span>
							{#if reward > 0}
								<span class="fs-label">FS</span>
							{/if}
						</span>
					</span>
				</span>
			{/if}
		</button>
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
		width: var(--seat-w, 17.5%);
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

	.disc {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 50%;
		transform: translateY(-18%);
	}

	.face {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-position: center;
	}

	.back {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fs {
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
	}

	.fs-num {
		font-family: 'proxima-nova', sans-serif;
		/* Match TargetFlipSpine so the count doesn't jump after the flip. */
		font-size: clamp(1.35rem, 3.8vw, 2.35rem);
		font-weight: 800;
	}

	.fs-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: clamp(0.55rem, 1.4vw, 0.75rem);
		letter-spacing: 0.14em;
		margin-top: 0.12em;
	}

	/* Phone: slightly larger FS digits on the disc. */
	@media (max-width: 500px), ((hover: none) and (pointer: coarse) and (max-width: 900px)) {
		.fs-num {
			font-size: clamp(1.55rem, 4.5vw, 2.55rem);
		}

		.fs-label {
			font-size: clamp(0.62rem, 1.65vw, 0.85rem);
		}
	}
</style>
