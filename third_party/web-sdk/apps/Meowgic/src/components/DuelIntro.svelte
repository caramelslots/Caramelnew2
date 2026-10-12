<script lang="ts" module>
	export type EmitterEventDuelIntro =
		| { type: 'duelIntroShow' }
		| { type: 'duelIntroHide' }
		| {
				type: 'duelIntroUpdate';
				totalSpinsPerSide: number;
				playerSide?: 'cat' | 'dog';
		  };
</script>

<script lang="ts">
	import { OnHotkey } from 'components-shared';
	import { waitForResolve } from 'utils-shared/wait';

	import {
		BOARD_DIMENSIONS,
		SYMBOL_SIZE,
		isPopoutSmallViewport,
		resolveBoardLayoutOffset,
	} from '../game/constants';
	import assets from '../game/assets';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import PressToContinueHtml from './PressToContinueHtml.svelte';

	const context = getContext();

	const bgUrl = assets.fsCongBg.src;
	const frameUrl = assets.fsCongFrame.src;

	/** Same artboard / panel sizing as FreeSpinIntro (fsCong 2000×1500). */
	const BOARD_RATIO = 2000 / 1500;
	const BOARD_SCALE = 1.9;
	const BOARD_SCALE_PORTRAIT = 2.05;

	/** Vertical centres of each line inside the plaque (vs panel height) — same % on every screen. */
	const RULE_CAT_Y_RATIO = 0.335;
	const RULE_DOG_Y_RATIO = 0.445;
	const DIVIDER_Y_RATIO = 0.51;
	const RULE_WINNER_Y_RATIO = 0.575;

	/** Font size as a fraction of panel width (same approach as FS FREE SPINS / YOU WON). */
	const RULE_SIZE_RATIO = 0.048;
	const WINNER_SIZE_RATIO = 0.05;
	/** Popout S — slightly smaller base so long EN lines clear the gold frame. */
	const RULE_SIZE_RATIO_POPOUT_S = 0.032;
	const WINNER_SIZE_RATIO_POPOUT_S = 0.034;
	/**
	 * Max text width as a fraction of panel width before scale-fit.
	 * Tight enough to stay inside the burgundy plate (not the outer gold frame).
	 */
	const RULE_MAX_WIDTH_RATIO = 0.5;
	const RULE_MAX_WIDTH_RATIO_POPOUT_S = 0.48;
	const MIN_FIT_SCALE = 0.4;

	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));

	const panelLayout = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const layoutType = context.stateLayoutDerived.layoutType();
		const canvas = context.stateLayoutDerived.canvasSizes();
		const off = resolveBoardLayoutOffset(layoutType, canvas);
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const isPortrait = layoutType === 'portrait';
		const popoutS = isPopoutSmallViewport({
			width: canvas.width,
			height: canvas.height,
		});

		const panelWidth =
			SYMBOL_SIZE *
			BOARD_DIMENSIONS.x *
			(isPortrait ? BOARD_SCALE_PORTRAIT : BOARD_SCALE) *
			ml.scale;
		const panelHeight = panelWidth / BOARD_RATIO;
		const ruleSizeRatio = popoutS ? RULE_SIZE_RATIO_POPOUT_S : RULE_SIZE_RATIO;
		const winnerSizeRatio = popoutS ? WINNER_SIZE_RATIO_POPOUT_S : WINNER_SIZE_RATIO;
		const maxWidthRatio = popoutS ? RULE_MAX_WIDTH_RATIO_POPOUT_S : RULE_MAX_WIDTH_RATIO;

		return {
			centerX,
			centerY,
			panelWidth,
			panelHeight,
			isPortrait,
			popoutS,
			ruleSizeRatio,
			winnerSizeRatio,
			maxWidthRatio,
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

	let show = $state(false);
	let oncomplete = $state(() => {});
	let catEl = $state<HTMLParagraphElement | undefined>();
	let dogEl = $state<HTMLParagraphElement | undefined>();
	let winnerEl = $state<HTMLParagraphElement | undefined>();
	let catFitScale = $state(1);
	let dogFitScale = $state(1);
	let winnerFitScale = $state(1);

	const ruleCat = $derived(context.i18nDerived.duelIntroRule1());
	const ruleDog = $derived(context.i18nDerived.duelIntroRule2());
	const ruleWinner = $derived(context.i18nDerived.duelIntroRule3());

	const ruleCatStyle = $derived.by(() => {
		const p = panelLayout;
		const fontPx = Math.max(12, Math.round(p.panelWidth * p.ruleSizeRatio));
		return [
			`top:${p.panelHeight * RULE_CAT_Y_RATIO}px`,
			`font-size:${fontPx}px`,
			`transform:translate(-50%, -50%) scale(${catFitScale})`,
		].join(';');
	});

	const ruleDogStyle = $derived.by(() => {
		const p = panelLayout;
		const fontPx = Math.max(12, Math.round(p.panelWidth * p.ruleSizeRatio));
		return [
			`top:${p.panelHeight * RULE_DOG_Y_RATIO}px`,
			`font-size:${fontPx}px`,
			`transform:translate(-50%, -50%) scale(${dogFitScale})`,
		].join(';');
	});

	const dividerStyle = $derived.by(() => {
		const p = panelLayout;
		return `top:${p.panelHeight * DIVIDER_Y_RATIO}px`;
	});

	const ruleWinnerStyle = $derived.by(() => {
		const p = panelLayout;
		const fontPx = Math.max(12, Math.round(p.panelWidth * p.winnerSizeRatio));
		return [
			`top:${p.panelHeight * RULE_WINNER_Y_RATIO}px`,
			`font-size:${fontPx}px`,
			`transform:translate(-50%, -50%) scale(${winnerFitScale})`,
		].join(';');
	});

	/** Same fit as FreeSpinIntro YOU WON / FREE SPINS banner. */
	const refitLine = (
		el: HTMLParagraphElement | undefined,
		setScale: (scale: number) => void,
	) => {
		if (!el) return;
		el.style.transform = 'translate(-50%, -50%) scale(1)';
		const limit = panelLayout.panelWidth * panelLayout.maxWidthRatio;
		const width = el.scrollWidth;
		setScale(width > limit ? Math.max(MIN_FIT_SCALE, limit / width) : 1);
	};

	$effect(() => {
		if (!show) return;
		void ruleCat;
		void ruleDog;
		void ruleWinner;
		void panelLayout.panelWidth;
		void panelLayout.maxWidthRatio;
		void isPopoutSmall;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				refitLine(catEl, (s) => (catFitScale = s));
				refitLine(dogEl, (s) => (dogFitScale = s));
				refitLine(winnerEl, (s) => (winnerFitScale = s));
			});
		});
	});

	const dismiss = () => oncomplete();

	context.eventEmitter.subscribeOnMount({
		duelIntroShow: () => {
			context.eventEmitter.broadcast({ type: 'duelPickWarm' });
			catFitScale = 1;
			dogFitScale = 1;
			winnerFitScale = 1;
			show = true;
			stateGame.duelIntroActive = true;
		},
		duelIntroHide: () => {
			show = false;
			stateGame.duelIntroActive = false;
		},
		duelIntroUpdate: async () => {
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

{#if show}
	<div
		class="overlay"
		data-test="duel-intro-overlay"
		onclick={dismiss}
		onkeydown={(e) => e.key === 'Enter' && dismiss()}
		role="button"
		tabindex="0"
	>
		<div class="dim" aria-hidden="true"></div>
		<div class="panel" style={panelStyle}>
			<img class="layer layer-bg" src={bgUrl} alt="" draggable="false" loading="eager" />
			<img class="layer layer-frame" src={frameUrl} alt="" draggable="false" loading="eager" />

			<div class="copy" role="dialog" aria-modal="true" aria-label={ruleWinner}>
				<p class="rule-line" bind:this={catEl} style={ruleCatStyle}>{ruleCat}</p>
				<p class="rule-line" bind:this={dogEl} style={ruleDogStyle}>{ruleDog}</p>
				<div class="rule-divider" style={dividerStyle} aria-hidden="true"></div>
				<p
					class="rule-line rule-line--winner"
					bind:this={winnerEl}
					style={ruleWinnerStyle}
				>
					{ruleWinner}
				</p>
			</div>
		</div>

		<PressToContinueHtml />
	</div>
{/if}

<OnHotkey hotkey="Space" disabled={!show} onpress={dismiss} />

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 70;
		cursor: pointer;
		background: transparent;
	}

	.dim {
		position: absolute;
		inset: 0;
		z-index: 0;
		background: rgba(0, 0, 0, 0.62);
		pointer-events: none;
	}

	/* Same panel mount as FreeSpinIntro — fixed + translate(-50%, -50%). */
	.panel {
		position: fixed;
		z-index: 1;
		transform: translate(-50%, -50%);
		pointer-events: none;
		filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.75));
	}

	.layer {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		user-select: none;
		pointer-events: none;
	}

	.layer-bg {
		z-index: 0;
	}

	.layer-frame {
		z-index: 1;
	}

	.copy {
		position: absolute;
		inset: 0;
		z-index: 2;
	}

	/* Same face + fit pattern as FreeSpinIntro YOU WON / FREE SPINS. */
	.rule-line {
		position: absolute;
		left: 50%;
		margin: 0;
		padding: 0;
		width: max-content;
		text-align: center;
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: 0.02em;
		white-space: nowrap;
		transform-origin: center center;
		user-select: none;
		pointer-events: none;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 3px 0 #5a3a0e)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}

	.rule-line--winner {
		letter-spacing: 0.05em;
		text-transform: uppercase;
		line-height: 1.1;
	}

	.rule-divider {
		position: absolute;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 36%;
		height: 2px;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 210, 110, 0.15) 12%,
			rgba(255, 220, 130, 0.9) 50%,
			rgba(255, 210, 110, 0.15) 88%,
			transparent 100%
		);
		box-shadow: 0 0 12px rgba(255, 190, 60, 0.35);
		pointer-events: none;
	}
</style>
