import {
	DRUM_MAX,
	DRUM_STEP_DEG,
	getChamberAtFirePosition,
	getDrumLastFilledChamberIndex,
	getDrumRotationDeg,
	getNextDrumChamberToFire,
	isDrumChamberLive,
	withDrumBulletOrient,
} from './revolverDrumLayout';
import { stateGame } from './stateGame.svelte';

/** Left/right drum kick duration — keep in sync with `.cylinder.shake` CSS. */
export const DRUM_SHAKE_MS = 280;

/** Cylinder step duration — keep in sync with `.rotor` / Pixi spin. */
export const DRUM_SPIN_MS = 380;

type WaitFn = (ms: number) => Promise<void>;

/** Snap rotor to the CW load pose for the current fill count. */
export const syncDrumLoadRotation = () => {
	stateGame.drumRotationDeg = getDrumRotationDeg(stateGame.drumCount);
};

/** Rotate one chamber CCW (decreasing CSS degrees). */
const spinDrumCcw = async (wait: WaitFn) => {
	stateGame.drumRotationDeg -= DRUM_STEP_DEG;
	await wait(DRUM_SPIN_MS);
};

/**
 * Advance CCW until position 1 (12 o'clock) holds a live round.
 * Call BEFORE starting `gun_shot` so the cylinder is still during the clip.
 */
export const alignDrumForNextShot = async (wait: WaitFn) => {
	for (let i = 0; i < DRUM_MAX; i++) {
		const chamber = getChamberAtFirePosition(stateGame.drumRotationDeg);
		if (
			isDrumChamberLive(chamber, stateGame.drumCount, stateGame.drumSpentChambers)
		) {
			return chamber;
		}
		await spinDrumCcw(wait);
	}
	return null;
};

/**
 * Shake + mark spent — only after the mascot `gun_shot` clip has finished.
 * Does not rotate the cylinder (see `advanceDrumAfterShot`).
 */
export const playDrumChamberShot = async (wait: WaitFn) => {
	const chamber = getChamberAtFirePosition(stateGame.drumRotationDeg);
	if (!isDrumChamberLive(chamber, stateGame.drumCount, stateGame.drumSpentChambers)) {
		return null;
	}

	stateGame.drumFiringChamber = chamber;
	stateGame.drumSpentChambers = { ...stateGame.drumSpentChambers, [chamber]: true };
	stateGame.drumShakeKey += 1;
	await wait(DRUM_SHAKE_MS);
	stateGame.drumFiringChamber = null;
	return chamber;
};

/** Step the cylinder CCW after shake — brings the next live round to position 1. */
export const advanceDrumAfterShot = async (wait: WaitFn) => {
	if (isDrumFullySpent()) return;
	await spinDrumCcw(wait);
};

/** True when every filled chamber has already been fired (spent). */
export const isDrumFullySpent = () =>
	getNextDrumChamberToFire(
		stateGame.drumCount,
		stateGame.drumSpentChambers,
		stateGame.drumRotationDeg,
	) === null;

/** QA helper: fill empty chambers up to `count` with random CARAMEL spins. */
export const fillDrumForPreview = (count = DRUM_MAX) => {
	const target = Math.max(0, Math.min(DRUM_MAX, count));
	while (stateGame.drumCount < target) {
		stateGame.drumCount += 1;
		const seated = getDrumLastFilledChamberIndex(stateGame.drumCount);
		if (seated !== null) {
			stateGame.drumBulletOrientDeg = withDrumBulletOrient(
				stateGame.drumBulletOrientDeg,
				seated,
			);
			stateGame.drumSeatAnimKey = {
				...stateGame.drumSeatAnimKey,
				[seated]: (stateGame.drumSeatAnimKey[seated] ?? 0) + 1,
			};
		}
	}
	syncDrumLoadRotation();
};

export const clearDrumShootFx = () => {
	stateGame.drumFiringChamber = null;
	stateGame.drumSpentChambers = {};
	stateGame.drumShakeKey = 0;
	syncDrumLoadRotation();
};
