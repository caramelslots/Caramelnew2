import _ from 'lodash';
import { Tween } from 'svelte/motion';
import { sineOut, backIn, linear } from 'svelte/easing';

import { stateBet } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';
import { createInterruptible } from 'utils-shared/interruptible';

import type { SpinningReelCreateOptions, SpinningReelSpinOptions, SpinType } from './types';

export type SpinningReelMotion = 'spinning' | 'bouncing' | 'stopped';
export type SpinningReelSymbolState = 'static' | 'land' | 'spin';

export function createReelForSpinning<TRawSymbol extends object, TSymbolState extends string>(
	reelOptions: SpinningReelCreateOptions<TRawSymbol, TSymbolState>,
) {
	// reelSymbols
	const createReelSymbol = (reelSymbolOptions: { rawSymbol: TRawSymbol; symbolIndex: number }) => {
		const rawSymbol = reelSymbolOptions.rawSymbol;
		const symbolIndex = reelSymbolOptions.symbolIndex;
		const symbolState = reelOptions.initialSymbolState;
		const symbolY = () => {
			// Inactive pool items use a large sentinel symbolIndex (POOL_INACTIVE_SENTINEL)
			// so we can skip the reelY.current read entirely — avoiding a per-RAF reactive
			// subscription for every off-screen pre-allocated slot.
			// Active items (symbolIndex < POOL_INACTIVE_SENTINEL) animate normally.
			if (reelSymbol.symbolIndex >= POOL_INACTIVE_SENTINEL) {
				return (reelLength + 1) * reelOptions.symbolHeight;
			}
			return reelY.current + (reelSymbol.symbolIndex + 0.5) * reelOptions.symbolHeight;
		};
		// Per-symbol vertical squash factor driven by the reel-level landSquashY
		// Tween. 1 = no squash; < 1 = compressed vertically.
		const landScaleY = () => landSquashY.current;
		// Horizontal stretch derived from the same landSquashY Tween for a
		// jelly / volume-preservation feel: scaleX = 1 + (1 − scaleY) × multi.
		// Multi = 0 → no stretch (pure Y squash). The two axes are perfectly
		// synchronised because they read the same underlying tween value.
		const landScaleX = () => {
			const stretchMulti = reelState.spinOptions().reelLandSquashStretchMulti ?? 0;
			if (stretchMulti === 0) return 1;
			return 1 + (1 - landSquashY.current) * stretchMulti;
		};
		const oncomplete = () => {};

		const reelSymbol = $state({
			id: {},
			rawSymbol,
			symbolIndex,
			symbolState,
			symbolY,
			landScaleY,
			landScaleX,
			oncomplete,
		});

		return reelSymbol;
	};

	type ReelSymbol = ReturnType<typeof createReelSymbol>;

	const createReelSymbols: (value: TRawSymbol[]) => ReelSymbol[] = (rawSymbols) => {
		const reelSymbols = rawSymbols.map((rawSymbol, symbolIndex) =>
			createReelSymbol({ rawSymbol, symbolIndex }),
		);

		return reelSymbols;
	};

	const updateAllReelSymbolState = (value: SpinningReelSymbolState) => {
		// Iterate only the active portion of the pool (first activeSymbolCount items).
		// Off-screen pool items beyond activeSymbolCount are excluded to avoid
		// triggering their $effects unnecessarily.
		// onSymbolLand fires only for the final settled symbols (first reelLength items).
		for (let i = 0; i < reelState.activeSymbolCount; i++) {
			const reelSymbol = reelState.symbols[i];
			reelSymbol.symbolState = value as TSymbolState;
			if (value === 'land' && i < reelLength) {
				reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol });
			}
		}
	};

	// constants
	const defaultY = -reelOptions.symbolHeight;
	const reelLength = reelOptions.initialSymbols.length;
	// Sentinel symbolIndex for pool items that are currently inactive.
	// Must be larger than any symbolIndex an active spinning symbol can ever have.
	// Max active symbolIndex ≈ maxPoolSize ≈ 60 for a 5-reel anticipated spin,
	// so 100_000 is safely distinct from any real spin layout index.
	const POOL_INACTIVE_SENTINEL = 100_000;

	// Symbol pool pre-allocation.
	// During each spin, reels accumulate padding from previous reels:
	//   reel i needs: reelLength(prev) + (i+1)*paddingPerReel + reelLength(target)
	// Pre-allocating here avoids creating/destroying ReelSymbol components on every
	// spin — component creation triggers $effect initialization which is the main
	// source of the flush_queued_root_effects spikes observed in performance traces.
	// reelPaddingMultiplierNormal = 1.2 (from SPIN_OPTIONS constants).
	const PADDING_PER_REEL_ESTIMATE = Math.ceil(reelLength * 1.2);
	const maxPoolSize =
		reelLength + // prevSymbols
		(reelOptions.reelIndex + 1) * PADDING_PER_REEL_ESTIMATE + // accumulated padding
		reelLength; // targetSymbols
	const extraPoolCount = Math.max(0, maxPoolSize - reelLength);
	const poolExtension = Array.from({ length: extraPoolCount }, (_, i) =>
		createReelSymbol({
			rawSymbol: reelOptions.initialSymbols[i % reelLength],
			// POOL_INACTIVE_SENTINEL keeps these off-screen until activated by updateSymbolsPool.
			// symbolY() short-circuits for sentinel values so they don't subscribe to reelY.
			symbolIndex: POOL_INACTIVE_SENTINEL + i,
		}),
	);

	// interruptible
	const interruptible = createInterruptible();

	// reactive states
	const reelY = new Tween(defaultY);
	// Vertical squash factor (1 = no squash). All symbols on the reel read
	// `.current` via `reelSymbol.landScaleY()` and apply it as scaleY to
	// their wrapper Container — see SymbolWrap. Driven by removePaddingAndBounceBack.
	const landSquashY = new Tween(1);
	const reelState = $state({
		symbols: [...createReelSymbols(reelOptions.initialSymbols), ...poolExtension],
		activeSymbolCount: reelLength,
		motion: 'stopped' as SpinningReelMotion,
		spinType: 'normal' as SpinType,
		anticipating: false,
		readyToSpin: () => {},
		spinOptions: () => ({}) as SpinningReelSpinOptions,
	});
	const basePaddingSize = () => reelLength * reelState.spinOptions().reelPaddingMultiplierNormal;
	const anticipatedPaddingSize = () =>
		reelLength * reelState.spinOptions().reelPaddingMultiplierAnticipated;

	// internal states
	let isPreSpinning = false;
	let targetPaddingPosition = reelLength - 1;
	// Keep prev/target as plain raw-symbol arrays (no $state objects) to avoid
	// creating and immediately discarding $state proxies every pre-spin loop tick.
	let prevRawSymbols: TRawSymbol[] = [...reelOptions.initialSymbols];
	let targetRawSymbols: TRawSymbol[] = [...reelOptions.initialSymbols];
	let paddingRawReel: TRawSymbol[] = reelOptions.initialSymbols;
	let onSpinFinishing: () => void = () => {};
	let noStop = false;
	let paddingSize = 0;

	const getPaddingRawSymbol = ({
		paddingRawReel,
		index,
	}: {
		paddingRawReel: TRawSymbol[];
		index: number;
	}) => {
		const length = paddingRawReel.length;
		if (index >= length) return paddingRawReel[index % length];
		if (index <= -1) return paddingRawReel[length + index];
		return paddingRawReel[index];
	};

	const getPaddingRawSymbols = ({
		paddingRawReel,
		start,
		length,
	}: {
		paddingRawReel: TRawSymbol[];
		start: number;
		length: number;
	}) =>
		_.range(length).map((index) => {
			const targetIndex = start + index;
			return getPaddingRawSymbol({ paddingRawReel, index: targetIndex });
		});

	// Updates pool items in-place instead of replacing the array.
	// Takes a flat layout of raw symbols — no intermediate ReelSymbol[] allocations.
	//   - rawSymbol and symbolIndex are set directly from layout
	//   - symbolState is NOT touched — managed by updateAllReelSymbolState
	//   - pool items beyond layout.length get a large symbolIndex → inFrame = false
	//   - pool grows (push) only when an anticipated spin exceeds pre-allocated size
	const updateSymbolsPool = (layout: TRawSymbol[]) => {
		const newLen = layout.length;

		// Grow only when needed (anticipated spin exceeds pre-allocated pool size)
		while (reelState.symbols.length < newLen) {
			reelState.symbols.push(
				createReelSymbol({
					rawSymbol: reelOptions.initialSymbols[0],
					// Start with sentinel so symbolY doesn't subscribe to reelY until activated.
					symbolIndex: POOL_INACTIVE_SENTINEL + reelState.symbols.length,
				}),
			);
		}

		// Update active items in-place: rawSymbol + position.
		// Write rawSymbol unconditionally (content changes every spin).
		// Write symbolIndex only when it actually changes to avoid triggering
		// symbolY() re-evaluation on items that are staying in the same slot.
		for (let i = 0; i < newLen; i++) {
			reelState.symbols[i].rawSymbol = layout[i];
			if (reelState.symbols[i].symbolIndex !== i) {
				reelState.symbols[i].symbolIndex = i;
			}
		}

		// Deactivate items beyond the new layout — but only those that are NOT
		// already at their sentinel value. This avoids reactive writes (and the
		// downstream symbolY / inFrame / visible recomputations) for pool items
		// that are already parked off-screen from a previous updateSymbolsPool call.
		for (let i = newLen; i < reelState.symbols.length; i++) {
			if (reelState.symbols[i].symbolIndex < POOL_INACTIVE_SENTINEL) {
				reelState.symbols[i].symbolIndex = POOL_INACTIVE_SENTINEL + i;
			}
		}

		// Skip the write when the count didn't change (common during pre-spin loop).
		if (reelState.activeSymbolCount !== newLen) {
			reelState.activeSymbolCount = newLen;
		}
	};

	const addPadding = async (paddingSizeValue: number) => {
		const paddingRawSymbols = getPaddingRawSymbols({
			paddingRawReel,
			start: targetPaddingPosition,
			length: paddingSizeValue,
		});
		// Build flat layout: [target, padding, prev] — all plain TRawSymbol[], no $state allocation
		const layout: TRawSymbol[] = [...targetRawSymbols, ...paddingRawSymbols, ...prevRawSymbols];
		updateSymbolsPool(layout);

		const topY =
			defaultY -
			layout.length * reelOptions.symbolHeight +
			reelLength * reelOptions.symbolHeight;
		return topY;
	};

	const slideY = async ({
		reelY: targetY,
		speed,
		easing = undefined,
	}: {
		reelY: number;
		speed: number;
		easing?: (value: number) => number;
	}) => {
		const currentY = reelY.current;
		const distance = Math.abs(targetY - currentY);
		const duration = distance / speed; // (speed unit: pixel / ms)

		await reelY.set(targetY, { duration, easing });
	};

	const placeY = (targetY: number) => reelY.set(targetY, { duration: 0 });

	const removePaddingAndBounceBack = async () => {
		// Deactivate padding — pool items beyond targetRawSymbols move off-screen.
		updateSymbolsPool(targetRawSymbols);
		const opts = reelState.spinOptions();
		const overshoot = reelOptions.symbolHeight * opts.reelBounceSizeMulti;

		placeY(defaultY + overshoot);

		// Vertical squash on impact (Y-only, X is unaffected). Snap to the
		// squashed scale at the moment the reel hits its overshoot, then
		// fire-and-forget ease back to 1 in parallel with the bounce-back.
		const squashTarget = opts.reelLandSquashY ?? 1;
		const squashRecoveryMs = opts.reelLandSquashRecoveryMs ?? 220;
		if (squashTarget < 1) {
			landSquashY.set(squashTarget, { duration: 0 });
			void landSquashY.set(1, { duration: squashRecoveryMs, easing: sineOut });
		}

		// Optional damped-oscillation settle (opt-in via spinOptions).
		// secondaryMulti > 0 → two-stage settle: ease past defaultY upward
		// to a smaller secondary overshoot, then ease back down to defaultY.
		// This produces the classic slot-machine "drop and rebound" inertia.
		const secondaryMulti = opts.reelSettleSecondaryMulti ?? 0;
		const secondarySpeedMulti = opts.reelSettleSecondarySpeedMulti ?? 1;

		if (secondaryMulti > 0) {
			await slideY({
				reelY: defaultY - overshoot * secondaryMulti,
				speed: opts.reelBounceBackSpeed,
				easing: sineOut,
			});
			await slideY({
				reelY: defaultY,
				speed: opts.reelBounceBackSpeed * secondarySpeedMulti,
				easing: sineOut,
			});
		} else {
			await slideY({
				reelY: defaultY,
				speed: opts.reelBounceBackSpeed,
				easing: sineOut,
			});
		}

		setSymbolsWithReelSymbols(targetRawSymbols);
	};

	const preSpinPadding = async ({
		preSpinPaddingRawReel,
	}: {
		preSpinPaddingRawReel: TRawSymbol[];
	}) => {
		const randomStart = Math.floor(Math.random() * preSpinPaddingRawReel.length);
		prevRawSymbols = targetRawSymbols;
		targetRawSymbols = getPaddingRawSymbols({
			paddingRawReel: preSpinPaddingRawReel,
			start: randomStart,
			length: reelLength,
		});
		const topY = await addPadding(0);
		await placeY(topY);
	};

	const preSpinSlideDownLoop = async ({
		isTurboBeforeAll,
		preSpinPaddingRawReel,
	}: {
		isTurboBeforeAll: boolean;
		preSpinPaddingRawReel: TRawSymbol[];
	}) => {
		let started = false;
		while (isPreSpinning) {
			const speed = started
				? reelState.spinOptions().reelSpinSpeed
				: reelState.spinOptions().reelPreSpinSpeed;
			const easing = started || isTurboBeforeAll ? linear : backIn;
			const preSpinRotations = reelState.spinOptions().reelPreSpinRotations;
			const preSpinTargetY =
				preSpinRotations === undefined
					? defaultY
					: reelY.current + preSpinRotations * reelOptions.symbolHeight;
			await slideY({ reelY: preSpinTargetY, speed, easing });
			// Signal readiness directly instead of polling via $effect.
			// waitForResolve in createEnhanceBoardSpin sets readyToSpin = resolve;
			// calling it here (instead of from the polling effect) is safe because:
			//   - when readyToSpin = () => {} (default): no-op
			//   - when readyToSpin = resolve (set by waitForResolve): resolves the promise
			//   - after the promise resolves the second call is harmless
			reelState.readyToSpin();
			await preSpinPadding({ preSpinPaddingRawReel });
			if (!started) {
				reelState.motion = 'spinning';
				updateAllReelSymbolState('spin');
				started = true;
			}
		}
	};

	const delaySpinByReelIndex = async () => {
		await waitForTimeout(reelState.spinOptions().reelSpinDelay * reelOptions.reelIndex);
	};

	const preSpin = async ({
		isTurboBeforeAll,
		preSpinPaddingReel,
	}: {
		isTurboBeforeAll: boolean; // To avoid previous spinType has effect on "getSpinOption" in "preSpinSlideDownLoop"
		preSpinPaddingReel: TRawSymbol[];
	}) => {
		const preSpinPaddingRawReel = preSpinPaddingReel;

		isPreSpinning = true;
		reelState.spinType = isTurboBeforeAll ? 'fast' : 'normal';
		await preSpinPadding({ preSpinPaddingRawReel });
		if (!isTurboBeforeAll) await delaySpinByReelIndex();
		preSpinSlideDownLoop({ isTurboBeforeAll, preSpinPaddingRawReel });
	};

	const generalSpinWith = async ({ slideDown }: { slideDown: () => Promise<void> }) => {
		const isSpinning = reelState.motion === 'spinning';

		const topY = await addPadding(paddingSize);
		await placeY(topY);

		if (!isSpinning) {
			reelState.motion = 'spinning';
			updateAllReelSymbolState('spin');
		}

		// Q: When to skip the slideDown?
		// A: When it's preSpinning(isSpinning) and stop button is clicked(isTurbo) and is noStop is false
		if (noStop) {
			await slideDown();
		} else if (stateBet.isTurbo && isSpinning) {
			// skip
		} else {
			await interruptible.add(slideDown);
		}

		reelState.motion = 'bouncing';
		onSpinFinishing();
		await removePaddingAndBounceBack();
		reelState.motion = 'stopped';
		updateAllReelSymbolState('land');
	};

	const fastSpin = () =>
		generalSpinWith({
			slideDown: async () => {
				const bounceSize = reelOptions.symbolHeight * reelState.spinOptions().reelBounceSizeMulti;

				await slideY({
					reelY: defaultY + bounceSize,
					speed: reelState.spinOptions().reelSpinSpeed,
				});
			},
		});

	const getMainSpinTargetY = () => {
		const spinRotations = reelState.spinOptions().reelSpinRotations;
		if (spinRotations === undefined) return defaultY * basePaddingSize();
		return reelY.current + spinRotations * reelOptions.symbolHeight;
	};

	const normalSpin = () =>
		generalSpinWith({
			slideDown: async () => {
				const bounceSize = reelOptions.symbolHeight * reelState.spinOptions().reelBounceSizeMulti;

				await slideY({
					reelY: getMainSpinTargetY(),
					speed: reelState.spinOptions().reelSpinSpeed,
				});
				await slideY({
					reelY: defaultY + bounceSize,
					speed: reelState.spinOptions().reelSpinSpeedBeforeBounce,
				});
			},
		});

	const anticipatedSpin = () =>
		generalSpinWith({
			slideDown: async () => {
				const bounceSize = reelOptions.symbolHeight * reelState.spinOptions().reelBounceSizeMulti;

				await slideY({
					reelY: getMainSpinTargetY(),
					speed: reelState.spinOptions().reelSpinSpeed,
				});
				await slideY({
					reelY: defaultY + bounceSize,
					speed: reelState.spinOptions().reelSpinSpeedBeforeBounce,
				});
			},
		});

	const SPIN_MAP = {
		fast: fastSpin,
		normal: normalSpin,
		anticipated: anticipatedSpin,
	};

	const prepareToSpin = (prepareToSpinOptions: {
		noStop: boolean;
		spinType: SpinType;
		symbols: TRawSymbol[];
		paddingPosition: number;
		paddingReel: TRawSymbol[];
		onSpinFinishing: () => void;
		previousPaddingSize: number;
	}) => {
		reelState.spinType = prepareToSpinOptions.spinType;

		noStop = prepareToSpinOptions.noStop;
		prevRawSymbols = targetRawSymbols;
		targetPaddingPosition = prepareToSpinOptions.paddingPosition;
		targetRawSymbols = prepareToSpinOptions.symbols;
		paddingRawReel = prepareToSpinOptions.paddingReel;
		onSpinFinishing = prepareToSpinOptions.onSpinFinishing;

		const GET_PADDING_SIZE_MAP = {
			fast: prepareToSpinOptions.previousPaddingSize + 0,
			normal: prepareToSpinOptions.previousPaddingSize + basePaddingSize(),
			anticipated: prepareToSpinOptions.previousPaddingSize + anticipatedPaddingSize(),
		};

		paddingSize = GET_PADDING_SIZE_MAP[prepareToSpinOptions.spinType];

		return paddingSize;
	};

	const spin = async () => {
		isPreSpinning = false;

		await SPIN_MAP[reelState.spinType]();

		interruptible.clear();
	};

	const setSymbolsWithReelSymbols = (rawSymbols?: TRawSymbol[]) => {
		reelState.motion = 'stopped';
		placeY(defaultY);
		// Direct call replaces the polling $effect approach.
		reelState.readyToSpin();
		if (rawSymbols) {
			prevRawSymbols = [...rawSymbols];
			targetRawSymbols = [...rawSymbols];
			paddingRawReel = reelOptions.initialSymbols;
			updateSymbolsPool(rawSymbols);
		}
	};

	const setSymbolsWithRawSymbols = (rawSymbols?: TRawSymbol[]) => {
		setSymbolsWithReelSymbols(rawSymbols);
	};

	const stop = () => {
		interruptible.interrupt();
	};

	const readyToSpinEffect = () => {
		// readyToSpin() is now called directly in preSpinSlideDownLoop (after each
		// slideY) and in setSymbolsWithReelSymbols — no polling $effect needed.
	};

	return {
		// from options
		reelIndex: reelOptions.reelIndex,
		symbolHeight: reelOptions.symbolHeight,
		onReelStopping: reelOptions.onReelStopping,
		reelLength,
		// reactive states
		reelState,
		// methods
		preSpin,
		prepareToSpin,
		spin,
		stop,
		setSymbolsWithRawSymbols,
		readyToSpinEffect,
	};
}
