<script lang="ts">
	/**
	 * Mask for the desk overlay: outer frame + vertical gold rails only.
	 * Column holes include a short runway below the reel grid so the overlay
	 * does not cover symbols in the black gap above the gold bar — symbols
	 * stay visible there, then tuck under the gold (overlay bottom strip).
	 */
	import { Graphics } from 'pixi-svelte';
	import type * as PIXI from 'pixi.js';

	import {
		BOARD_DESK_CONTENT,
		BOARD_DIMENSIONS,
		BOARD_MASK_OVERFLOW,
		DESK_PARCHMENT,
		DESK_PARCHMENT_PADDING,
	} from '../game/constants';

	type Props = {
		slotWidth: number;
		slotHeight: number;
		boardWidth: number;
		boardHeight: number;
	};

	/**
	 * Gold divider thickness as a fraction of desk content width.
	 * Slightly wider than the art stroke so every rail fully covers symbols
	 * (right-hand rails were leaving cord/edges peeking through).
	 */
	const DIVIDER_WIDTH_FRAC = 26 / BOARD_DESK_CONTENT.width;

	const props: Props = $props();

	const draw = $derived((g: PIXI.Graphics) => {
		const sw = props.slotWidth;
		const sh = props.slotHeight;
		const pfW = props.boardWidth * DESK_PARCHMENT_PADDING.width;
		// Hole extends through the black gap above the gold bar (same runway as
		// BoardMask bottom) so overlay dark fill does not fake-clip symbols early.
		const pfH =
			props.boardHeight * DESK_PARCHMENT_PADDING.height + BOARD_MASK_OVERFLOW.bottom;
		const pfCx = DESK_PARCHMENT.offsetXFrac * sw;
		const pfCy = DESK_PARCHMENT.offsetYFrac * sh;
		// Keep top aligned with padded playfield; extra height grows downward only.
		const pfTop =
			pfCy - (props.boardHeight * DESK_PARCHMENT_PADDING.height) / 2;
		const pfLeft = pfCx - pfW / 2;
		const pfRight = pfCx + pfW / 2;
		const pfBottom = pfTop + pfH;
		const cols = BOARD_DIMENSIONS.x;
		const colW = pfW / cols;
		const gap = Math.max(2, sw * DIVIDER_WIDTH_FRAC);

		// Outer frame (everything outside the playfield holes).
		g.rect(-sw / 2, -sh / 2, sw, pfTop + sh / 2); // top
		g.rect(-sw / 2, pfBottom, sw, sh / 2 - pfBottom); // bottom (covers gold bar)
		g.rect(-sw / 2, pfTop, pfLeft + sw / 2, pfH); // left
		g.rect(pfRight, pfTop, sw / 2 - pfRight, pfH); // right

		// Vertical gold rails between columns.
		for (let i = 1; i < cols; i++) {
			const cx = pfLeft + i * colW;
			g.rect(cx - gap / 2, pfTop, gap, pfH);
		}

		g.fill(0xffffff);
	});
</script>

<Graphics isMask {draw} />
