<!--
	PaylineOverlay.svelte — рендерит активные paylines поверх доски (PIXI Graphics).
	Подписывается на события paylineShow / paylineHide / paylineClear.
	Используется winInfo handler: для каждого выигрышного payline сначала
	показывается линия (через cell centers), потом анимируются символы.
-->
<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventPaylineOverlay =
		| {
				type: 'paylineShow';
				lineIndex: number;
				positions: Position[];
				color?: number;
		  }
		| { type: 'paylineHide'; lineIndex: number }
		| { type: 'paylineClearAll' };
</script>

<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();

	type ActiveLine = {
		lineIndex: number;
		positions: Position[];
		color: number;
	};

	const LINE_COLORS = [
		0xffd000, 0xff5e5e, 0x4dd0e1, 0xab47bc, 0x66bb6a, 0xff9a3c, 0xe91e63, 0x29b6f6, 0xffa726,
		0x9ccc65,
	];

	let activeLines = $state<ActiveLine[]>([]);

	context.eventEmitter.subscribeOnMount({
		paylineShow: ({ lineIndex, positions, color }) => {
			const next = activeLines.filter((l) => l.lineIndex !== lineIndex);
			next.push({
				lineIndex,
				positions,
				color: color ?? LINE_COLORS[lineIndex % LINE_COLORS.length],
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

	const getCellCenter = (reel: number, row: number) => ({
		// SDK math-events эмитят positions в PADDED координатах (см.
		// math-sdk/src/events/events.py:140 — win_info_event добавляет +1 к row).
		// row=1 = первая видимая строка, row=numRows = последняя.
		// BoardContainer.pivot спивотирован на видимую доску, поэтому компенсируем -1.
		x: SYMBOL_SIZE * (reel + 0.5),
		y: SYMBOL_SIZE * (row - 0.5),
	});

	const drawLine = (positions: Position[], color: number) => (g: PIXI.Graphics) => {
		if (positions.length === 0) return;
		const first = getCellCenter(positions[0].reel, positions[0].row);
		g.moveTo(first.x, first.y);
		for (let i = 1; i < positions.length; i++) {
			const c = getCellCenter(positions[i].reel, positions[i].row);
			g.lineTo(c.x, c.y);
		}
		g.stroke({ color, width: 4, alpha: 0.9 });
		// Точки в каждой выигрышной позиции.
		for (const p of positions) {
			const c = getCellCenter(p.reel, p.row);
			g.circle(c.x, c.y, 7).fill({ color, alpha: 0.85 });
		}
	};
</script>

{#each activeLines as line (line.lineIndex)}
	<Graphics draw={drawLine(line.positions, line.color)} />
{/each}
