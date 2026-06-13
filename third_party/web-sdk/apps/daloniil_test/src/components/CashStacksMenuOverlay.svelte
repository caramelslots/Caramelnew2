<!--
	CashStacksMenuOverlay.svelte — кастомное меню "Информация" для Cash Stacks.
	Открывается по клику на ButtonMenu (stateUi.menuOpen=true).

	Содержит 3 строки настроек:
	  1. ⚡ Скорость игры (кнопки 1/2/3) — связано с stateGame.gameSpeed
	  2. 🔊 Громкость (drag-слайдер в стиле rounds из Autoplay) — stateSound.volumeValueMaster
	  3. 🎵 Музыка (кнопки ВКЛ/ВЫКЛ) — управляет stateSound.volumeValueMusic

	Реализован как HTML-overlay (не PixiJS). Закрывается по клику ВНЕ панели
	(прозрачный backdrop ловит клики). Позиционирован bottom-left, чуть
	выше HUD-бара (над кнопкой меню).
-->
<script lang="ts">
	import { stateUi, stateBet, stateSound, stateModal } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import { computePopupHudLayout } from '../game/popupHudLayout';
	import { stateGame } from '../game/stateGame.svelte';

	const { stateLayoutDerived } = getContextLayout();
	const popup = $derived(computePopupHudLayout(stateLayoutDerived));

	const isOpen = $derived(stateUi.menuOpen);

	$effect(() => {
		if (isOpen && stateModal.modal?.name === 'autoSpin') {
			stateModal.modal = null;
		}
	});

	const close = () => {
		stateUi.menuOpen = false;
	};

	/* Скорость 1/2/3 → isTurbo маппинг.
	   Level 1 = обычная скорость, 2-3 = turbo (SDK поддерживает только
	   бинарный turbo, но мы храним полный уровень в stateGame.gameSpeed
	   чтобы кнопки в меню и иконка turbo показывали один и тот же state). */
	const setSpeed = (level: 1 | 2 | 3) => {
		stateGame.gameSpeed = level;
		stateBet.isTurbo = level > 1;
	};

	/* Музыка ВКЛ/ВЫКЛ — гасит дорожку музыки в ноль или возвращает к 75%.
	   stateSound.volumeValueSoundEffect (звуки SFX) не трогаем. */
	const toggleMusic = (enabled: boolean) => {
		stateGame.musicEnabled = enabled;
		stateSound.volumeValueMusic = enabled ? 75 : 0;
	};

	/* === Volume drag-слайдер ===
	   Тот же подход что в FeaturesAutoSpinOverlay для rounds: единый
	   interactive div с pointer-capture, поддерживает и тап, и drag. */
	let volumeEl: HTMLDivElement | undefined = $state(undefined);
	let isDragging = $state(false);

	const setVolumeByClientX = (clientX: number) => {
		if (!volumeEl) return;
		const rect = volumeEl.getBoundingClientRect();
		const ratio = (clientX - rect.left) / rect.width;
		const clamped = Math.max(0, Math.min(1, ratio));
		stateSound.volumeValueMaster = Math.round(clamped * 100);
	};

	const onVolumePointerDown = (e: PointerEvent) => {
		isDragging = true;
		(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
		setVolumeByClientX(e.clientX);
	};

	const onVolumePointerMove = (e: PointerEvent) => {
		if (!isDragging) return;
		setVolumeByClientX(e.clientX);
	};

	const onVolumePointerUp = (e: PointerEvent) => {
		if (!isDragging) return;
		isDragging = false;
		try {
			(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
		} catch {
			/* pointer might already be released */
		}
	};
</script>

{#if isOpen}
	<!--
		Backdrop — прозрачный, на весь экран. Клик по нему закрывает меню.
		Карточку обернули в .menu-card-wrap с onclickoutside-эффектом за счёт
		stopPropagation на самой карточке.
	-->
	<button
		type="button"
		class="menu-backdrop"
		aria-label="close"
		onclick={close}
		data-test="menu-backdrop"
	></button>

	<div
		class="menu-card"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		style:width="{popup.menu.width}px"
		style:left="{popup.menu.left}px"
		style:bottom="{popup.menu.bottom}px"
		style:padding="{popup.menu.padding}px"
		style:gap="{popup.menu.gap}px"
		style:border-radius="{popup.menu.borderRadius}px"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<header class="menu-header">
			<h3 class="menu-title" style:font-size="{popup.menu.titleSize}px">ИНФОРМАЦИЯ</h3>
		</header>

		<!-- === СКОРОСТЬ ИГРЫ (1/2/3) === -->
		<div class="menu-row" style:gap="{popup.menu.rowGap}px">
			<div
				class="row-icon"
				style:width="{popup.menu.iconSize}px"
				style:height="{popup.menu.iconSize}px"
				style:flex="0 0 {popup.menu.iconSize}px"
				aria-hidden="true"
			>
				<svg viewBox="0 0 24 24" width="70%" height="70%">
					<path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" fill="#fff" />
				</svg>
			</div>
			<div
				class="seg-control"
				style:min-height="{popup.menu.segMinHeight}px"
				style:padding="{popup.menu.segControlPadding}px"
				style:border-radius="{popup.menu.borderRadius * 0.5}px"
				role="radiogroup"
				aria-label="Game speed"
			>
				{#each [1, 2, 3] as level (level)}
					<button
						type="button"
						class="seg-btn"
						style:height="{popup.menu.segBtnHeight}px"
						style:font-size="{popup.menu.segBtnFontSize}px"
						style:border-radius="{popup.menu.borderRadius * 0.33}px"
						class:active={stateGame.gameSpeed === level}
						onclick={() => setSpeed(level as 1 | 2 | 3)}
						aria-pressed={stateGame.gameSpeed === level}
						data-test="speed-{level}"
					>
						{level}
					</button>
				{/each}
			</div>
		</div>

		<!-- === MASTER VOLUME (drag-слайдер в стиле rounds из Autoplay) === -->
		<div class="menu-row" style:gap="{popup.menu.rowGap}px">
			<div
				class="row-icon"
				style:width="{popup.menu.iconSize}px"
				style:height="{popup.menu.iconSize}px"
				style:flex="0 0 {popup.menu.iconSize}px"
				aria-hidden="true"
			>
				<svg viewBox="0 0 24 24" width="75%" height="75%">
					<path
						d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4zM14 3.23v2.06A7 7 0 0119 12a7 7 0 01-5 6.71v2.06A9 9 0 0021 12 9 9 0 0014 3.23z"
						fill="#fff"
					/>
				</svg>
			</div>
			<div
				bind:this={volumeEl}
				class="volume-slider"
				style:min-height="{popup.menu.segMinHeight}px"
				style:padding="0 {popup.menu.volumePadX}px"
				style:border-radius="{popup.menu.borderRadius * 0.5}px"
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
				<div class="volume-bar" style:height="{popup.menu.volumeTrackHeight}px">
					<div
						class="volume-bar-fill"
						style:width={`${stateSound.volumeValueMaster}%`}
					></div>
				</div>
			</div>
		</div>

		<!-- === МУЗЫКА (ВКЛ/ВЫКЛ кнопки) === -->
		<div class="menu-row" style:gap="{popup.menu.rowGap}px">
			<div
				class="row-icon"
				style:width="{popup.menu.iconSize}px"
				style:height="{popup.menu.iconSize}px"
				style:flex="0 0 {popup.menu.iconSize}px"
				aria-hidden="true"
			>
				<svg viewBox="0 0 24 24" width="70%" height="70%">
					<path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" fill="#fff" />
				</svg>
			</div>
			<div
				class="seg-control"
				style:min-height="{popup.menu.segMinHeight}px"
				style:padding="{popup.menu.segControlPadding}px"
				style:border-radius="{popup.menu.borderRadius * 0.5}px"
				role="radiogroup"
				aria-label="Music"
			>
				<button
					type="button"
					class="seg-btn wide"
					style:height="{popup.menu.segBtnHeight}px"
					style:font-size="{popup.menu.segBtnFontSize * 0.94}px"
					style:border-radius="{popup.menu.borderRadius * 0.33}px"
					class:active={stateGame.musicEnabled}
					onclick={() => toggleMusic(true)}
					aria-pressed={stateGame.musicEnabled}
					data-test="music-on"
				>
					ВКЛ
				</button>
				<button
					type="button"
					class="seg-btn wide"
					style:height="{popup.menu.segBtnHeight}px"
					style:font-size="{popup.menu.segBtnFontSize * 0.94}px"
					style:border-radius="{popup.menu.borderRadius * 0.33}px"
					class:active={!stateGame.musicEnabled}
					onclick={() => toggleMusic(false)}
					aria-pressed={!stateGame.musicEnabled}
					data-test="music-off"
				>
					ВЫКЛ
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	/* Прозрачный backdrop на весь экран — ловит click-outside чтобы закрыть. */
	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9997;
		background: transparent;
		border: 0;
		padding: 0;
		cursor: default;
	}

	/*
		Card anchored above the menu HUD button (left = button center).
		Sizes and position come from computePopupHudLayout().
	*/
	.menu-card {
		position: fixed;
		z-index: 9998;
		transform: translateX(-50%);
		background: linear-gradient(180deg, #6db9d8 0%, #4b8eb0 100%);
		display: flex;
		flex-direction: column;
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
		color: #fff;
		font-family: 'proxima-nova', sans-serif;
		box-sizing: border-box;

		&:focus { outline: none; }
	}

	.menu-header {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.15em;
	}

	.menu-title {
		margin: 0;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: #fff;
	}

	.menu-row {
		display: flex;
		align-items: center;
	}

	.row-icon {
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.18);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.seg-control {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.15em;
		background: #0c2233;
	}

	.seg-btn {
		flex: 1;
		border: 0;
		background: transparent;
		color: #fff;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s, transform 0.05s;

		&.wide { letter-spacing: 0.04em; }

		&:hover:not(.active) {
			background: rgba(255, 255, 255, 0.06);
		}

		&.active {
			background: linear-gradient(180deg, #ffd96b 0%, #d6a233 100%);
			color: #2b1f08;
			box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
		}

		&:active { transform: translateY(1px); }
	}

	.volume-slider {
		flex: 1;
		position: relative;
		background: #0c2233;
		cursor: pointer;
		touch-action: none;
		user-select: none;
		display: flex;
		align-items: center;

		&:focus { outline: none; }
		&:focus-visible { outline: 2px solid rgba(110, 193, 255, 0.6); }
	}

	.volume-bar {
		position: relative;
		flex: 1;
		background: #0a1628;
		border-radius: 4px;
		overflow: hidden;
		pointer-events: none;
	}

	.volume-bar-fill {
		height: 100%;
		background: linear-gradient(180deg, #6ec1ff 0%, #3a93e0 100%);
		transition: width 0.12s ease-out;
	}
</style>
