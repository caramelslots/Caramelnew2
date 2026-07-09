import { stateBet } from 'state-shared';
import { waitForAnimationFrame, waitForResolve } from 'utils-shared/wait';

import { stateSlots } from './stateSlots.svelte';
import type { Reel, GetRawSymbolFromReel } from './types';

export function createEnhanceBoardSpin<TReel extends Reel<any, any>>({
	board,
}: {
	board: TReel[];
}) {
	type TRawSymbol = GetRawSymbolFromReel<TReel>;

	type BaseRevealEvent = {
		index: number;
		type: 'reveal';
		board: TRawSymbol[][];
		anticipation: number[];
		paddingPositions?: number[];
	};

	async function spin<RevealEvent extends BaseRevealEvent>({
		revealEvent,
		paddingBoard,
		frozenReelIndices = [],
	}: {
		revealEvent: RevealEvent;
		paddingBoard?: TRawSymbol[][];
		/** Reel indices that must not spin this round (e.g. frozen Mystery reels). */
		frozenReelIndices?: number[];
	}) {
		if (stateSlots.isPreSpinning) {
			await Promise.all(
				board.map(async (reel) => {
					await waitForResolve((resolve) => (reel.reelState.readyToSpin = resolve));
				}),
			);
		}

		stateSlots.isPreSpinning = false;

		const globalSpinType = stateBet.isTurbo ? 'fast' : 'normal';
		const globalHasAnticipation = revealEvent.anticipation.some(Boolean);
		const firstAnticipatedReelIndex = revealEvent.anticipation.findIndex(Boolean);
		const getSpinType = ({
			noStop,
			isAnticipated,
		}: {
			noStop: boolean;
			isAnticipated: boolean;
		}) => {
			if (isAnticipated) return 'anticipated';
			if (noStop) return 'normal';
			return globalSpinType;
		};

		board.reduce((previousPaddingSize, reel, reelIndex) => {
			// Frozen reels (e.g. Mystery reels after first reveal) stay in place.
			if (frozenReelIndices.includes(reelIndex)) return previousPaddingSize;

			const noStop = globalHasAnticipation && reelIndex >= firstAnticipatedReelIndex;
			const isAnticipated = (revealEvent.anticipation?.[reelIndex] || 0) > 0;
			const spinType = getSpinType({ noStop, isAnticipated });
			const symbols = revealEvent.board[reelIndex] as TRawSymbol[];
			const paddingReel = paddingBoard?.[reelIndex];
			const paddingPosition = revealEvent?.paddingPositions?.[reelIndex];

			const paddingSize = reel.prepareToSpin({
				noStop,
				spinType,
				symbols,
				// @ts-ignore Ignored because paddingReel is not required by createCascadingReel
				paddingReel,
				// @ts-ignore Ignored because paddingPosition is not required by createCascadingReel
				paddingPosition,
				previousPaddingSize,
				onSpinFinishing: () => {
					reel.onReelStopping();
					const nextReelIndex = reelIndex + 1;
					const isNextReelAnticipated = (revealEvent.anticipation?.[nextReelIndex] || 0) > 0;
					if (isNextReelAnticipated) board[nextReelIndex].reelState.anticipating = true;
				},
			});

			return paddingSize;
		}, 0);

		// Kick off each reel on its own frame so updateSymbolsPool + symbolState
		// flips don't land in one Svelte+GC frame (mobile traces: 80–200ms hitches).
		// Hold-scroll games use parallel handoff — rAF stagger made each column
		// freeze for a couple of frames in a left-to-right wave at RGS response.
		const useParallelHandoff = board.some(
			(reel) => reel.reelState.spinOptions().reelPreSpinHoldRotations !== undefined,
		);
		if (useParallelHandoff) {
			await Promise.all(
				board.map((reel, reelIndex) => {
					if (frozenReelIndices.includes(reelIndex)) return Promise.resolve();
					return reel.spin();
				}),
			);
		} else {
			const spinPromises: Promise<void>[] = [];
			for (let reelIndex = 0; reelIndex < board.length; reelIndex++) {
				if (frozenReelIndices.includes(reelIndex)) continue;
				spinPromises.push(board[reelIndex].spin());
				if (reelIndex < board.length - 1) {
					await waitForAnimationFrame();
				}
			}
			await Promise.all(spinPromises);
		}
	}

	return { spin };
}
