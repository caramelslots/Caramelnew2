import _ from 'lodash';
import { Tween } from 'svelte/motion';
import { sineOut, backIn, linear } from 'svelte/easing';

import { stateBet } from 'state-shared';
import { waitForAnimationFrame, waitForTimeout } from 'utils-shared/wait';
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

	// Batched only for `spin` — spreads Svelte flushes when a reel has a large pool.
	const SPIN_STATE_BATCH_SIZE = 10;

	const updateAllReelSymbolState = async (value: SpinningReelSymbolState) => {
		const count = reelState.activeSymbolCount;
		const batchSize =
			value === 'spin' && count > SPIN_STATE_BATCH_SIZE ? SPIN_STATE_BATCH_SIZE : count;

		// Iterate only the active portion of the pool (first activeSymbolCount items).
		// Off-screen pool items beyond activeSymbolCount are excluded to avoid
		// triggering their $effects unnecessarily.
		// onSymbolLand fires only for the final settled symbols (first reelLength items).
		// Games with top/bottom padding should ignore land sounds on padding rows —
		// see `symbolIndex` / `activeSymbolCount` in the callback args.
		for (let start = 0; start < count; start += batchSize) {
			const end = Math.min(start + batchSize, count);
			for (let i = start; i < end; i++) {
				const reelSymbol = reelState.symbols[i];
				reelSymbol.symbolState = value as TSymbolState;
				if (value === 'land' && i < reelLength) {
					reelOptions.onSymbolLand({
						rawSymbol: reelSymbol.rawSymbol,
						symbolIndex: i,
						activeSymbolCount: count,
					});
				}
			}
			if (end < count) {
				await waitForAnimationFrame();
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
	let hasSignaledReady = false;
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
		// Skip rawSymbol writes when content is unchanged — Mystery columns
		// (all `M`) otherwise re-trigger spine remounts on landing pool trim.
		// Write symbolIndex only when it actually changes to avoid triggering
		// symbolY() re-evaluation on items that are staying in the same slot.
		for (let i = 0; i < newLen; i++) {
			if (!_.isEqual(reelState.symbols[i].rawSymbol, layout[i])) {
				reelState.symbols[i].rawSymbol = layout[i];
			}
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

	// Synchronous on purpose: the pool swap (updateSymbolsPool) must be applied
	// in the SAME synchronous batch as the follow-up reel reposition (placeY).
	// If an `await` sits between them, Svelte can flush a render with the new
	// symbols still at the old reel position — i.e. symbols visibly "swap in
	// place" on the board before the reel snaps offscreen.
	const addPadding = (paddingSizeValue: number) => {
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
		durationMs,
		easing = undefined,
	}: {
		reelY: number;
		speed?: number;
		durationMs?: number;
		easing?: (value: number) => number;
	}) => {
		const currentY = reelY.current;
		const distance = Math.abs(targetY - currentY);
		// `durationMs` (when provided) pins the slide to a fixed time; otherwise the
		// time is derived from `speed` (pixel / ms) as distance / speed.
		const duration = durationMs ?? distance / (speed as number);

		await reelY.set(targetY, { duration, easing });
	};

	/**
	 * Like slideY but re-reads target and speed every frame via getters.
	 * Used when reel scroll speed or distance can change mid-slide (cat anticipation).
	 */
	const slideDynamic = async ({
		getTargetY,
		getSpeed,
	}: {
		getTargetY: () => number;
		getSpeed: () => number;
	}) => {
		let currentSpeed = getSpeed();
		let lastTargetY = getTargetY();

		const driveToTarget = () => {
			const targetY = getTargetY();
			const remaining = Math.abs(reelY.current - targetY);
			if (remaining < 0.5) return false;
			currentSpeed = getSpeed();
			lastTargetY = targetY;
			reelY.set(targetY, { duration: remaining / currentSpeed });
			return true;
		};

		if (!driveToTarget()) return;

		while (true) {
			await waitForAnimationFrame();
			if (reelState.motion !== 'spinning') break;
			const targetY = getTargetY();
			const remaining = Math.abs(reelY.current - targetY);
			if (remaining < 0.5) break;
			const newSpeed = getSpeed();
			if (newSpeed !== currentSpeed || targetY !== lastTargetY) {
				currentSpeed = newSpeed;
				lastTargetY = targetY;
				reelY.set(targetY, { duration: remaining / newSpeed });
			}
		}
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

		// When `reelSettleDurationMs` is set, the whole bounce-back lasts exactly
		// that many ms (speed no longer matters). For the two-stage settle the
		// time is split between the stages in proportion to their travel distance,
		// so the motion stays continuous.
		const settleDurationMs = opts.reelSettleDurationMs;

		if (secondaryMulti > 0) {
			const distanceStage1 = overshoot * (1 + secondaryMulti);
			const distanceStage2 = overshoot * secondaryMulti;
			const distanceTotal = distanceStage1 + distanceStage2;
			await slideY({
				reelY: defaultY - overshoot * secondaryMulti,
				speed: opts.reelBounceBackSpeed,
				durationMs:
					settleDurationMs === undefined
						? undefined
						: settleDurationMs * (distanceStage1 / distanceTotal),
				easing: sineOut,
			});
			await slideY({
				reelY: defaultY,
				speed: opts.reelBounceBackSpeed * secondarySpeedMulti,
				durationMs:
					settleDurationMs === undefined
						? undefined
						: settleDurationMs * (distanceStage2 / distanceTotal),
				easing: sineOut,
			});
		} else {
			await slideY({
				reelY: defaultY,
				speed: opts.reelBounceBackSpeed,
				durationMs: settleDurationMs,
				easing: sineOut,
			});
		}

		setSymbolsWithReelSymbols(targetRawSymbols);
	};

	const stopPreSpin = () => {
		isPreSpinning = false;
		// Cut an in-flight hold-chunk tween so main-spin handoff does not wait
		// for the slide to finish (~100ms hitch when RGS lands mid-chunk).
		reelY.set(reelY.current, { duration: 0 });
	};

	const preSpinPadding = async ({
		preSpinPaddingRawReel,
	}: {
		preSpinPaddingRawReel: TRawSymbol[];
	}) => {
		if (!isPreSpinning) return;
		const randomStart = Math.floor(Math.random() * preSpinPaddingRawReel.length);
		prevRawSymbols = targetRawSymbols;
		targetRawSymbols = getPaddingRawSymbols({
			paddingRawReel: preSpinPaddingRawReel,
			start: randomStart,
			length: reelLength,
		});
		// Keep the pool swap (addPadding) and the reposition (placeY) in one
		// synchronous batch so no frame renders the new symbols at the old
		// position — see addPadding's note on in-place symbol swaps.
		const topY = addPadding(0);
		placeY(topY);
	};

	// Match SymbolWrap culling: top = -h, bottom = (visibleRows + 1) * h.
	// SDK boards store reelLength symbols with ~2 off-screen rows above/below.
	const getSymbolCullingWindow = () => {
		const h = reelOptions.symbolHeight;
		const visibleRows = Math.max(1, reelLength - 2);
		return { top: -h, bottom: h * (visibleRows + 1) };
	};

	// Hold-scroll drifts reelY without preSpinPadding's placeY(topY) reset.
	// Once reelY leaves the culling window every pool index is off-screen and
	// SymbolWrap hides all symbols. Prepend one padding row + placeY(-h) keeps
	// on-screen symbols fixed (same math as legacy seamless prepend).
	const recycleOneHoldScrollRow = ({
		preSpinPaddingRawReel,
	}: {
		preSpinPaddingRawReel: TRawSymbol[];
	}) => {
		const h = reelOptions.symbolHeight;
		const count = reelState.activeSymbolCount;
		if (count === 0) return;

		const randomIndex = Math.floor(Math.random() * preSpinPaddingRawReel.length);
		const newRow = getPaddingRawSymbol({
			paddingRawReel: preSpinPaddingRawReel,
			index: randomIndex,
		});
		const currentContent = reelState.symbols.slice(0, count).map((reelSymbol) => reelSymbol.rawSymbol);
		const layout: TRawSymbol[] = [newRow, ...currentContent.slice(0, -1)];
		updateSymbolsPool(layout);
		placeY(reelY.current - h);
	};

	const recycleHoldScrollToWindow = ({
		preSpinPaddingRawReel,
	}: {
		preSpinPaddingRawReel: TRawSymbol[];
	}) => {
		const h = reelOptions.symbolHeight;
		const { bottom } = getSymbolCullingWindow();
		const maxReelY = bottom - 0.5 * h;
		const rowsToRecycle = Math.max(0, Math.ceil((reelY.current - maxReelY) / h));
		for (let i = 0; i < rowsToRecycle && isPreSpinning; i++) {
			recycleOneHoldScrollRow({ preSpinPaddingRawReel });
		}
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
			const opts = reelState.spinOptions();
			const holdRotations = opts.reelPreSpinHoldRotations;
			const inHoldPhase = hasSignaledReady && holdRotations !== undefined;
			const rotationRows = inHoldPhase ? holdRotations : opts.reelPreSpinRotations;
			const speed = started ? opts.reelSpinSpeed : opts.reelPreSpinSpeed;
			const useWindup = opts.reelPreSpinWindup ?? true;
			const easing =
				started || isTurboBeforeAll || !useWindup || inHoldPhase ? linear : backIn;
			const preSpinTargetY =
				rotationRows === undefined
					? defaultY
					: reelY.current + rotationRows * reelOptions.symbolHeight;

			await slideY({ reelY: preSpinTargetY, speed, easing });
			if (!isPreSpinning) break;

			if (!hasSignaledReady) {
				reelState.readyToSpin();
				hasSignaledReady = true;
				if (!started) {
					reelState.motion = 'spinning';
					// Don't block the next hold chunk on batched symbolState flips.
					void updateAllReelSymbolState('spin');
					started = true;
				}
				// Hold-phase: keep scrolling in fixed row chunks while RGS responds.
				// Each chunk has real distance/duration (never a zero-length slideY loop).
				if (holdRotations !== undefined) continue;
				// Apps without hold config park here until spin().
				break;
			}

			if (inHoldPhase) {
				// Keep reelY inside SymbolWrap's culling window so symbols stay visible.
				recycleHoldScrollToWindow({ preSpinPaddingRawReel });
				continue;
			}

			// Standard SDK loop (lines/price/ways): slide → padding swap → repeat.
			await preSpinPadding({ preSpinPaddingRawReel });
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
		hasSignaledReady = false;
		reelState.spinType = isTurboBeforeAll ? 'fast' : 'normal';
		await preSpinPadding({ preSpinPaddingRawReel });
		if (!isTurboBeforeAll) await delaySpinByReelIndex();
		preSpinSlideDownLoop({ isTurboBeforeAll, preSpinPaddingRawReel });
	};

	const generalSpinWith = async ({ slideDown }: { slideDown: () => Promise<void> }) => {
		const isSpinning = reelState.motion === 'spinning';
		const symbolHeight = reelOptions.symbolHeight;

		// Enter spin state BEFORE pool swap / placeY so per-symbol win offsets
		// (bounce Y / scale / dim) are not baked into handoff reposition math.
		if (!isSpinning) {
			reelState.motion = 'spinning';
			void updateAllReelSymbolState('spin');
		}

		const applyLegacySeamlessPrepend = () => {
			const currentContent = reelState.symbols
				.slice(0, reelState.activeSymbolCount)
				.map((reelSymbol) => reelSymbol.rawSymbol);
			const paddingRawSymbols = getPaddingRawSymbols({
				paddingRawReel,
				start: targetPaddingPosition,
				length: paddingSize,
			});
			const prependCount = targetRawSymbols.length + paddingRawSymbols.length;
			const layout: TRawSymbol[] = [
				...targetRawSymbols,
				...paddingRawSymbols,
				...currentContent,
			];
			updateSymbolsPool(layout);
			placeY(reelY.current - prependCount * symbolHeight);
		};

		// IMPORTANT: the pool swap and the reel reposition must stay in ONE
		// synchronous batch — no `await` between them — otherwise Svelte can render
		// a frame with the new symbols at the old position (an in-place swap).
		if (reelState.spinOptions().reelSeamlessSpinStart) {
			const opts = reelState.spinOptions();
			const mainSpinRows = opts.reelMainSpinRows;
			const parkDriftRows = Math.abs(reelY.current - defaultY) / symbolHeight;
			const useControlledMainSpinStart =
				mainSpinRows !== undefined &&
				parkDriftRows <= (opts.reelMainSpinParkSlackRows ?? 1);

			if (useControlledMainSpinStart) {
				// Controlled seamless start: scroll an EXACT number of symbol rows.
				// reel 0 scrolls `reelMainSpinRows`; each later reel adds the padding
				// accumulated from previous reels (the left-to-right stop cascade).
				// The currently-visible symbols keep their exact on-screen position
				// (no in-place swap): we drop the symbols that have already scrolled
				// above the board, inject [result, filler] above the still-visible
				// ones, and park the reel so the slide lands the result after exactly
				// `scrollRows` whole rows. The anchor is derived from reelY.current,
				// so the scroll is also robust to whatever sub-position the pre-spin
				// happened to hand off at.
				//
				// Only valid while reelY is still parked near defaultY. After
				// `reelPreSpinHoldRotations` drift the filler math diverges and
				// placeY(startY) reads as an up/down alignment snap — fall back to
				// legacy seamless prepend instead.
				const cascadeRows = paddingSize - basePaddingSize();
				const scrollRows = mainSpinRows + Math.round(cascadeRows);
				const landingY = defaultY + symbolHeight * opts.reelBounceSizeMulti;

				// Symbols already scrolled above the top of the board won't be seen
				// again — drop them so they don't inflate the scroll distance.
				const dropCount = Math.max(
					0,
					Math.round((defaultY - reelY.current) / symbolHeight),
				);
				const visibleContent = reelState.symbols
					.slice(dropCount, reelState.activeSymbolCount)
					.map((reelSymbol) => reelSymbol.rawSymbol);

				// Filler rows between the result block and the still-visible symbols,
				// sized so those symbols keep their position while the total slide is
				// ≈ `scrollRows` whole rows.
				const desiredStartY = landingY - scrollRows * symbolHeight;
				const fillerCount = Math.max(
					0,
					Math.round((reelY.current - desiredStartY) / symbolHeight) +
						dropCount -
						targetRawSymbols.length,
				);
				const fillerRawSymbols = getPaddingRawSymbols({
					paddingRawReel,
					start: targetPaddingPosition,
					length: fillerCount,
				});
				const layout: TRawSymbol[] = [
					...targetRawSymbols,
					...fillerRawSymbols,
					...visibleContent,
				];
				updateSymbolsPool(layout);
				// Exact seamless anchor: keep the first kept symbol (old index
				// `dropCount`) at its current screen position — a whole-symbol shift,
				// so the move is invisible.
				const startY =
					reelY.current -
					(targetRawSymbols.length + fillerCount - dropCount) * symbolHeight;
				placeY(startY);
			} else {
				// Legacy seamless start: inject [result, padding] ABOVE the symbols
				// currently on screen and keep those on-screen symbols exactly where
				// they are, shifting the reel up by the prepended count. Safe at any
				// reelY (including post-hold-scroll drift).
				applyLegacySeamlessPrepend();
			}
		} else {
			const opts = reelState.spinOptions();
			// Hold-scroll drifts reelY; prepend handoff keeps on-screen symbols fixed.
			// Standard apps (lines/price) use phaseOffset + topY teleport near defaultY.
			if (opts.reelPreSpinHoldRotations !== undefined) {
				applyLegacySeamlessPrepend();
			} else {
				const phaseOffset =
					reelY.current - Math.round(reelY.current / symbolHeight) * symbolHeight;
				const topY = addPadding(paddingSize);
				placeY(topY + phaseOffset);
			}
		}

		// Start slideDown in this sync turn (before interruptible's async executor
		// yields) so main-spin motion begins in the same frame as prepend placeY.
		const slideDownTask = slideDown();

		// Q: When to skip the slideDown?
		// A: When it's preSpinning(isSpinning) and stop button is clicked(isTurbo) and is noStop is false
		if (noStop) {
			await slideDownTask;
		} else if (stateBet.isTurbo && isSpinning) {
			// skip
		} else {
			await interruptible.add(async () => {
				await slideDownTask;
			});
		}

		reelState.motion = 'bouncing';
		onSpinFinishing();
		await removePaddingAndBounceBack();
		reelState.motion = 'stopped';
		await updateAllReelSymbolState('land');
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
		const opts = reelState.spinOptions();
		// Controlled seamless scroll: the start position (set in generalSpinWith)
		// already encodes the exact `reelMainSpinRows` distance, so the first
		// slide just heads straight to defaultY and the bounce slide finishes the
		// approach — no padding-derived target that would over- or under-shoot.
		if (opts.reelSeamlessSpinStart && opts.reelMainSpinRows !== undefined) {
			return defaultY;
		}
		const spinRotations = opts.reelSpinRotations;
		if (spinRotations === undefined) return defaultY * basePaddingSize();
		return reelY.current + spinRotations * reelOptions.symbolHeight;
	};

	const normalSpin = () =>
		generalSpinWith({
			slideDown: async () => {
				const bounceSize = reelOptions.symbolHeight * reelState.spinOptions().reelBounceSizeMulti;

				await slideDynamic({
					getTargetY: getMainSpinTargetY,
					getSpeed: () => reelState.spinOptions().reelSpinSpeed,
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
		/** Additional fake symbol rows prepended before the math result (e.g. cat anticipation). */
		extraPaddingSymbols?: number;
	}) => {
		reelState.spinType = prepareToSpinOptions.spinType;

		noStop = prepareToSpinOptions.noStop;
		prevRawSymbols = targetRawSymbols;
		targetPaddingPosition = prepareToSpinOptions.paddingPosition;
		targetRawSymbols = prepareToSpinOptions.symbols;
		paddingRawReel = prepareToSpinOptions.paddingReel;
		onSpinFinishing = prepareToSpinOptions.onSpinFinishing;

		const extraPadding = prepareToSpinOptions.extraPaddingSymbols ?? 0;
		const GET_PADDING_SIZE_MAP = {
			fast: prepareToSpinOptions.previousPaddingSize + 0,
			normal: prepareToSpinOptions.previousPaddingSize + basePaddingSize() + extraPadding,
			anticipated: prepareToSpinOptions.previousPaddingSize + anticipatedPaddingSize() + extraPadding,
		};

		paddingSize = GET_PADDING_SIZE_MAP[prepareToSpinOptions.spinType];

		return paddingSize;
	};

	const spin = async () => {
		stopPreSpin();

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
		stopPreSpin,
		setSymbolsWithRawSymbols,
		readyToSpinEffect,
	};
}
