<!--
	PaylineOverlay.svelte — рендерит активные paylines поверх доски (PIXI Graphics).
	Подписывается на события paylineShow / paylineHide / paylineClear.

	Стиль (по референсу): энергетические оранжево-жёлтые линии с плавными
	изгибами на поворотах, профилем толщины «тонкая → полная → тонкая»,
	additive-свечением на пересечениях и анимированными starburst-узлами

	Геометрия: Catmull-Rom spline через центры всех катушек (paylineRows).
	Анимация: arc-length прогресс 0→1 слева направо (easeInOutCubic) +
	непрерывная синусоидальная «извилина» вдоль пути (затухает у символов).
-->
<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventPaylineOverlay =
		| {
				type: 'paylineShow';
				lineIndex: number;
				positions: Position[];
				color?: number;
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

	type Point = { x: number; y: number };

	type ActiveLine = {
		lineIndex: number;
		positions: Position[];
		paylineRows: number[] | null;
		color: number;
		progress: number;
		startTime: number;
	};

	const ENERGY_ORANGE = 0xff8800;
	const DRAW_DURATION_MS = 620;
	const CYCLE_MS = 1600;
	const SAMPLES_PER_SEGMENT = 14;
	const PATH_CHUNKS = 14;
	const TAPER_MIN = 0.42;
	const TAPER_MAX = 1.0;
	/** Доля пути у каждого края для плавного нарастания / убывания толщины. */
	const TAPER_RAMP = 0.2;
	const WIGGLE_AMPLITUDE = 7;
	const WIGGLE_WAVES = 2.4;
	const WIGGLE_SPEED = 4.2;
	const SPARKLE_RAY_COUNT = 10;
	const SPARKLE_TWINKLE_COUNT = 5;

	// От внешнего halo к яркому бело-жёлтому core.
	const GLOW_LAYERS: { width: number; color: number; alpha: number }[] = [
		{ width: 38, color: 0xff3300, alpha: 0.07 },
		{ width: 28, color: 0xff5500, alpha: 0.13 },
		{ width: 20, color: 0xff7700, alpha: 0.24 },
		{ width: 13, color: 0xffaa00, alpha: 0.42 },
		{ width: 7, color: 0xffdd44, alpha: 0.72 },
		{ width: 3.5, color: 0xfff8e8, alpha: 1.0 },
	];

	let activeLines = $state<ActiveLine[]>([]);
	let animTime = $state(0);

	let raf = 0;
	const tick = (now: number) => {
		animTime = now * 0.001;
		for (const line of activeLines) {
			const elapsed = (now - line.startTime) % CYCLE_MS;
			line.progress = Math.min(1, elapsed / DRAW_DURATION_MS);
		}
		if (activeLines.length > 0) {
			raf = requestAnimationFrame(tick);
		} else {
			raf = 0;
		}
	};
	const ensureLoop = () => {
		if (raf === 0 && activeLines.length > 0) {
			raf = requestAnimationFrame(tick);
		}
	};

	context.eventEmitter.subscribeOnMount({
		paylineShow: ({ lineIndex, positions, color, paylineRows }) => {
			const next = activeLines.filter((l) => l.lineIndex !== lineIndex);
			next.push({
				lineIndex,
				positions,
				paylineRows: paylineRows ?? null,
				color: color ?? ENERGY_ORANGE,
				progress: 0,
				startTime: performance.now(),
			});
			activeLines = next;
			ensureLoop();
		},
		paylineHide: ({ lineIndex }) => {
			activeLines = activeLines.filter((l) => l.lineIndex !== lineIndex);
		},
		paylineClearAll: () => {
			activeLines = [];
		},
	});

	onMount(() => {
		return () => {
			if (raf !== 0) cancelAnimationFrame(raf);
		};
	});

	const getCellCenter = (reel: number, paddedRow: number): Point => ({
		x: SYMBOL_SIZE * (reel + 0.5),
		y: SYMBOL_SIZE * (paddedRow - 0.5),
	});

	const getLineAnchors = (line: ActiveLine): Point[] => {
		const { positions, paylineRows } = line;
		return paylineRows
			? paylineRows.map((row, reel) => getCellCenter(reel, row + 1))
			: positions.map((p) => getCellCenter(p.reel, p.row));
	};

	const catmullRomPoint = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
		const t2 = t * t;
		const t3 = t2 * t;
		return {
			x:
				0.5 *
				(2 * p1.x +
					(-p0.x + p2.x) * t +
					(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
					(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
			y:
				0.5 *
				(2 * p1.y +
					(-p0.y + p2.y) * t +
					(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
					(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
		};
	};

	const buildSmoothPath = (anchors: Point[]): Point[] => {
		if (anchors.length === 0) return [];
		if (anchors.length === 1) return [...anchors];
		const samples: Point[] = [];
		for (let i = 0; i < anchors.length - 1; i++) {
			const p0 = anchors[Math.max(0, i - 1)];
			const p1 = anchors[i];
			const p2 = anchors[i + 1];
			const p3 = anchors[Math.min(anchors.length - 1, i + 2)];
			const startStep = i === 0 ? 0 : 1;
			for (let s = startStep; s <= SAMPLES_PER_SEGMENT; s++) {
				samples.push(catmullRomPoint(p0, p1, p2, p3, s / SAMPLES_PER_SEGMENT));
			}
		}
		return samples;
	};

	const buildSegLens = (points: Point[]) => {
		const segLens: number[] = [];
		let total = 0;
		for (let i = 1; i < points.length; i++) {
			const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
			segLens.push(d);
			total += d;
		}
		return { segLens, total };
	};

	const easeInOutCubic = (t: number) =>
		t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

	const smoothstep = (edge0: number, edge1: number, x: number) => {
		const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
		return t * t * (3 - 2 * t);
	};

	/** Маленькая на краях → плавный рост → плато → плавное сужение к концу. */
	const taperScale = (tAlong: number) => {
		const t = Math.min(1, Math.max(0, tAlong));
		if (t <= TAPER_RAMP) {
			return TAPER_MIN + (TAPER_MAX - TAPER_MIN) * smoothstep(0, 1, t / TAPER_RAMP);
		}
		if (t >= 1 - TAPER_RAMP) {
			return TAPER_MIN + (TAPER_MAX - TAPER_MIN) * smoothstep(0, 1, (1 - t) / TAPER_RAMP);
		}
		return TAPER_MAX;
	};

	/** 0 на узлах символов, 1 между ними — линия не «плывёт» с фларов. */
	const anchorWiggleFade = (tAlong: number, anchorCount: number) => {
		if (anchorCount <= 1) return 0;
		const reelFloat = tAlong * (anchorCount - 1);
		const distToAnchor = Math.min(
			reelFloat - Math.floor(reelFloat),
			Math.ceil(reelFloat) - reelFloat,
		);
		return smoothstep(0.06, 0.34, distToAnchor * 2);
	};

	const applyWiggle = (
		basePoints: Point[],
		anchorCount: number,
		lineIndex: number,
		time: number,
		strength = 1,
	): Point[] => {
		if (basePoints.length < 2 || strength <= 0) return basePoints;

		const { segLens, total } = buildSegLens(basePoints);
		const phase = time * WIGGLE_SPEED + lineIndex * 1.85;
		const result: Point[] = [];
		let arcPos = 0;

		for (let i = 0; i < basePoints.length; i++) {
			if (i > 0) arcPos += segLens[i - 1];
			const tAlong = total > 0 ? arcPos / total : 0;
			const p = basePoints[i];

			const prev = basePoints[Math.max(0, i - 1)];
			const next = basePoints[Math.min(basePoints.length - 1, i + 1)];
			const tx = next.x - prev.x;
			const ty = next.y - prev.y;
			const len = Math.hypot(tx, ty) || 1;
			const nx = -ty / len;
			const ny = tx / len;

			const fade = anchorWiggleFade(tAlong, anchorCount);
			const wave =
				Math.sin(tAlong * WIGGLE_WAVES * Math.PI * 2 - phase) +
				0.3 * Math.sin(tAlong * WIGGLE_WAVES * Math.PI * 3.5 - phase * 1.35);
			const offset = WIGGLE_AMPLITUDE * strength * fade * wave;

			result.push({ x: p.x + nx * offset, y: p.y + ny * offset });
		}

		return result;
	};

	const pointAtArcLength = (
		points: Point[],
		segLens: number[],
		target: number,
	): { point: Point; tAlong: number; total: number } => {
		let total = 0;
		for (const len of segLens) total += len;
		if (points.length === 0) return { point: { x: 0, y: 0 }, tAlong: 0, total: 0 };
		if (target <= 0) return { point: points[0], tAlong: 0, total };
		let consumed = 0;
		for (let i = 0; i < segLens.length; i++) {
			const segLen = segLens[i];
			if (consumed + segLen >= target) {
				const remain = target - consumed;
				const t = segLen === 0 ? 0 : remain / segLen;
				return {
					point: {
						x: points[i].x + (points[i + 1].x - points[i].x) * t,
						y: points[i].y + (points[i + 1].y - points[i].y) * t,
					},
					tAlong: total === 0 ? 0 : target / total,
					total,
				};
			}
			consumed += segLen;
		}
		return { point: points[points.length - 1], tAlong: 1, total };
	};

	const traceSubPath = (
		g: PIXI.Graphics,
		points: Point[],
		segLens: number[],
		arcStart: number,
		arcEnd: number,
	) => {
		if (points.length === 0 || arcEnd <= arcStart) return;
		const start = pointAtArcLength(points, segLens, arcStart).point;
		g.moveTo(start.x, start.y);
		let consumed = 0;
		for (let i = 0; i < segLens.length; i++) {
			const segLen = segLens[i];
			const segStart = consumed;
			const segEnd = consumed + segLen;
			if (segEnd <= arcStart) {
				consumed += segLen;
				continue;
			}
			if (segStart >= arcEnd) break;
			if (segEnd <= arcEnd) {
				if (segStart < arcStart) {
					const t = segLen === 0 ? 0 : (arcStart - segStart) / segLen;
					const x = points[i].x + (points[i + 1].x - points[i].x) * t;
					const y = points[i].y + (points[i + 1].y - points[i].y) * t;
					g.lineTo(x, y);
				}
				g.lineTo(points[i + 1].x, points[i + 1].y);
			} else {
				const t = segLen === 0 ? 0 : (arcEnd - segStart) / segLen;
				const x = points[i].x + (points[i + 1].x - points[i].x) * t;
				const y = points[i].y + (points[i + 1].y - points[i].y) * t;
				g.lineTo(x, y);
				break;
			}
			consumed += segLen;
		}
	};

	const drawTaperedGlow = (
		g: PIXI.Graphics,
		points: Point[],
		segLens: number[],
		total: number,
		target: number,
	) => {
		if (total <= 0 || target <= 0) return;
		const chunkLen = total / PATH_CHUNKS;
		for (let c = 0; c < PATH_CHUNKS; c++) {
			const arcStart = c * chunkLen;
			const arcEnd = Math.min((c + 1) * chunkLen, target);
			if (arcEnd <= arcStart) continue;
			const midT = (arcStart + arcEnd) * 0.5 / total;
			const scale = taperScale(midT);
			for (const layer of GLOW_LAYERS) {
				traceSubPath(g, points, segLens, arcStart, arcEnd);
				g.stroke({
					color: layer.color,
					width: layer.width * scale,
					alpha: layer.alpha,
					cap: 'round',
					join: 'round',
				});
			}
		}
	};

	const drawSparkleNode = (
		g: PIXI.Graphics,
		x: number,
		y: number,
		time: number,
		nodeSeed: number,
		intensity = 1,
	) => {
		const phase = time * 5.2 + nodeSeed * 2.13;
		const pulse = 0.7 + 0.3 * Math.sin(phase * 1.55);
		const pulseFast = 0.6 + 0.4 * Math.sin(phase * 2.8 + 0.9);
		const rotation = time * 2.1 + nodeSeed * 0.65;

		g.circle(x, y, 26 * pulse).fill({ color: 0xff4400, alpha: 0.09 * intensity * pulseFast });
		g.circle(x, y, 17 * pulse).fill({ color: 0xff8800, alpha: 0.22 * intensity * pulse });
		g.circle(x, y, 10 * pulseFast).fill({ color: 0xffcc44, alpha: 0.48 * intensity * pulseFast });
		g.circle(x, y, 4.5 * pulse).fill({ color: 0xffffff, alpha: (0.78 + 0.22 * pulseFast) * intensity });

		for (let i = 0; i < SPARKLE_RAY_COUNT; i++) {
			const angle = (i / SPARKLE_RAY_COUNT) * Math.PI * 2 + rotation;
			const rayPulse = 0.45 + 0.55 * Math.sin(phase * 3.4 + i * 1.35);
			const rayLen = (11 + (i % 3) * 5) * (0.65 + 0.35 * rayPulse);
			g.moveTo(x, y);
			g.lineTo(x + Math.cos(angle) * rayLen, y + Math.sin(angle) * rayLen);
			g.stroke({
				color: i % 2 === 0 ? 0xfff4aa : 0xffee66,
				width: 1.4 + rayPulse * 1.6,
				alpha: (0.12 + 0.48 * rayPulse) * intensity,
				cap: 'round',
			});
		}

		for (let t = 0; t < SPARKLE_TWINKLE_COUNT; t++) {
			const twPhase = phase * 3.6 + t * 2.4;
			const twAlpha = Math.max(0, Math.sin(twPhase)) * intensity;
			if (twAlpha < 0.1) continue;
			const twAngle = rotation * 1.35 + (t / SPARKLE_TWINKLE_COUNT) * Math.PI * 2;
			const twDist = 16 + 6 * Math.sin(phase * 1.9 + t);
			g.circle(x + Math.cos(twAngle) * twDist, y + Math.sin(twAngle) * twDist, 1.5 + twAlpha * 2.2).fill({
				color: 0xffffff,
				alpha: twAlpha * 0.95,
			});
		}
	};

	const isWinningAnchor = (
		reel: number,
		paylineRows: number[] | null,
		positions: Position[],
	) => {
		if (!paylineRows) return positions.some((p) => p.reel === reel);
		const paddedRow = paylineRows[reel] + 1;
		return positions.some((p) => p.reel === reel && p.row === paddedRow);
	};

	const isBendAnchor = (reel: number, paylineRows: number[] | null) => {
		if (!paylineRows || paylineRows.length < 2) return true;
		if (reel === 0 || reel === paylineRows.length - 1) return true;
		const row = paylineRows[reel];
		return row !== paylineRows[reel - 1] || row !== paylineRows[reel + 1];
	};

	const sparkleIntensity = (
		reel: number,
		paylineRows: number[] | null,
		positions: Position[],
	) => {
		const winning = isWinningAnchor(reel, paylineRows, positions);
		const bend = isBendAnchor(reel, paylineRows);
		if (winning && bend) return 1.3;
		if (winning) return 1.15;
		if (bend) return 1.0;
		return 0.45;
	};

	const drawIntersectionFlare = (g: PIXI.Graphics, x: number, y: number, time: number, seed: number) => {
		const phase = time * 6 + seed * 1.7;
		const pulse = 0.68 + 0.32 * Math.sin(phase * 1.8);
		const rotation = time * 2.6 + seed;

		g.circle(x, y, 30 * pulse).fill({ color: 0xff3300, alpha: 0.1 * pulse });
		g.circle(x, y, 20 * pulse).fill({ color: 0xff9900, alpha: 0.26 * pulse });
		g.circle(x, y, 11 * pulse).fill({ color: 0xffee66, alpha: 0.58 + 0.2 * pulse });
		g.circle(x, y, 5).fill({ color: 0xffffff, alpha: 0.88 + 0.12 * pulse });

		for (let i = 0; i < 6; i++) {
			const angle = (i / 6) * Math.PI * 2 + rotation;
			const flicker = 0.4 + 0.6 * Math.sin(phase * 4 + i * 1.8);
			g.moveTo(x, y);
			g.lineTo(x + Math.cos(angle) * (20 * flicker), y + Math.sin(angle) * (20 * flicker));
			g.stroke({ color: 0xfff8cc, width: 2 * flicker, alpha: 0.2 + 0.5 * flicker, cap: 'round' });
		}
	};

	const segmentIntersect = (a: Point, b: Point, c: Point, d: Point): Point | null => {
		const denom = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
		if (Math.abs(denom) < 1e-9) return null;
		const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / denom;
		const u = -((a.x - b.x) * (a.y - c.y) - (a.y - b.y) * (a.x - c.x)) / denom;
		if (t < 0.001 || t > 0.999 || u < 0.001 || u > 0.999) return null;
		return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
	};

	const dedupePoints = (points: Point[], epsilon = 6): Point[] => {
		const result: Point[] = [];
		for (const p of points) {
			if (!result.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < epsilon)) {
				result.push(p);
			}
		}
		return result;
	};

	const computePathIntersections = (paths: Point[][]): Point[] => {
		const hits: Point[] = [];
		for (let a = 0; a < paths.length; a++) {
			for (let b = a + 1; b < paths.length; b++) {
				const pathA = paths[a];
				const pathB = paths[b];
				for (let i = 0; i < pathA.length - 1; i++) {
					for (let j = 0; j < pathB.length - 1; j++) {
						const hit = segmentIntersect(pathA[i], pathA[i + 1], pathB[j], pathB[j + 1]);
						if (hit) hits.push(hit);
					}
				}
			}
		}
		return dedupePoints(hits);
	};

	const getFrontX = (points: Point[], segLens: number[], target: number) =>
		pointAtArcLength(points, segLens, target).point.x;

	const drawLine = (line: ActiveLine) => (g: PIXI.Graphics) => {
		const { positions, progress } = line;
		const anchors = getLineAnchors(line);
		if (anchors.length === 0) return;

		const basePoints = buildSmoothPath(anchors);
		const wiggleStrength = progress < 1 ? 0.2 + 0.8 * progress : 1;
		const points = applyWiggle(
			basePoints,
			anchors.length,
			line.lineIndex,
			animTime,
			wiggleStrength,
		);
		const { segLens, total } = buildSegLens(points);
		const target = total * easeInOutCubic(progress);

		drawTaperedGlow(g, points, segLens, total, target);

		if (progress < 1 && target > 0) {
			const tip = pointAtArcLength(points, segLens, target);
			const tipScale = taperScale(tip.tAlong);
			g.circle(tip.point.x, tip.point.y, 10 * tipScale).fill({ color: 0xffcc44, alpha: 0.45 });
			g.circle(tip.point.x, tip.point.y, 5 * tipScale).fill({ color: 0xffffff, alpha: 0.85 });
		}

		const frontX = getFrontX(points, segLens, target);
		for (let reel = 0; reel < anchors.length; reel++) {
			const anchor = anchors[reel];
			if (anchor.x > frontX + 0.5) continue;
			drawSparkleNode(
				g,
				anchor.x,
				anchor.y,
				animTime,
				line.lineIndex * 11 + reel,
				sparkleIntensity(reel, line.paylineRows, positions),
			);
		}
	};

	const activePaths = $derived(
		activeLines.map((line) => buildSmoothPath(getLineAnchors(line))),
	);

	const intersectionPoints = $derived(computePathIntersections(activePaths));

	const drawIntersections = (g: PIXI.Graphics) => {
		for (let i = 0; i < intersectionPoints.length; i++) {
			const p = intersectionPoints[i];
			drawIntersectionFlare(g, p.x, p.y, animTime, i * 3.1);
		}
	};
</script>

{#each activeLines as line (line.lineIndex)}
	<Graphics blendMode="add" draw={drawLine(line)} />
{/each}
{#if intersectionPoints.length > 0}
	<Graphics blendMode="add" draw={drawIntersections} />
{/if}
