import { stateBet } from 'state-shared';

import type { Reel, GetRawSymbolFromReel } from './types';
import { stateSlots } from './stateSlots.svelte';

export function createEnhanceBoardPreSpin<TReel extends Reel<any, any>>({
	board,
}: {
	board: TReel[];
}) {
	type TRawSymbol = GetRawSymbolFromReel<TReel>;

	const preSpin = async ({
		paddingBoard,
		frozenReelIndices = [],
	}: {
		paddingBoard?: TRawSymbol[][];
		/** Reel indices that must not pre-spin (e.g. sticky Super Wild columns). */
		frozenReelIndices?: number[];
	}) => {
		stateSlots.isPreSpinning = true;

		const isTurboBeforeAll = stateBet.isTurbo;

		await Promise.all(
			board.map((reel, reelIndex) => {
				if (frozenReelIndices.includes(reelIndex)) return Promise.resolve();
				// @ts-ignore Ignored because paddingReel is not required by createCascadingReel
				return reel.preSpin({ isTurboBeforeAll, preSpinPaddingReel: paddingBoard?.[reelIndex] });
			}),
		);
	};

	return { preSpin };
}
