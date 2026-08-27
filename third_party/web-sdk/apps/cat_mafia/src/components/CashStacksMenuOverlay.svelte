<!--
	CashStacksMenuOverlay.svelte — меню настроек (турбо, звук, музыка)
	textures: ui/settings/ (burger_board + frames + sliders).
-->
<script lang="ts">
	import { scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { stateUi, stateBet, stateSound, stateModal } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import { getContext } from '../game/context';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { computeMenuPanelAnchor } from '../game/popupHudLayout';
	import {
		SETTINGS_ASSETS,
		SETTINGS_TURBO_URLS,
		AUTOSPIN_ASSETS,
	} from '../game/uiHtmlAssetManifest';
	import { computeDesktopHudLayout, resolveDesktopHudConfig } from '../game/desktopHudLayout';
	import { computePortraitHudCanvas } from '../game/portraitHudLayout';
	import { stateGame } from '../game/stateGame.svelte';
	import { isSdkTurboSpin } from '../game/gameSpeed';

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

		const hud = computeDesktopHudLayout(stateLayoutDerived, resolveDesktopHudConfig(isPopoutSmall));
		return {
			left: hud.menu.x,
			top: hud.menu.y,
			size: hud.menu.size,
		};
	});

	const closeMenu = () => {
		if (!stateUi.menuOpen) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = false;
	};

	let panelEl: HTMLDivElement | undefined = $state(undefined);

	/** Opaque card inside burger_board (gold frame ~6%). */
	const MENU_OPAQUE_INSET = {
		left: 0.055,
		right: 0.055,
		top: 0.05,
		bottom: 0.055,
	} as const;

	const isPointerInsideMenuCard = (clientX: number, clientY: number) => {
		if (!panelEl) return false;
		const rect = panelEl.getBoundingClientRect();
		const left = rect.left + rect.width * MENU_OPAQUE_INSET.left;
		const right = rect.right - rect.width * MENU_OPAQUE_INSET.right;
		const top = rect.top + rect.height * MENU_OPAQUE_INSET.top;
		const bottom = rect.bottom - rect.height * MENU_OPAQUE_INSET.bottom;
		return clientX >= left && clientX <= right && clientY >= top && clientY <= bottom;
	};

	const bgUrl = SETTINGS_ASSETS.bg;
	const pawIconUrl = AUTOSPIN_ASSETS.pawIcon;
	const closeIconUrl = AUTOSPIN_ASSETS.close;
	const frameTurboUrl = SETTINGS_ASSETS.frameTurbo;
	const frameVolumeUrl = SETTINGS_ASSETS.frameVolume;
	const soundIconUrls = {
		off: SETTINGS_ASSETS.soundOff,
		low: SETTINGS_ASSETS.soundLow,
		mid: SETTINGS_ASSETS.soundMid,
		high: SETTINGS_ASSETS.soundHigh,
	} as const;
	const sliderEmptyUrl = SETTINGS_ASSETS.sliderEmpty;
	const sliderFullUrl = SETTINGS_ASSETS.sliderFull;
	const sliderKnobUrl = SETTINGS_ASSETS.sliderKnob;
	const musicOnUrl = SETTINGS_ASSETS.musicOn;
	const musicOffUrl = SETTINGS_ASSETS.musicOff;
	const turboUrls = SETTINGS_TURBO_URLS;

	const PANEL_IN_MS = 400;
	const PANEL_OUT_MS = 240;

	const isOpen = $derived(stateUi.menuOpen);

	$effect(() => {
		if (!isOpen) return;

		const onPointerDown = (event: PointerEvent) => {
			if (
				event.target instanceof Element &&
				event.target.closest('[data-test="menu-toggle-hit"]')
			) {
				return;
			}
			if (isPointerInsideMenuCard(event.clientX, event.clientY)) return;

			event.preventDefault();
			event.stopPropagation();
			closeMenu();
		};

		document.addEventListener('pointerdown', onPointerDown, true);
		return () => document.removeEventListener('pointerdown', onPointerDown, true);
	});

	const volumeProgress = $derived(stateSound.volumeValueMaster / 100);
	const musicProgress = $derived(stateSound.volumeValueMusic / 100);
	const soundIconUrl = $derived.by(() => {
		const volume = stateSound.volumeValueMaster;
		if (volume === 0) return soundIconUrls.off;
		if (volume > 60) return soundIconUrls.high;
		if (volume > 30) return soundIconUrls.mid;
		return soundIconUrls.low;
	});
	const musicIconUrl = $derived(stateSound.volumeValueMusic === 0 ? musicOffUrl : musicOnUrl);
	const turboIconUrl = $derived(turboUrls[stateGame.gameSpeed - 1]);

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
		stateBet.isTurbo = isSdkTurboSpin(level);
		playClick();
	};

	const cycleTurbo = () => {
		const next = (stateGame.gameSpeed === 3 ? 1 : stateGame.gameSpeed + 1) as 1 | 2 | 3;
		stateGame.gameSpeed = next;
		stateBet.isTurbo = isSdkTurboSpin(next);
		playClick();
	};

	const toggleMasterVolume = () => {
		if (stateSound.volumeValueMaster === 0) {
			stateSound.volumeValueMaster = 50;
			playClick();
		} else {
			playClick();
			stateSound.volumeValueMaster = 0;
		}
	};

	const setSliderValue = (
		el: HTMLDivElement | undefined,
		clientX: number,
		setValue: (value: number) => void,
	) => {
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const thumbPx = Math.min(rect.height * 1.1, rect.width * 0.1);
		const usable = Math.max(1, rect.width - thumbPx);
		const ratio = (clientX - rect.left - thumbPx * 0.5) / usable;
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

	const toggleMusic = () => {
		if (stateSound.volumeValueMusic === 0) {
			setMusicVolume(50);
			playClick();
		} else {
			playClick();
			setMusicVolume(0);
		}
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
		setSliderValue(musicEl, e.clientX, setMusicVolume);
		playClick();
	};

	const onMusicPointerMove = (e: PointerEvent) => {
		if (!isMusicDragging) return;
		setSliderValue(musicEl, e.clientX, setMusicVolume);
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
		onclick={closeMenu}
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
				bind:this={panelEl}
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

				<div class="panel-content">
					<header class="panel-header">
						<img class="header-paw" src={pawIconUrl} alt="" draggable="false" />
						<h3 class="panel-title">{context.i18nDerived.settingsMenuTitle()}</h3>
						<button
							type="button"
							class="close-button"
							onclick={closeMenu}
							aria-label="close"
							data-test="menu-close"
						>
							<img class="close-icon" src={closeIconUrl} alt="" draggable="false" />
						</button>
					</header>

					<section class="settings-row turbo-row" aria-label="Game speed">
						<button
							type="button"
							class="row-icon"
							style:background-image="url('{turboIconUrl}')"
							aria-label="Game speed"
							data-test="menu-icon-turbo"
							onclick={cycleTurbo}
						></button>
						<div
							class="row-slot turbo-control"
							role="radiogroup"
							aria-label="Game speed"
							style:background-image="url('{frameTurboUrl}')"
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
						<button
							type="button"
							class="row-icon"
							style:background-image="url('{soundIconUrl}')"
							aria-label="Master volume"
							data-test="menu-icon-volume"
							onclick={toggleMasterVolume}
						></button>
						<div class="row-slot volume-frame" style:background-image="url('{frameVolumeUrl}')">
							<div class="settings-slider">
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
						<button
							type="button"
							class="row-icon"
							style:background-image="url('{musicIconUrl}')"
							aria-label="Music"
							data-test="menu-icon-music"
							onclick={toggleMusic}
						></button>
						<div class="row-slot volume-frame" style:background-image="url('{frameVolumeUrl}')">
							<div class="settings-slider">
								<div
									bind:this={musicEl}
									class="slider-track-wrap"
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
		z-index: 1;
	}

	.menu-panel {
		--panel-width: 320px;
		position: relative;
		width: var(--panel-width);
		aspect-ratio: 1067 / 1032;
		pointer-events: auto;
		filter: drop-shadow(
			0 calc(var(--panel-width) * 0.03) calc(var(--panel-width) * 0.08) rgba(0, 0, 0, 0.55)
		);
		transform-origin: 12% 100%;

		&:focus {
			outline: none;
		}
	}

	.menu-panel.popout-l {
		filter: drop-shadow(
			0 calc(var(--panel-width) * 0.025) calc(var(--panel-width) * 0.07) rgba(0, 0, 0, 0.6)
		);
	}

	.menu-panel.popout-s {
		filter: drop-shadow(
			0 calc(var(--panel-width) * 0.015) calc(var(--panel-width) * 0.045) rgba(0, 0, 0, 0.55)
		);
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

	.panel-header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 20%;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		justify-items: center;
		padding: 9.5% 8% 0.5%;
		box-sizing: border-box;
		pointer-events: none;
		gap: 3%;
		/* Shared side-icon size — paw (left) and close (right) must match. */
		--header-side-icon: calc(var(--panel-width) * 0.14);
	}

	.header-paw {
		width: var(--header-side-icon);
		height: var(--header-side-icon);
		object-fit: contain;
		pointer-events: none;
		user-select: none;
	}

	.panel-title {
		margin: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.078);
		font-weight: 800;
		font-style: normal;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #f3e6c8;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.85),
			0 2px 6px rgba(0, 0, 0, 0.65);
		text-align: center;
		line-height: 1.1;
	}

	.close-button {
		width: var(--header-side-icon);
		height: var(--header-side-icon);
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: auto;
		overflow: visible;
		transition:
			transform 0.12s,
			filter 0.12s;

		&:hover {
			filter: brightness(1.12);
			transform: scale(1.06);
		}

		&:active {
			transform: scale(0.96);
		}
	}

	.close-icon {
		/* cross.webp has ~14% transparent margin; scale so the gold ring
		 * matches the paw badge diameter beside the title. */
		width: 116%;
		height: 116%;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
	}

	.settings-row {
		position: absolute;
		left: 8%;
		right: 8%;
		height: 16.5%;
		display: grid;
		grid-template-columns: 18% 1fr;
		align-items: center;
		column-gap: 3%;
		box-sizing: border-box;
	}

	.turbo-row {
		top: 31%;
	}

	.volume-row {
		top: 50%;
	}

	.music-row {
		top: 69%;
	}

	.row-icon {
		width: 100%;
		aspect-ratio: 1;
		max-height: 100%;
		justify-self: center;
		border: 0;
		padding: 0;
		appearance: none;
		-webkit-appearance: none;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: contain;
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		transition: transform 0.1s;

		&:active {
			transform: scale(0.94);
		}
	}

	.row-slot {
		position: relative;
		width: 100%;
		height: 92%;
		min-width: 0;
		background-repeat: no-repeat;
		background-position: center;
		background-size: 100% 100%;
	}

	.turbo-control {
		display: flex;
		align-items: center;
		justify-content: stretch;
		height: 92%;
		padding: 0 1.2%;
		box-sizing: border-box;
	}

	.turbo-seg-highlight {
		position: absolute;
		top: 8%;
		bottom: 8%;
		/* Равные отступы слева/справа внутри сегмента. */
		--turbo-seg-w: calc((100% - 2.4%) / 3);
		--turbo-seg-inset: 0.7%;
		width: calc(var(--turbo-seg-w) - 2 * var(--turbo-seg-inset));
		left: calc(
			1.2% + var(--turbo-active-index) * var(--turbo-seg-w) + var(--turbo-seg-inset)
		);
		border-radius: calc(var(--panel-width) * 0.012);
		background-image:
			linear-gradient(
				90deg,
				rgba(255, 248, 200, 0.55) 0%,
				rgba(255, 248, 200, 0) 10%,
				rgba(255, 248, 200, 0) 90%,
				rgba(90, 35, 0, 0.35) 100%
			),
			linear-gradient(
				180deg,
				#fff6a8 0%,
				#ffe056 6%,
				#f0b020 18%,
				#e89810 42%,
				#d88808 72%,
				#c87800 100%
			);
		box-shadow:
			inset 0 calc(var(--panel-width) * 0.004) 0 #fffce0,
			inset 0 calc(var(--panel-width) * 0.008) 0 rgba(120, 50, 0, 0.45),
			inset calc(var(--panel-width) * 0.004) 0 0 rgba(255, 250, 210, 0.65),
			inset calc(var(--panel-width) * -0.004) 0 0 rgba(90, 35, 0, 0.4),
			inset 0 calc(var(--panel-width) * -0.004) calc(var(--panel-width) * 0.01)
				rgba(80, 30, 0, 0.35),
			inset 0 0 calc(var(--panel-width) * 0.018) rgba(255, 200, 40, 0.35),
			0 calc(var(--panel-width) * 0.002) calc(var(--panel-width) * 0.006) rgba(0, 0, 0, 0.35);
		pointer-events: none;
		transition: left 0.15s ease;
		z-index: 0;
	}

	.turbo-seg-btn {
		position: relative;
		z-index: 1;
		flex: 1 1 0;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		appearance: none;
		-webkit-appearance: none;
		color: #f0d060;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.055);
		font-weight: 800;
		font-style: italic;
		line-height: 1;
		/* Italic цифры визуально съезжают влево — лёгкая компенсация. */
		transform: translateX(0.06em);
		cursor: pointer;
		transition:
			color 0.15s,
			transform 0.08s;

		&:hover:not(.is-selected) {
			color: #ffe08a;
		}

		&.is-selected {
			color: #3a2810;
		}

		&:active {
			transform: translateX(0.06em) scale(0.96);
		}
	}

	.volume-frame {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 3.5%;
		box-sizing: border-box;
	}

	.settings-slider {
		--thumb-width: calc(var(--panel-width) * 0.085);
		--slider-bar-height: calc(var(--panel-width) * 0.042);
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
		height: calc(var(--panel-width) * 0.11);
		cursor: pointer;
		touch-action: none;
		user-select: none;
		z-index: 1;

		&:focus {
			outline: none;
		}

		&:focus-visible {
			outline: calc(var(--panel-width) * 0.005) solid rgba(240, 208, 96, 0.55);
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
		border-radius: 999px;
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
		aspect-ratio: 1;
		left: calc(var(--thumb-width) * 0.5 + var(--progress) * (100% - var(--thumb-width)));
		transform: translate(-50%, -50%);
		pointer-events: none;
		user-select: none;
		transition: left 0.12s ease-out;
		z-index: 2;
	}

	.menu-panel.portrait {
		.panel-title {
			font-size: calc(var(--panel-width) * 0.072);
		}
	}

	.menu-panel.popout-s {
		.panel-title {
			font-size: calc(var(--panel-width) * 0.085);
		}

		.panel-header {
			--header-side-icon: calc(var(--panel-width) * 0.155);
		}

		.turbo-seg-btn {
			font-size: calc(var(--panel-width) * 0.06);
		}
	}
</style>
