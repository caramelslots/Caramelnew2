<script lang="ts" module>
	export type FreeSpinIntroMode = 'award' | 'extra';

	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| {
				type: 'freeSpinIntroUpdate';
				totalFreeSpins: number;
				/** `extra` = +N and EXTRA SPINS (mid/end bonus awards). */
				mode?: FreeSpinIntroMode;
		  };
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
		FONT_KRUTOI_VI,
		FONT_PROSTOI_WHITE_CJK,
		FONT_PROSTOI_WHITE,
		FONT_PROSTOI_WHITE_RU,
		LOCALE_TEXT_FILL_GOLD,
		SYMBOL_SIZE,
	} from '../game/constants';
	import assets from '../game/assets';
	import { getFsOutroCongratulationsText, getFsOutroYouWonText } from '../game/fsOutroBannerText';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import FsIntroBannerLabel from './FsIntroBannerLabel.svelte';
	import PressToContinueHtml from './PressToContinueHtml.svelte';

	const context = getContext();

	const raysUrl = assets.fsCongRays.src;
	const bgUrl = assets.fsCongBg.src;
	const frameUrl = assets.fsCongFrame.src;
	const boardEmptyUrl = assets.fsCongBoard.src;
	const boardLabeledUrl = assets.fsCongBoardLabeled.src;

	/** Designer canvas 2000×1500 — all FS_* layers share this artboard. */
	const BOARD_RATIO = 2000 / 1500;
	/** On-screen plaque size (lower = smaller modal). */
	const BOARD_SCALE = 1.9;
	/** Keep phone modal a bit larger than desktop/tablet. */
	const BOARD_SCALE_PORTRAIT = 2.05;
	// Layout vs 2000×1500 art: congrats under top arch, YOU WON on frame needles
	// (y≈553), number in plaque centre, FREE SPINS on the gem banner (y≈943).
	const CONGRATULATIONS_Y_RATIO = 0.282;
	const YOU_WON_Y_RATIO = 0.348;
	const NUMBER_Y_RATIO = 0.462;
	/** Slightly lower on phones so the digit sits better in the plaque. */
	const NUMBER_Y_RATIO_PORTRAIT = 0.485;
	const FREE_SPINS_Y_RATIO = 0.629;
	/** Number glyph size vs panel width (this is what you tweak). */
	const NUMBER_FONT_RATIO = 0.14;
	const NUMBER_FONT_RATIO_PORTRAIT = 0.11;
	/** Same face as FREE SPINS (proxima-nova) — size/arc tuned to designer FS art. */
	const CONGRATULATIONS_SIZE_RATIO = 0.048;
	const CONGRATULATIONS_CHORD_RATIO = 0.5;
	/** Smooth bow following the frame crest. */
	const CONGRATULATIONS_ARCH_DEG = 76;
	/** Tight kerning — letter sides nearly touch (designer look). */
	const CONGRATULATIONS_TRACKING = 0.2;

	const panelLayout = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const layoutType = context.stateLayoutDerived.layoutType();
		const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
		const centerX = ml.x + off.x * ml.scale;
		const centerY = ml.y + off.y * ml.scale;
		const isPortrait = layoutType === 'portrait';

		const panelWidth =
			SYMBOL_SIZE * BOARD_DIMENSIONS.x * (isPortrait ? BOARD_SCALE_PORTRAIT : BOARD_SCALE) * ml.scale;
		const panelHeight = panelWidth / BOARD_RATIO;
		const numberFontRatio = isPortrait ? NUMBER_FONT_RATIO_PORTRAIT : NUMBER_FONT_RATIO;
		const numberFontPx = Math.max(20, Math.round(panelWidth * numberFontRatio));

		return {
			centerX,
			centerY,
			panelWidth,
			panelHeight,
			layoutScale: ml.scale,
			isPortrait,
			numberFontPx,
			numberTop: panelHeight * (isPortrait ? NUMBER_Y_RATIO_PORTRAIT : NUMBER_Y_RATIO),
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
		return [`top:${p.numberTop}px`, `font-size:${p.numberFontPx}px`].join(';');
	});

	const freeSpinsStyle = $derived.by(() => {
		const p = panelLayout;
		const fontPx = Math.max(14, Math.round(p.panelWidth * 0.042));
		return [
			`top:${p.panelHeight * FREE_SPINS_Y_RATIO}px`,
			`font-size:${fontPx}px`,
			`max-width:${p.panelWidth * 0.38}px`,
		].join(';');
	});

	const congratulationsStyle = $derived.by(() => {
		const p = panelLayout;
		const fontPx = Math.max(14, Math.round(p.panelWidth * CONGRATULATIONS_SIZE_RATIO));
		return [`top:${p.panelHeight * CONGRATULATIONS_Y_RATIO}px`, `font-size:${fontPx}px`].join(';');
	});

	let show = $state(false);
	let totalFreeSpins = $state(10);
	let introMode = $state<FreeSpinIntroMode>('award');
	let oncomplete = $state(() => {});

	const lang = $derived(stateUrlDerived.lang());
	const congratulationsText = $derived(getFsOutroCongratulationsText(lang));
	const youWonText = $derived(getFsOutroYouWonText(lang));
	const freeSpinsText = $derived(context.i18nDerived.fsRemaining());
	const extraSpinsText = $derived(context.i18nDerived.extraSpins());
	const isExtraMode = $derived(introMode === 'extra');
	const bannerLabel = $derived(isExtraMode ? extraSpinsText : freeSpinsText);
	/** Designer FS_BOARD_2 has English "FREE SPINS" baked in — only for award mode. */
	const useBakedFreeSpinsLabel = $derived(
		!isExtraMode && freeSpinsText.trim().toUpperCase() === 'FREE SPINS',
	);
	const boardUrl = $derived(useBakedFreeSpinsLabel ? boardLabeledUrl : boardEmptyUrl);
	/** Always overlay banner text in extra mode (or non-EN award). */
	const showBannerLabel = $derived(isExtraMode || !useBakedFreeSpinsLabel);

	/** Proxima-nova on a circular arc — spaced by glyph width so the bow stays smooth. */
	const congratulationsGlyphs = $derived.by(() => {
		const chars = Array.from(congratulationsText);
		const n = chars.length;
		if (n === 0) return [] as { char: string; x: number; y: number; rot: number }[];

		const p = panelLayout;
		const fontPx = Math.max(14, Math.round(p.panelWidth * CONGRATULATIONS_SIZE_RATIO));
		const chord = p.panelWidth * CONGRATULATIONS_CHORD_RATIO;
		const halfRad = (CONGRATULATIONS_ARCH_DEG * Math.PI) / 360;
		const radius = halfRad > 0.001 ? chord / (2 * Math.sin(halfRad)) : chord;

		// Measure advances so wide letters (A, O) don't flatten the mid-arc.
		const widths: number[] = [];
		if (typeof document !== 'undefined') {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.font = `800 ${fontPx}px proxima-nova, sans-serif`;
				for (const char of chars) {
					const raw = Math.max(ctx.measureText(char === ' ' ? '\u00a0' : char).width, fontPx * 0.2);
					widths.push(raw * CONGRATULATIONS_TRACKING);
				}
			}
		}
		if (widths.length !== n) {
			for (let i = 0; i < n; i++) widths.push(1);
		}

		const total = widths.reduce((s, w) => s + w, 0);
		let cursor = 0;
		return chars.map((char, i) => {
			const w = widths[i]!;
			const mid = total > 0 ? (cursor + w * 0.5) / total : 0.5;
			cursor += w;
			const phi = -halfRad + mid * 2 * halfRad;
			return {
				char,
				x: radius * Math.sin(phi),
				y: radius * (1 - Math.cos(phi)),
				rot: (phi * 180) / Math.PI,
			};
		});
	});

	const dismiss = () => oncomplete();

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => {
			show = true;
			stateGame.freeSpinIntroActive = true;
		},
		freeSpinIntroHide: () => {
			show = false;
			stateGame.freeSpinIntroActive = false;
			introMode = 'award';
		},
		freeSpinIntroUpdate: async (event) => {
			totalFreeSpins = event.totalFreeSpins;
			introMode = event.mode === 'extra' ? 'extra' : 'award';
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
			<img class="layer layer-rays" src={raysUrl} alt="" draggable="false" />
			<img class="layer layer-bg" src={bgUrl} alt="" draggable="false" />
			<img class="layer layer-frame" src={frameUrl} alt="" draggable="false" />
			<img class="layer layer-board" src={boardUrl} alt="" draggable="false" />

			<div class="copy">
				<div class="congratulations" style={congratulationsStyle} aria-label={congratulationsText}>
					{#each congratulationsGlyphs as glyph, i (i)}
						<span
							class="arch-char"
							style="transform:translate(-50%, -50%) translate({glyph.x}px, {glyph.y}px) rotate({glyph.rot}deg)"
							>{glyph.char === ' ' ? '\u00a0' : glyph.char}</span
						>
					{/each}
				</div>
				<FsIntroBannerLabel
					text={youWonText}
					fontKrutoi={FONT_KRUTOI}
					fontKrutoiRu={FONT_KRUTOI_RU}
					fontProstoi={FONT_PROSTOI_WHITE}
					fontProstoiRu={FONT_PROSTOI_WHITE_RU}
					fontProstoiHi={FONT_PROSTOI_HI}
					fontProstoiVi={FONT_KRUTOI_VI}
					fontLocaleCjk={FONT_PROSTOI_WHITE_CJK}
					sizeRatio={0.04}
					yRatio={YOU_WON_Y_RATIO}
					maxWidthRatio={0.3}
					panelWidth={panelLayout.panelWidth}
					panelHeight={panelLayout.panelHeight}
					layoutScale={panelLayout.layoutScale}
					fallbackFill={LOCALE_TEXT_FILL_GOLD}
				/>
				<div
					class="number"
					class:number--extra={isExtraMode}
					style={numberStyle}
					aria-label={isExtraMode
						? `+${totalFreeSpins} extra spins`
						: `${totalFreeSpins} free spins`}
				>
					{#if isExtraMode}<span class="number-plus">+</span>{/if}{totalFreeSpins}
				</div>
				{#if showBannerLabel}
					<p class="free-spins" style={freeSpinsStyle}>{bannerLabel}</p>
				{/if}
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
		/* Above TargetPickOverlay (60) so congrats sits over the sliding board. */
		z-index: 70;
		cursor: pointer;
		background: rgba(0, 0, 0, 0.5);
	}

	.panel {
		position: fixed;
		transform: translate(-50%, -50%);
		pointer-events: none;
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

	.layer-rays {
		z-index: 0;
		animation: fs-cong-rays-spin 48s linear infinite;
	}

	.layer-bg {
		z-index: 1;
	}

	.layer-frame {
		z-index: 2;
	}

	.layer-board {
		z-index: 3;
	}

	.copy {
		position: absolute;
		inset: 0;
		z-index: 4;
	}

	.congratulations {
		position: absolute;
		left: 50%;
		width: 0;
		height: 0;
		transform: translate(-50%, -50%);
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
		line-height: 1;
		user-select: none;
		pointer-events: none;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 3px 0 #5a3a0e)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}

	.arch-char {
		position: absolute;
		left: 0;
		top: 0;
		display: block;
		white-space: pre;
		transform-origin: center center;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.number {
		position: absolute;
		left: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		width: max-content;
		transform: translate(-50%, -50%);
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		line-height: 1;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 3px 0 #5a3a0e)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
		user-select: none;
		pointer-events: none;
		transform-origin: center center;
		will-change: transform;
		animation: fs-cong-number-idle 2800ms infinite ease-in-out;
	}

	.number-plus {
		margin-right: 0.06em;
	}

	.free-spins {
		position: absolute;
		left: 50%;
		margin: 0;
		padding: 0;
		transform: translate(-50%, -50%);
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		letter-spacing: 0.06em;
		line-height: 1;
		text-align: center;
		text-transform: uppercase;
		white-space: nowrap;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 2px 0 #5a3a0e)
			drop-shadow(0 5px 8px rgba(0, 0, 0, 0.5));
		user-select: none;
		pointer-events: none;
	}

	@keyframes fs-cong-rays-spin {
		from {
			transform: rotate(0deg);
		}

		to {
			transform: rotate(360deg);
		}
	}

	@keyframes fs-cong-number-idle {
		0%,
		100% {
			transform: translate(-50%, calc(-50% + 0px)) scale(1);
		}

		52.4% {
			transform: translate(-50%, calc(-50% - 4.5px)) scale(1.12);
		}
	}
</style>
