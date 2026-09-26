import { stateBet } from 'state-shared';
import { waitForAnimationFrame } from 'utils-shared/wait';

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

		// Stagger pool swaps across frames when games opt into mount settle —
		// five reels flipping Spine→WebP in one tick is a common phone hitch.
		const staggerMounts = board.some((reel) => {
			const frames = reel.reelState.spinOptions?.()?.reelSpinMountSettleFrames;
			return typeof frames === 'number' && frames > 0;
		});

		const tasks: Promise<void>[] = [];
		for (let reelIndex = 0; reelIndex < board.length; reelIndex++) {
			if (frozenReelIndices.includes(reelIndex)) continue;
			// @ts-ignore Ignored because paddingReel is not required by createCascadingReel
			tasks.push(
				board[reelIndex].preSpin({
					isTurboBeforeAll,
					preSpinPaddingReel: paddingBoard?.[reelIndex],
				}),
			);
			if (staggerMounts && reelIndex < board.length - 1) {
				await waitForAnimationFrame();
			}
		}
		await Promise.all(tasks);
	};

	return { preSpin };
}
