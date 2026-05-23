<!--
	PaylineOverlay.svelte — рендерит активные paylines поверх доски (PIXI Graphics).
	Подписывается на события paylineShow / paylineHide / paylineClear.

	Стиль (по референсу): неоновый фиолетовый «канат» — толстый плотный core
	поверх широкого мягкого halo, имитирующего свечение и лёгкую тень.
	Свечение делается без сторонних shader-фильтров (pixi-filters) — несколько
	stroke'ов по одному и тому же пути с убывающей шириной и растущей alpha:
	дёшево по GPU и работает на любом устройстве.

	Геометрия: линия идёт сквозь ВСЕ катушки (paylineRows: rows[0..N-1]),
	а не только до последнего выигрышного символа — так же, как на референсе.
	Выигрышные позиции дополнительно подсвечиваются точкой-узлом.

	Анимация: arc-length прогресс 0→1 от первого reel (слева) к последнему
	(справа); easeOutCubic, чтобы старт был резким, а финиш — мягким.
-->
<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventPaylineOverlay =
		| {
				type: 'paylineShow';
				lineIndex: number;
				positions: Position[];
				color?: number;
				// Полный rows-паттерн линии через все катушки (длина = numReels).
				// row здесь в PADDED координатах (см. getCellCenter ниже), т.к.
				// конфиг даёт unpadded rows — компенсируем +1 при отрисовке.
				paylineRows?: number[];
		  }
		| { type: 'paylineHide'; lineIndex: number }
		| { type: 'paylineClearAll' };
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { onMount } from 'svelte';
	import { Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();

	type ActiveLine = {
		lineIndex: number;
		positions: Position[];
		paylineRows: number[] | null;
		color: number;
		progress: number;
		startTime: number;
	};

	const NEON_PURPLE = 0xb936ff;
	const DRAW_DURATION_MS = 480;

	// Halo-слои: рисуются от внешнего (широкий, прозрачный) к внутреннему
	// (узкий, плотный). Толщина настроена под референс — линия выглядит
	// как насыщенный неон-«канат» с мягкой тенью вокруг.
	const GLOW_LAYERS: { width: number; alpha: number }[] = [
		{ width: 32, alpha: 0.08 },
		{ width: 22, alpha: 0.16 },
		{ width: 14, alpha: 0.3 },
		{ width: 9, alpha: 0.6 },
		{ width: 5, alpha: 1.0 },
	];

	let activeLines = $state<ActiveLine[]>([]);

	context.eventEmitter.subscribeOnMount({
		paylineShow: ({ lineIndex, positions, color, paylineRows }) => {
			const next = activeLines.filter((l) => l.lineIndex !== lineIndex);
			next.push({
				lineIndex,
				positions,
				paylineRows: paylineRows ?? null,
				color: color ?? NEON_PURPLE,
				progress: 0,
				startTime: performance.now(),
			});
			activeLines = next;
		},
		paylineHide: ({ lineIndex }) => {
			activeLines = activeLines.filter((l) => l.lineIndex !== lineIndex);
		},
		paylineClearAll: () => {
			activeLines = [];
		},
	});

	onMount(() => {
		let raf = 0;
		const tick = (now: number) => {
			for (const line of activeLines) {
				if (line.progress < 1) {
					line.progress = Math.min(1, (now - line.startTime) / DRAW_DURATION_MS);
				}
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	// SDK math-events эмитят `positions` в PADDED координатах
	// (math-sdk/src/events/events.py:140 — +1 к row). А `paylineRows` берётся
	// из config.paylines, где rows — unpadded (0..numRows-1). Поэтому для
	// rows из config'а добавляем +1 (см. вызов в drawLine).
	const getCellCenter = (reel: number, paddedRow: number) => ({
		x: SYMBOL_SIZE * (reel + 0.5),
		y: SYMBOL_SIZE * (paddedRow - 0.5),
	});

	// Рисует полилинию от points[0] до длины `target` (arc-length).
	// Возвращает индекс последней полностью пройденной вершины.
	const tracePath = (
		g: PIXI.Graphics,
		points: { x: number; y: number }[],
		segLens: number[],
		target: number,
	): number => {
		if (points.length === 0) return -1;
		g.moveTo(points[0].x, points[0].y);
		if (target <= 0) return 0;
		let consumed = 0;
		let lastReached = 0;
		for (let i = 0; i < segLens.length; i++) {
			const segLen = segLens[i];
			if (consumed + segLen <= target) {
				g.lineTo(points[i + 1].x, points[i + 1].y);
				consumed += segLen;
				lastReached = i + 1;
			} else {
				const remain = target - consumed;
				const t = segLen === 0 ? 0 : remain / segLen;
				const x = points[i].x + (points[i + 1].x - points[i].x) * t;
				const y = points[i].y + (points[i + 1].y - points[i].y) * t;
				g.lineTo(x, y);
				break;
			}
		}
		return lastReached;
	};

	const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

	const drawLine = (line: ActiveLine) => (g: PIXI.Graphics) => {
		const { positions, paylineRows, color, progress } = line;

		// Точки полилинии. Предпочитаем paylineRows (полный путь через все
		// катушки), fallback — на массив выигрышных positions (если конфиг
		// почему-то не передал rows).
		const points = paylineRows
			? paylineRows.map((row, reel) => getCellCenter(reel, row + 1))
			: positions.map((p) => getCellCenter(p.reel, p.row));

		if (points.length === 0) return;

		const segLens: number[] = [];
		let total = 0;
		for (let i = 1; i < points.length; i++) {
			const dx = points[i].x - points[i - 1].x;
			const dy = points[i].y - points[i - 1].y;
			const d = Math.hypot(dx, dy);
			segLens.push(d);
			total += d;
		}

		const target = total * easeOutCubic(progress);

		for (const layer of GLOW_LAYERS) {
			tracePath(g, points, segLens, target);
			g.stroke({
				color,
				width: layer.width,
				alpha: layer.alpha,
				cap: 'round',
				join: 'round',
			});
		}

		// Узлы в выигрышных позициях — появляются, когда фронт штриха
		// до них дошёл по X (линия движется слева направо, поэтому достаточно
		// сравнить координату X с проекцией текущего фронта).
		// Считаем фронт как X-координату конца текущего штриха.
		let frontX = points[0].x;
		{
			let consumed = 0;
			for (let i = 0; i < segLens.length; i++) {
				const segLen = segLens[i];
				if (consumed + segLen <= target) {
					consumed += segLen;
					frontX = points[i + 1].x;
				} else {
					const remain = target - consumed;
					const t = segLen === 0 ? 0 : remain / segLen;
					frontX = points[i].x + (points[i + 1].x - points[i].x) * t;
					break;
				}
			}
		}

		for (const p of positions) {
			const c = getCellCenter(p.reel, p.row);
			if (c.x > frontX + 0.5) continue;
			// Узел: внешнее свечение + плотный центр.
			g.circle(c.x, c.y, 14).fill({ color, alpha: 0.15 });
			g.circle(c.x, c.y, 9).fill({ color, alpha: 0.35 });
			g.circle(c.x, c.y, 5).fill({ color, alpha: 1.0 });
		}
	};
</script>

{#each activeLines as line (line.lineIndex)}
	<Graphics draw={drawLine(line)} />
{/each}
