<!--
	DevCheats.svelte — дев-чит для быстрого тестирования.

	Shift+E переключает множитель скорости (1× ↔ 100×). Ускоряются:
	  - pixiApplication.ticker.speed — все анимации на pixi ticker
	    (реелы / spin / bounce / Tween / любые requestAnimationFrame-driven
	    эффекты). Достаётся через pixi-svelte context, без прямого импорта
	    'pixi.js' (apps/daloniil_test не имеет его в deps).
	  - stateBetDerived.timeScale() — Spine-анимации символов, Anticipation,
	    GlobalMultiplier, SymbolSpine.
	  - window.setTimeout / setInterval — waitForTimeout, паузы между
	    book-events, FS-intro/outro, blink/glow таймеры.

	НЕ продакшен-фича. Подключается только в Game.svelte. Когда чит активен,
	сверху-справа появляется красный бейдж DEV ×100.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';

	/*
		Ticker.speed — глобальный множитель deltaTime у pixi-приложения. Берём
		его через pixi-svelte context.stateApp.pixiApplication.ticker, чтобы
		НЕ тащить прямую зависимость на 'pixi.js' в apps/daloniil_test
		(rollup не резолвит транзитивные импорты в SSR-сборке).
	*/
	const context = getContext();

	const BOOST_LEVEL = 100;

	let boost = $state(1);

	/*
		Сохраняем оригинальные функции один раз — чтобы при выключении чита
		вернуть как было, и чтобы избежать рекурсии при множественной активации.
	*/
	const originalSetTimeout = window.setTimeout.bind(window);
	const originalSetInterval = window.setInterval.bind(window);
	const originalTimeScale = stateBetDerived.timeScale;

	/*
		stateBetDerived.timeScale — функция, читается каждый рендер. Подменяем
		её на обёртку, которая всегда возвращает текущий boost (boost
		реактивен — следующий вызов даёт актуальное значение). Делаем сразу
		при mount, до первого spin-цикла.
	*/
	stateBetDerived.timeScale = () => originalTimeScale() * boost;

	const patchTimers = () => {
		const factor = boost;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).setTimeout = ((fn: any, t = 0, ...args: any[]) =>
			originalSetTimeout(fn, Math.max(0, t / factor), ...args)) as typeof window.setTimeout;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).setInterval = ((fn: any, t = 0, ...args: any[]) =>
			originalSetInterval(fn, Math.max(1, t / factor), ...args)) as typeof window.setInterval;
	};

	const restoreTimers = () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).setTimeout = originalSetTimeout;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).setInterval = originalSetInterval;
	};

	const setTickerSpeed = (speed: number) => {
		/*
			ticker — глобальный тикер pixi-приложения. По умолчанию у Application
			это PIXI.Ticker.shared, так что .speed = N ускоряет все pixi-анимации
			(reel spin / bounce / Tween / requestAnimationFrame-driven эффекты)
			в N раз. App может быть ещё не инициализирован на момент клика —
			тогда тикер пропускаем (нечего ускорять, всё равно ничего не крутится).
		*/
		const ticker = context.stateApp?.pixiApplication?.ticker;
		if (ticker) ticker.speed = speed;
	};

	const toggle = () => {
		boost = boost === 1 ? BOOST_LEVEL : 1;
		if (boost > 1) {
			patchTimers();
			setTickerSpeed(boost);
		} else {
			restoreTimers();
			setTickerSpeed(1);
		}
		// eslint-disable-next-line no-console
		console.log(`[DEV] animation speed: ×${boost} (Shift+E to toggle)`);
	};

	onMount(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			/*
				Shift+E — латиница ИЛИ кириллица (на ru-раскладке буква E это
				код 'KeyE' но e.key — 'У'). Используем e.code чтобы было
				независимо от раскладки.
			*/
			if (e.shiftKey && e.code === 'KeyE') {
				e.preventDefault();
				toggle();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			restoreTimers();
			setTickerSpeed(1);
			stateBetDerived.timeScale = originalTimeScale;
		};
	});
</script>

{#if boost > 1}
	<div class="dev-indicator" aria-hidden="true">
		DEV ×{boost}
	</div>
{/if}

<style>
	.dev-indicator {
		position: fixed;
		top: 8px;
		right: 8px;
		background: rgba(220, 38, 38, 0.92);
		color: #fff;
		padding: 4px 10px;
		font-family: 'JetBrains Mono', 'Menlo', monospace;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.05em;
		border-radius: 6px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		z-index: 99999;
		pointer-events: none;
		user-select: none;
	}
</style>
