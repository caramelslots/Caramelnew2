<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { fade } from 'svelte/transition';
	import { OnHotkey } from 'components-shared';
	import { stateUrlDerived } from 'state-shared';
	import { waitForResolve } from 'utils-shared/wait';

	import {
		BOARD_DIMENSIONS,
		BOARD_LAYOUT_OFFSETS,
		FONT_KRUTOI,
		FONT_KRUTOI_RU,
		FONT_PROSTOI_HI,
		FONT_PROSTOI_VI,
		FONT_KRUTOI_VI,
		FONT_KRUTOI_CJK,
		FONT_PROSTOI_WHITE_CJK,
		FONT_PROSTOI_WHITE,
		FONT_PROSTOI_WHITE_RU,
		LOCALE_TEXT_FILL_GOLD,
		LOCALE_TEXT_FILL_WHITE,
		SYMBOL_SIZE,
	} from '../game/constants';
	import assets from '../game/assets';
	import { getFsOutroCongratulationsText, getFsOutroYouWonText } from '../game/fsOutroBannerText';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import FsIntroBannerLabel from './FsIntroBannerLabel.svelte';
	import PressToContinueHtml from './PressToContinueHtml.svelte';

	const context = getContext();

	const boardUrl = assets.fsCongBoard.src;

	// поздравление фриспины.png — 1536×1024, same canvas as legacy fs_cong.
	const BOARD_RATIO = 1536 / 1024;
	const NUMBER_RATIO = 1276 / 595;
	const BOARD_SCALE = 1.55;
	// Layout tuned to legacy fs_cong art: congrats on wood (below roof),
	// YOU WON / number / FREE SPINS stacked in the wood panel centre.
	const TEXT_BLOCK_Y_OFFSET = 0.045;
	const CONGRATULATIONS_Y_RATIO = 0.31 + TEXT_BLOCK_Y_OFFSET;
	const YOU_WON_Y_RATIO = 0.42 + TEXT_BLOCK_Y_OFFSET;
	const NUMBER_Y_RATIO = 0.58 + TEXT_BLOCK_Y_OFFSET;
	const FREE_SPINS_Y_RATIO = 0.7 + TEXT_BLOCK_Y_OFFSET;
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
			layoutScale: ml.scale,
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
		return [`width:${p.numberWidth}px`, `height:${p.numberHeight}px`, `top:${p.numberTop}px`].join(
			';',
		);
	});

	const lang = $derived(stateUrlDerived.lang());
	const congratulationsText = $derived(getFsOutroCongratulationsText(lang));
	const youWonText = $derived(getFsOutroYouWonText(lang));
	const freeSpinsText = $derived(context.i18nDerived.fsRemaining());

	let show = $state(false);
	let totalFreeSpins = $state(10);
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
		freeSpinIntroUpdate: async (event) => {
			totalFreeSpins = event.totalFreeSpins;
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

			<FsIntroBannerLabel
				text={congratulationsText}
				fontKrutoi={FONT_KRUTOI}
				fontKrutoiRu={FONT_KRUTOI_RU}
				fontProstoi={FONT_PROSTOI_WHITE}
				fontProstoiRu={FONT_PROSTOI_WHITE_RU}
				fontProstoiHi={FONT_PROSTOI_HI}
				fontProstoiVi={FONT_KRUTOI_VI}
				fontLocaleCjk={FONT_KRUTOI_CJK}
				useKrutoi
				sizeRatio={0.066}
				yRatio={CONGRATULATIONS_Y_RATIO}
				maxWidthRatio={0.64}
				minScale={0.48}
				panelWidth={panelLayout.panelWidth}
				panelHeight={panelLayout.panelHeight}
				layoutScale={panelLayout.layoutScale}
				fallbackFill={LOCALE_TEXT_FILL_GOLD}
			/>
			<FsIntroBannerLabel
				text={youWonText}
				fontKrutoi={FONT_KRUTOI}
				fontKrutoiRu={FONT_KRUTOI_RU}
				fontProstoi={FONT_PROSTOI_WHITE}
				fontProstoiRu={FONT_PROSTOI_WHITE_RU}
				fontProstoiHi={FONT_PROSTOI_HI}
				fontProstoiVi={FONT_KRUTOI_VI}
				fontLocaleCjk={FONT_PROSTOI_WHITE_CJK}
				sizeRatio={0.046}
				yRatio={YOU_WON_Y_RATIO}
				maxWidthRatio={0.68}
				panelWidth={panelLayout.panelWidth}
				panelHeight={panelLayout.panelHeight}
				layoutScale={panelLayout.layoutScale}
				fallbackFill={LOCALE_TEXT_FILL_WHITE}
			/>
			<div class="number" style={numberStyle} aria-label={`${totalFreeSpins} free spins`}>
				{totalFreeSpins}
			</div>
			<FsIntroBannerLabel
				text={freeSpinsText}
				fontKrutoi={FONT_KRUTOI}
				fontKrutoiRu={FONT_KRUTOI_RU}
				fontProstoi={FONT_PROSTOI_WHITE}
				fontProstoiRu={FONT_PROSTOI_WHITE_RU}
				fontProstoiHi={FONT_PROSTOI_HI}
				fontProstoiVi={FONT_KRUTOI_VI}
				fontLocaleCjk={FONT_PROSTOI_WHITE_CJK}
				sizeRatio={0.044}
				yRatio={FREE_SPINS_Y_RATIO}
				maxWidthRatio={0.68}
				panelWidth={panelLayout.panelWidth}
				panelHeight={panelLayout.panelHeight}
				layoutScale={panelLayout.layoutScale}
				fallbackFill={LOCALE_TEXT_FILL_WHITE}
			/>
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
		display: flex;
		align-items: center;
		justify-content: center;
		transform: translate(-50%, -50%);
		font-family: 'proxima-nova', sans-serif;
		font-size: clamp(2.4rem, 6vw, 4.2rem);
		font-weight: 800;
		line-height: 1;
		color: #f0d78c;
		text-shadow: 0 3px 0 #3a2a12, 0 6px 12px rgba(0, 0, 0, 0.45);
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
