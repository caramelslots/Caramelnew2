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
	import { stateUi, stateBet, stateSound } from 'state-shared';

	import { stateGame } from '../game/stateGame.svelte';

	const isOpen = $derived(stateUi.menuOpen);

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
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<header class="menu-header">
			<div class="title-icon" aria-hidden="true">i</div>
			<h3 class="menu-title">ИНФОРМАЦИЯ</h3>
		</header>

		<!-- === СКОРОСТЬ ИГРЫ (1/2/3) === -->
		<div class="menu-row">
			<div class="row-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="16" height="16">
					<path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" fill="#fff" />
				</svg>
			</div>
			<div class="seg-control" role="radiogroup" aria-label="Game speed">
				{#each [1, 2, 3] as level (level)}
					<button
						type="button"
						class="seg-btn"
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
		<div class="menu-row">
			<div class="row-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="18" height="18">
					<path
						d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4zM14 3.23v2.06A7 7 0 0119 12a7 7 0 01-5 6.71v2.06A9 9 0 0021 12 9 9 0 0014 3.23z"
						fill="#fff"
					/>
				</svg>
			</div>
			<div
				bind:this={volumeEl}
				class="volume-slider"
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
				<div class="volume-bar">
					<div
						class="volume-bar-fill"
						style:width={`${stateSound.volumeValueMaster}%`}
					></div>
				</div>
			</div>
		</div>

		<!-- === МУЗЫКА (ВКЛ/ВЫКЛ кнопки) === -->
		<div class="menu-row">
			<div class="row-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="16" height="16">
					<path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" fill="#fff" />
				</svg>
			</div>
			<div class="seg-control" role="radiogroup" aria-label="Music">
				<button
					type="button"
					class="seg-btn wide"
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
		Card позиционирована absolute, bottom-left — над hamburger-кнопкой,
		которая находится внутри dark bar HUD (~примерно 7rem от низа).
		Pointer-events на карточке = auto, на backdrop = тоже auto, но
		stopPropagation на карточке предотвращает закрытие при клике внутри.
	*/
	.menu-card {
		position: fixed;
		left: 1.2rem;
		bottom: 7.5rem;
		z-index: 9998;
		width: min(260px, 80vw);
		background: linear-gradient(180deg, #6db9d8 0%, #4b8eb0 100%);
		border-radius: 18px;
		padding: 0.85rem 0.95rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
		color: #fff;
		font-family: 'proxima-nova', sans-serif;

		&:focus { outline: none; }
	}

	.menu-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 0.15rem;
	}

	.title-icon {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #fff;
		color: #4b8eb0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-style: italic;
		font-weight: 800;
		font-size: 1rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.menu-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: #fff;
	}

	.menu-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.row-icon {
		width: 30px;
		height: 30px;
		flex: 0 0 30px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.18);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Контейнер для группы кнопок 1/2/3. */
	.seg-control {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.2rem;
		padding: 0.22rem;
		background: #0c2233;
		border-radius: 9px;
		min-height: 34px;
	}

	.seg-btn {
		flex: 1;
		height: 28px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s, transform 0.05s;

		&.wide { font-size: 0.8rem; letter-spacing: 0.04em; }

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

	/*
		Volume slider — стиль 1-в-1 как у rounds-слайдера в Autoplay:
		тёмная подложка #0c2233, голубой fill, drag через pointer-capture.
		touch-action: none предотвращает скролл страницы при свайпе.
	*/
	.volume-slider {
		flex: 1;
		position: relative;
		padding: 0.5rem 0.55rem;
		background: #0c2233;
		border-radius: 9px;
		cursor: pointer;
		touch-action: none;
		user-select: none;
		min-height: 34px;
		display: flex;
		align-items: center;

		&:focus { outline: none; }
		&:focus-visible { outline: 2px solid rgba(110, 193, 255, 0.6); }
	}

	.volume-bar {
		position: relative;
		flex: 1;
		height: 14px;
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
