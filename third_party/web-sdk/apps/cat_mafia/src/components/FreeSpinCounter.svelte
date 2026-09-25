<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<!--
	Desktop FS spinboard (left of board) — proxima-nova + gold face
	matching under-board WIN. Portrait uses FreeSpinCounterPortraitHtml.
-->
<script lang="ts">
	import assets from '../game/assets';
	import { getContext } from '../game/context';
	import { getDesktopFsCounterScreenBox } from '../game/fsCounterLayout';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import { hudWinDimStyle } from '../game/hudWinDim';
	import { getContextLayout } from 'utils-layout';
	import { devPreview } from '../game/devPreview.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const isPortrait = $derived(stateLayoutDerived.layoutType() === 'portrait');

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);

	const forceShow = $derived(devPreview.forceShowFsBoardChrome);
	const visible = $derived(
		(show || forceShow) &&
			!isPortrait &&
			gameEntrance.showContent &&
			!stateGame.fsOutroActive,
	);
	const winDimStyle = $derived(hudWinDimStyle());

	const box = $derived(
		getDesktopFsCounterScreenBox({
			mainLayout: context.stateLayoutDerived.mainLayout(),
			boardLayout: context.stateGameDerived.boardLayout(),
		}),
	);

	const spinboardUrl = assets.fsLeftCounterSpinboard.src;
	const titleText = $derived(context.i18nDerived.fsCounterLabel());
	const counterText = $derived(context.i18nDerived.fsCounterText(current, total));

	const MIN_TITLE_SCALE = 0.45;

	const measureLinePx = (text: string, fontSize: number) => {
		if (typeof document === 'undefined' || fontSize <= 0 || !text) return 0;
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return text.length * fontSize * 0.55;
		ctx.font = `800 ${fontSize}px proxima-nova, sans-serif`;
		return Math.ceil(ctx.measureText(text).width);
	};

	/** Shrink Free Spins label only — counter digits stay full size. */
	const titleScale = $derived.by(() => {
		const fontSize = box.fontSize;
		const titleW = Math.max(measureLinePx(titleText, fontSize), 1);
		return Math.min(Math.max(box.maxTextWidth / titleW, MIN_TITLE_SCALE), 1);
	});

	$effect(() => {
		if (!forceShow) return;
		if (total <= 0) {
			current = 3;
			total = 10;
		}
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

{#if visible}
	<div
		class="fs-left-counter"
		style:left="{box.left}px"
		style:top="{box.top}px"
		style:width="{box.width}px"
		style:height="{box.height}px"
		style:background-image="url('{spinboardUrl}')"
		style:--fs-counter-font="{box.fontSize}px"
		style:--fs-title-scale={titleScale}
		style:--fs-counter-text-left="{box.textLeft}px"
		style:--fs-counter-text-top="{box.textTop}px"
		style={winDimStyle}
		data-test="fs-counter-desktop"
		aria-label="{titleText} {counterText}"
		aria-hidden="true"
	>
		<div class="fs-left-counter-copy">
			<span class="fs-left-counter-title">{titleText}</span>
			<span class="fs-left-counter-value">{counterText}</span>
		</div>
	</div>
{/if}

<style lang="scss">
	.fs-left-counter {
		position: fixed;
		z-index: 41;
		pointer-events: none;
		box-sizing: border-box;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-position: center;
		user-select: none;
	}

	.fs-left-counter-copy {
		position: absolute;
		left: var(--fs-counter-text-left);
		top: var(--fs-counter-text-top);
		display: flex;
		flex-direction: column;
		align-items: center;
		transform: translate(-50%, -50%);
		line-height: 1;
		/* Same gold face as under-board WIN (`WinHudHtmlOverlay`). */
		filter: drop-shadow(0 1px 0 #e8c878) drop-shadow(0 3px 0 #4a3008)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}

	.fs-left-counter-title,
	.fs-left-counter-value {
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		font-size: var(--fs-counter-font);
		letter-spacing: 0.02em;
		text-transform: uppercase;
		white-space: nowrap;
		color: #e8b84a;
		background: linear-gradient(180deg, #f0d070 0%, #e0a838 38%, #c07014 72%, #8a4e0c 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.fs-left-counter-title {
		transform: scale(var(--fs-title-scale));
		transform-origin: center bottom;
	}

	.fs-left-counter-value {
		margin-top: 0.18em;
		font-variant-numeric: tabular-nums lining-nums;
		font-feature-settings: 'tnum' 1, 'lnum' 1;
	}
</style>
