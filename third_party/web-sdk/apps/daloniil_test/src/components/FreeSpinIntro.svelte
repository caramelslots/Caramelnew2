<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { fade } from 'svelte/transition';
	import { OnHotkey } from 'components-shared';
	import { waitForResolve } from 'utils-shared/wait';

	import { BOARD_DIMENSIONS, BOARD_LAYOUT_OFFSETS, SYMBOL_SIZE } from '../game/constants';
	import assets from '../game/assets';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import PressToContinueHtml from './PressToContinueHtml.svelte';

	const context = getContext();

	const boardUrl = assets.fsCongBoard.src;
	const numberUrl = assets.fsCongNumber.src;

	// fs_cong.png native aspect; scaled up for legibility on desktop/portrait layouts.
	const BOARD_RATIO = 1536 / 1024;
	const NUMBER_RATIO = 1276 / 595;
	const BOARD_SCALE = 1.55;
	// Inner "10" plaque — centred in the YOU WON / FREE SPINS gap on fs_cong art.
	const NUMBER_Y_RATIO = 0.61;
	const NUMBER_WIDTH_RATIO = 0.22;

	const panelLayout = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const layoutType = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;

		const panelWidth = SYMBOL_SIZE * BOARD_DIMENSIONS.x * BOARD_SCALE * ml.scale;
		const panelHeight = panelWidth / BOARD_RATIO;
		const numberWidth = panelWidth * NUMBER_WIDTH_RATIO;
		const numberHeight = numberWidth / NUMBER_RATIO;

		return {
			centerX,
			centerY,
			panelWidth,
			panelHeight,
			numberWidth,
			numberHeight,
			numberTop: panelHeight * NUMBER_Y_RATIO,
		};
	});

	const panelStyle = $derived.by(() => {
		const p = panelLayout;
		return [
			`left:${p.centerX}px`,
			`top:${p.centerY}px`,
			`width:${p.panelWidth}px`,
			`height:${p.panelHeight}px`,
		].join(';');
	});

	const numberStyle = $derived.by(() => {
		const p = panelLayout;
		return [
			`width:${p.numberWidth}px`,
			`height:${p.numberHeight}px`,
			`top:${p.numberTop}px`,
		].join(';');
	});

	let show = $state(false);
	let oncomplete = $state(() => {});

	const dismiss = () => oncomplete();

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => {
			show = true;
			stateGame.freeSpinIntroActive = true;
		},
		freeSpinIntroHide: () => {
			show = false;
			stateGame.freeSpinIntroActive = false;
		},
		freeSpinIntroUpdate: async () => {
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

{#if show}
	<div
		class="overlay"
		data-test="free-spin-intro-overlay"
		transition:fade={{ duration: 200 }}
		onclick={dismiss}
		onkeydown={(e) => e.key === 'Enter' && dismiss()}
		role="button"
		tabindex="0"
	>
		<div class="panel" style={panelStyle}>
			<img class="board" src={boardUrl} alt="" draggable="false" />
			<img class="number" src={numberUrl} alt="" draggable="false" style={numberStyle} />
		</div>

		<PressToContinueHtml />
	</div>
{/if}

<OnHotkey hotkey="Space" disabled={!show} onpress={dismiss} />

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		cursor: pointer;
		background: rgba(0, 0, 0, 0.5);
	}

	.panel {
		position: fixed;
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.board {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		user-select: none;
		pointer-events: none;
	}

	.number {
		position: absolute;
		left: 50%;
		transform: translate(-50%, -50%);
		object-fit: contain;
		user-select: none;
		pointer-events: none;
		transform-origin: center center;
		will-change: transform;
		animation: fs-cong-number-idle 2800ms infinite ease-in-out;
	}

	@keyframes fs-cong-number-idle {
		0%,
		100% {
			transform: translate(-50%, calc(-50% + 0px)) scale(1);
		}

		52.4% {
			transform: translate(-50%, calc(-50% - 4.5px)) scale(1.2);
		}
	}
</style>
