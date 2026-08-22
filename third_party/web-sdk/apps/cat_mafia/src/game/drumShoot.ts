import {
	DRUM_MAX,
	getDrumLastFilledChamberIndex,
	getNextDrumChamberToFire,
	withDrumBulletOrient,
} from './revolverDrumLayout';
import { stateGame } from './stateGame.svelte';

/** Left/right drum kick duration — keep in sync with `.cylinder.shake` CSS. */
export const DRUM_SHAKE_MS = 280;

type WaitFn = (ms: number) => Promise<void>;

/**
 * One chamber shot: swap that bullet to spent art (same CARAMEL orient) and
 * shake the drum. The casing stays in the chamber.
 */
export const playDrumChamberShot = async (wait: WaitFn) => {
	const chamber = getNextDrumChamberToFire(
		stateGame.drumCount,
		stateGame.drumSpentChambers,
	);
	if (chamber === null) return null;

	stateGame.drumFiringChamber = chamber;
	stateGame.drumSpentChambers = { ...stateGame.drumSpentChambers, [chamber]: true };
	stateGame.drumShakeKey += 1;
	await wait(DRUM_SHAKE_MS);
	stateGame.drumFiringChamber = null;
	return chamber;
};

/** True when every filled chamber has already been fired (spent). */
export const isDrumFullySpent = () =>
	getNextDrumChamberToFire(stateGame.drumCount, stateGame.drumSpentChambers) === null;

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
		}
	}
};

export const clearDrumShootFx = () => {
	stateGame.drumFiringChamber = null;
	stateGame.drumSpentChambers = {};
	stateGame.drumShakeKey = 0;
};
