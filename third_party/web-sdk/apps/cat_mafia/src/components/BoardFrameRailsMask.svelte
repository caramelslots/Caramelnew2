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
		/** `all` — frame + rails (default). `frame` / `rails` split for target pick. */
		variant?: 'all' | 'frame' | 'rails';
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
		const playH = props.boardHeight * DESK_PARCHMENT_PADDING.height;
		const variant = props.variant ?? 'all';
		// Normal play: hole includes the 11px runway so symbols tuck under the
		// gold bar. Target pick (`frame`): same flush bottom as the top — that
		// runway is exactly where the gold lines leak under the cabinet.
		const pfH = variant === 'frame' ? playH : playH + BOARD_MASK_OVERFLOW.bottom;
		const pfCx = DESK_PARCHMENT.offsetXFrac * sw;
		const pfCy = DESK_PARCHMENT.offsetYFrac * sh;
		const pfTop = pfCy - playH / 2;
		const pfLeft = pfCx - pfW / 2;
		const pfRight = pfCx + pfW / 2;
		const pfBottom = pfTop + pfH;
		const cols = BOARD_DIMENSIONS.x;
		const colW = pfW / cols;
		const gap = Math.max(2, sw * DIVIDER_WIDTH_FRAC);

		g.clear();

		if (variant !== 'rails') {
			g.rect(-sw / 2, -sh / 2, sw, pfTop + sh / 2);
			g.rect(-sw / 2, pfBottom, sw, sh / 2 - pfBottom);
			g.rect(-sw / 2, pfTop, pfLeft + sw / 2, pfH);
			g.rect(pfRight, pfTop, sw / 2 - pfRight, pfH);
		}

		if (variant !== 'frame') {
			for (let i = 1; i < cols; i++) {
				const cx = pfLeft + i * colW;
				g.rect(cx - gap / 2, pfTop, gap, pfH);
			}
		}

		g.fill(0xffffff);
	});
</script>

<Graphics isMask {draw} />
