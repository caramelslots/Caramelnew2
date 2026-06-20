<!--
	CashStacksMenuOverlay.svelte — меню настроек (турбо, звук, музыка)
	по designer_assets/бекг.png и связанным иконкам/слайдеру.
	Координаты строк выверены по PNG (слоты x 38.5–75.3%, иконки слева).
-->
<script lang="ts">
	import { scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { stateUi, stateBet, stateSound, stateModal } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import { getContext } from '../game/context';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { computeMenuPanelAnchor } from '../game/popupHudLayout';
	import { computeDesktopHudLayout, resolveDesktopHudConfig } from '../game/desktopHudLayout';
	import { computePortraitHudCanvas } from '../game/portraitHudLayout';
	import { stateGame } from '../game/stateGame.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPortrait = $derived(layoutType === 'portrait');
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);
	const panelAnchor = $derived(computeMenuPanelAnchor(stateLayoutDerived));
	const panelWidth = $derived(panelAnchor.width);

	const menuButtonHit = $derived.by(() => {
		if (isPortrait) {
			const hud = computePortraitHudCanvas(stateLayoutDerived);
			return {
				left: hud.util.x.menu,
				top: hud.util.centerY,
				size: hud.util.iconSize,
			};
		}

		const hud = computeDesktopHudLayout(
			stateLayoutDerived,
			resolveDesktopHudConfig(isPopoutSmall),
		);
		return {
			left: hud.menu.x,
			top: hud.menu.y,
			size: hud.menu.size,
		};
	});

	const closeFromMenuButton = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = false;
	};

	const assetBase = `${import.meta.env.BASE_URL}assets/sprites/ui`;
	const settingsAssetBase = `${assetBase}/settings`;
	const bgUrl = `${settingsAssetBase}/bg_settings_panel.png`;
	const soundIconUrls = {
		off: `${settingsAssetBase}/sound_off.png`,
		low: `${settingsAssetBase}/sound_low.png`,
		mid: `${settingsAssetBase}/sound_mid.png`,
		high: `${settingsAssetBase}/sound_high.png`,
	} as const;
	const sliderEmptyUrl = `${settingsAssetBase}/slider_empty.png`;
	const sliderFullUrl = `${settingsAssetBase}/slider_full.png`;
	const sliderKnobUrl = `${settingsAssetBase}/slider_knob.png`;
	const musicOnUrl = `${settingsAssetBase}/music_on.png`;
	const musicOffUrl = `${settingsAssetBase}/music_off.png`;
	const turboUrls = [
		`${settingsAssetBase}/turbo_1.png`,
		`${settingsAssetBase}/turbo_2.png`,
		`${settingsAssetBase}/turbo_3.png`,
	] as const;

	const PANEL_IN_MS = 400;
	const PANEL_OUT_MS = 240;

	const isOpen = $derived(stateUi.menuOpen);
	const volumeProgress = $derived(stateSound.volumeValueMaster / 100);
	const musicProgress = $derived(stateSound.volumeValueMusic / 100);
	const soundIconUrl = $derived.by(() => {
		const volume = stateSound.volumeValueMaster;
		if (volume === 0) return soundIconUrls.off;
		if (volume > 60) return soundIconUrls.high;
		if (volume > 30) return soundIconUrls.mid;
		return soundIconUrls.low;
	});
	const musicIconUrl = $derived(
		stateSound.volumeValueMusic === 0 ? musicOffUrl : musicOnUrl,
	);

	/** Row icons — panel-local px (scale with panel, crisp at rest on resize). */
	const MENU_ROW_ICON_CENTER_X = 0.285;
	const MENU_ROW_ICON_SIZE = 0.12;
	const MENU_ROW_HEIGHT = 0.085;

	const rowIcons = $derived.by(() => {
		const w = panelWidth;
		const size = Math.round(w * MENU_ROW_ICON_SIZE);
		const rowCenter = (top: number) => Math.round(w * (top + MENU_ROW_HEIGHT / 2));

		return {
			turbo: {
				x: Math.round(w * MENU_ROW_ICON_CENTER_X),
				y: rowCenter(0.355),
				size,
				url: turboUrls[stateGame.gameSpeed - 1],
				label: 'Game speed',
			},
			volume: {
				x: Math.round(w * MENU_ROW_ICON_CENTER_X),
				y: rowCenter(0.48),
				size,
				url: soundIconUrl,
				label: 'Master volume',
			},
			music: {
				x: Math.round(w * MENU_ROW_ICON_CENTER_X),
				y: rowCenter(0.605),
				size,
				url: musicIconUrl,
				label: 'Music',
			},
		};
	});

	$effect(() => {
		if (isOpen && stateModal.modal?.name === 'autoSpin') {
			stateModal.modal = null;
		}
	});

	const playClick = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const setSpeed = (level: 1 | 2 | 3) => {
		if (stateGame.gameSpeed === level) return;
		stateGame.gameSpeed = level;
		stateBet.isTurbo = level > 1;
		playClick();
	};

	const setSliderValue = (
		el: HTMLDivElement | undefined,
		clientX: number,
		setValue: (value: number) => void,
	) => {
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const thumbPx = rect.height * (48 / 95);
		const usable = Math.max(1, rect.width - thumbPx);
		const ratio = (clientX - rect.left - thumbPx * 0.5) / usable;
		const clamped = Math.max(0, Math.min(1, ratio));
		setValue(Math.round(clamped * 100));
	};

	const setMusicSliderValue = (
		el: HTMLDivElement | undefined,
		clientX: number,
		setValue: (value: number) => void,
	) => {
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const ratio = (clientX - rect.left) / rect.width;
		const clamped = Math.max(0, Math.min(1, ratio));
		setValue(Math.round(clamped * 100));
	};

	let volumeEl: HTMLDivElement | undefined = $state(undefined);
	let musicEl: HTMLDivElement | undefined = $state(undefined);
	let isVolumeDragging = $state(false);
	let isMusicDragging = $state(false);

	const setMasterVolume = (value: number) => {
		stateSound.volumeValueMaster = value;
	};

	const setMusicVolume = (value: number) => {
		stateSound.volumeValueMusic = value;
		stateGame.musicEnabled = value > 0;
	};

	const onVolumePointerDown = (e: PointerEvent) => {
		isVolumeDragging = true;
		(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
		setSliderValue(volumeEl, e.clientX, setMasterVolume);
		playClick();
	};

	const onVolumePointerMove = (e: PointerEvent) => {
		if (!isVolumeDragging) return;
		setSliderValue(volumeEl, e.clientX, setMasterVolume);
	};

	const onVolumePointerUp = (e: PointerEvent) => {
		if (!isVolumeDragging) return;
		isVolumeDragging = false;
		try {
			(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
		} catch {
			/* pointer might already be released */
		}
	};

	const onMusicPointerDown = (e: PointerEvent) => {
		isMusicDragging = true;
		(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
		setMusicSliderValue(musicEl, e.clientX, setMusicVolume);
		playClick();
	};

	const onMusicPointerMove = (e: PointerEvent) => {
		if (!isMusicDragging) return;
		setMusicSliderValue(musicEl, e.clientX, setMusicVolume);
	};

	const onMusicPointerUp = (e: PointerEvent) => {
		if (!isMusicDragging) return;
		isMusicDragging = false;
		try {
			(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
		} catch {
			/* pointer might already be released */
		}
	};
</script>

{#if isOpen}
	<button
		type="button"
		class="menu-toggle-hit"
		style:left="{menuButtonHit.left}px"
		style:top="{menuButtonHit.top}px"
		style:width="{menuButtonHit.size}px"
		style:height="{menuButtonHit.size}px"
		aria-label="close menu"
		onclick={closeFromMenuButton}
		data-test="menu-toggle-hit"
	></button>

	<div class="menu-overlay anchored" data-test="menu-overlay" style:--panel-width="{panelWidth}px">
		<div
			class="menu-panel-anchor"
			style:left="{panelAnchor.left}px"
			style:bottom="{panelAnchor.bottom}px"
			style:transform={panelAnchor.translateX !== 0
				? `translateX(${panelAnchor.translateX}px)`
				: undefined}
		>
			<div
				class="menu-panel"
				class:portrait={isPortrait}
				class:popout-l={isPopout}
				class:popout-s={isPopoutSmall}
				role="dialog"
				aria-modal="true"
				aria-label={context.i18nDerived.settingsMenuTitle()}
				tabindex="-1"
				style:--panel-width="{panelWidth}px"
				in:scale={{ duration: PANEL_IN_MS, easing: backOut, start: 0.86, opacity: 0 }}
				out:scale={{ duration: PANEL_OUT_MS, easing: cubicOut, start: 0.95, opacity: 0 }}
			>
		<img class="panel-bg" src={bgUrl} alt="" draggable="false" />

		{#each Object.values(rowIcons) as icon (icon.label)}
			<div
				class="menu-row-icon"
				style:left="{icon.x}px"
				style:top="{icon.y}px"
				style:width="{icon.size}px"
				style:height="{icon.size}px"
				style:background-image="url('{icon.url}')"
				role="img"
				aria-label={icon.label}
			></div>
		{/each}

		<div class="panel-content">
			<header class="panel-header">
				<h3 class="panel-title">{context.i18nDerived.settingsMenuTitle()}</h3>
			</header>

			<section class="settings-row turbo-row" aria-label="Game speed">
				<div
					class="row-slot turbo-control"
					role="radiogroup"
					aria-label="Game speed"
					style:--turbo-active-index={stateGame.gameSpeed - 1}
				>
					<div class="turbo-seg-highlight" aria-hidden="true"></div>
					{#each [1, 2, 3] as level (level)}
						<button
							type="button"
							class="turbo-seg-btn"
							class:is-selected={stateGame.gameSpeed === level}
							onclick={() => setSpeed(level as 1 | 2 | 3)}
							aria-pressed={stateGame.gameSpeed === level}
							data-test="speed-{level}"
						>
							{level}
						</button>
					{/each}
				</div>
			</section>

			<section class="settings-row volume-row" aria-label="Master volume">
				<div class="row-slot settings-slider">
					<div class="slider-rail">
						<div
							bind:this={volumeEl}
							class="slider-track-wrap"
							class:dragging={isVolumeDragging}
							style:--progress={volumeProgress}
							role="slider"
							aria-label="Master volume"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={stateSound.volumeValueMaster}
							tabindex="0"
							onpointerdown={onVolumePointerDown}
							onpointermove={onVolumePointerMove}
							onpointerup={onVolumePointerUp}
							onpointercancel={onVolumePointerUp}
							data-test="volume-slider"
						>
							<div class="slider-track">
								<img class="slider-empty" src={sliderEmptyUrl} alt="" draggable="false" />
								<div class="slider-fill">
									<img class="slider-full" src={sliderFullUrl} alt="" draggable="false" />
								</div>
							</div>
							<img class="slider-thumb" src={sliderKnobUrl} alt="" draggable="false" />
						</div>
					</div>
				</div>
			</section>

			<section class="settings-row music-row" aria-label="Music">
				<div class="row-slot music-slider">
					<div
						bind:this={musicEl}
						class="music-slider-wrap"
						class:dragging={isMusicDragging}
						style:--progress={musicProgress}
						role="slider"
						aria-label="Music volume"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={stateSound.volumeValueMusic}
						tabindex="0"
						onpointerdown={onMusicPointerDown}
						onpointermove={onMusicPointerMove}
						onpointerup={onMusicPointerUp}
						onpointercancel={onMusicPointerUp}
						data-test="music-slider"
					>
						<div class="music-slider-track">
							<div class="music-slider-fill"></div>
						</div>
					</div>
				</div>
			</section>
		</div>
		</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.menu-toggle-hit {
		position: fixed;
		z-index: 10001;
		transform: translate(-50%, -50%);
		border: 0;
		padding: 0;
		background: transparent;
		cursor: pointer;
		pointer-events: auto;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.menu-overlay {
		position: fixed;
		inset: 0;
		z-index: 9998;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: calc(var(--panel-width) * 0.03);
		box-sizing: border-box;
	}

	.menu-overlay.anchored {
		display: block;
		padding: 0;
	}

	.menu-panel-anchor {
		position: fixed;
		pointer-events: none;
	}

	.menu-panel {
		--panel-width: 400px;
		position: relative;
		width: var(--panel-width);
		aspect-ratio: 1;
		pointer-events: auto;
		filter: drop-shadow(0 calc(var(--panel-width) * 0.03) calc(var(--panel-width) * 0.08) rgba(0, 0, 0, 0.55));
		transform-origin: 12% 100%;

		&:focus {
			outline: none;
		}
	}

	.menu-panel.popout-l {
		filter: drop-shadow(0 calc(var(--panel-width) * 0.025) calc(var(--panel-width) * 0.07) rgba(0, 0, 0, 0.6));
	}

	.menu-panel.popout-s {
		filter: drop-shadow(0 calc(var(--panel-width) * 0.015) calc(var(--panel-width) * 0.045) rgba(0, 0, 0, 0.55));
	}

	.panel-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
	}

	.panel-content {
		position: absolute;
		inset: 0;
	}

	.menu-row-icon {
		position: absolute;
		z-index: 2;
		transform: translate(-50%, -50%);
		border: 0;
		padding: 0;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: contain;
		pointer-events: none;
		user-select: none;
	}

	/* Header frame: y 13.2–27.7% on source PNG */
	.panel-header {
		position: absolute;
		top: 13.5%;
		left: 17%;
		right: 17%;
		height: 13%;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.panel-title {
		margin: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.062);
		font-weight: 900;
		font-style: italic;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #7ee8ff;
		text-shadow:
			0 0 calc(var(--panel-width) * 0.03) rgba(80, 220, 255, 0.75),
			0 calc(var(--panel-width) * 0.005) calc(var(--panel-width) * 0.015) rgba(0, 0, 0, 0.85);
	}

	/*
		Row layout from bg PNG analysis:
		  icons  — left ~21%, width ~12%
		  slots  — left 39%, right 25%  (orange rects 38.5–75.3%)
	*/
	.settings-row {
		position: absolute;
		left: 0;
		right: 0;
		height: 8.5%;
	}

	.turbo-row {
		top: 35.5%;
	}

	.volume-row {
		top: 48%;
	}

	.music-row {
		top: 60.5%;
	}

	.row-slot {
		position: absolute;
		left: 39%;
		right: 24.7%;
		top: 50%;
		height: 88%;
		transform: translateY(-50%);
		min-width: 0;
	}

	.turbo-control {
		--turbo-btn-width: calc(var(--panel-width) * 0.1025);
		--turbo-btn-height: calc(var(--panel-width) * 0.06);
		--turbo-gap: calc(var(--panel-width) * 0.0125);
		--turbo-offset-x: 0px;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: var(--turbo-gap);
		height: 100%;
		padding-left: var(--turbo-offset-x);
		box-sizing: border-box;
	}

	.turbo-seg-highlight {
		position: absolute;
		top: 50%;
		width: var(--turbo-btn-width);
		height: var(--turbo-btn-height);
		transform: translateY(-50%);
		left: calc(
			var(--turbo-offset-x) + var(--turbo-active-index) *
				(var(--turbo-btn-width) + var(--turbo-gap))
		);
		border-radius: calc(var(--panel-width) * 0.015);
		background-image: linear-gradient(180deg, #ff9700 0%, #ffd51a 100%);
		box-shadow:
			inset 0 calc(var(--panel-width) * 0.0025) 0 rgba(255, 255, 255, 0.35),
			0 calc(var(--panel-width) * 0.0025) calc(var(--panel-width) * 0.0075) rgba(0, 0, 0, 0.2);
		pointer-events: none;
		transition: left 0.15s ease;
		z-index: 0;
	}

	.turbo-seg-btn {
		position: relative;
		z-index: 1;
		flex: 0 0 var(--turbo-btn-width);
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--turbo-btn-width);
		height: var(--turbo-btn-height);
		padding: 0;
		border: 0;
		background: transparent;
		appearance: none;
		-webkit-appearance: none;
		color: #d4a843;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: calc(var(--panel-width) * 0.035);
		font-weight: 700;
		font-style: italic;
		line-height: 1;
		cursor: pointer;
		transform: translateY(calc(var(--panel-width) * -0.005));
		transition:
			color 0.15s,
			transform 0.08s;

		&:hover:not(.is-selected) {
			color: #f0c858;
		}

		&.is-selected {
			color: #3a2810;
		}

		&:active {
			transform: translateY(calc(var(--panel-width) * -0.005)) scale(0.96);
		}
	}

	.settings-slider {
		--thumb-width: calc(var(--panel-width) * 0.048);
		--slider-bar-height: calc(var(--panel-width) * 0.032);
	}

	.settings-slider .slider-rail {
		width: 98%;
	}

	.settings-slider .slider-track-wrap {
		top: 41%;
	}

	.slider-rail {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.slider-track-wrap {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		height: calc(var(--panel-width) * 0.085);
		cursor: pointer;
		touch-action: none;
		user-select: none;
		z-index: 1;

		&:focus {
			outline: none;
		}

		&:focus-visible {
			outline: calc(var(--panel-width) * 0.005) solid rgba(110, 193, 255, 0.55);
			outline-offset: calc(var(--panel-width) * 0.005);
			border-radius: 999px;
		}
	}

	.slider-track {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: var(--slider-bar-height);
		transform: translateY(-50%);
		overflow: visible;
		container-type: inline-size;
	}

	.slider-empty {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
		z-index: 0;
	}

	.slider-fill {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		overflow: hidden;
		min-width: 0;
		pointer-events: none;
		z-index: 1;
		width: calc(
			var(--thumb-width) * 0.5 * clamp(0, var(--progress) * 9999, 1) + var(--progress) *
				(100% - var(--thumb-width))
		);
		transition: width 0.12s ease-out;
	}

	.slider-track-wrap.dragging .slider-fill,
	.slider-track-wrap.dragging .slider-thumb {
		transition: none;
	}

	.slider-full {
		position: absolute;
		top: 0;
		left: 0;
		width: 100cqw;
		height: 100%;
		object-fit: fill;
		object-position: left center;
		pointer-events: none;
		user-select: none;
	}

	.slider-thumb {
		position: absolute;
		top: 50%;
		width: var(--thumb-width);
		height: auto;
		left: calc(var(--thumb-width) * 0.5 + var(--progress) * (100% - var(--thumb-width)));
		transform: translate(-50%, -50%);
		pointer-events: none;
		user-select: none;
		transition: left 0.12s ease-out;
		z-index: 2;
	}

	.music-slider {
		--slider-bar-height: calc(var(--panel-width) * 0.068);
		--music-slider-radius: calc(var(--panel-width) * 0.008);
		width: 36%;
	}

	.music-slider-wrap {
		position: absolute;
		left: 0;
		right: 0;
		top: 46%;
		transform: translateY(-50%);
		height: calc(var(--panel-width) * 0.11);
		cursor: pointer;
		touch-action: none;
		user-select: none;

		&:focus {
			outline: none;
		}

		&:focus-visible {
			outline: calc(var(--panel-width) * 0.005) solid rgba(255, 213, 26, 0.55);
			outline-offset: calc(var(--panel-width) * 0.005);
			border-radius: var(--music-slider-radius);
		}
	}

	.music-slider-track {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: var(--slider-bar-height);
		transform: translateY(-50%);
		padding: calc(var(--panel-width) * 0.006);
		box-sizing: border-box;
		border-radius: var(--music-slider-radius);
	}

	.music-slider-fill {
		height: 100%;
		width: calc(var(--progress) * 100%);
		border-radius: var(--music-slider-radius);
		background: linear-gradient(180deg, #ff9700 0%, #ffd51a 100%);
		border: calc(var(--panel-width) * 0.0025) solid #ffffe0;
		box-sizing: border-box;
		pointer-events: none;
		transition: width 0.12s ease-out;
	}

	.music-slider-wrap.dragging .music-slider-fill {
		transition: none;
	}
</style>
