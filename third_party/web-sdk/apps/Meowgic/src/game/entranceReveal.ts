/** Opening reveal after Press to Continue. One clock for cards, board, logo, and menu. */

/** Cards gather toward center, shrink, then dissolve. */
export const ENTRANCE_CARDS_MS = 620;
export const ENTRANCE_CARDS_STAGGER_MS = [70, 0, 120] as const;

/** Board starts while the cards are still gathering, so the handoff has no gap. */
export const ENTRANCE_BOARD_DELAY_MS = 160;
export const ENTRANCE_BOARD_MS = 880;
/** Sag inside the fall. Shake peaks on this beat. */
export const ENTRANCE_BOARD_IMPACT_T = 0.68;

/** Logo fades in place once the board has hit. */
export const ENTRANCE_LOGO_MS = 360;

/** Menu items start just after the hit, then stagger. */
export const ENTRANCE_MENU_DELAY_AFTER_IMPACT_MS = 90;
export const ENTRANCE_MENU_MS = 440;
export const ENTRANCE_MENU_STAGGER_MS = 42;
/** Enough slots for desktop HUD children (icons, labels, spin). */
export const ENTRANCE_MENU_SLOTS = 12;

const easeOutCubic = (t: number) => {
	const u = 1 - t;
	return 1 - u * u * u;
};

/** Accelerate through most of the fall, then ease into the sag. */
const fallEase = (u: number) => {
	const split = 0.78;
	if (u <= split) {
		const v = u / split;
		return v * v * 0.88;
	}
	const v = (u - split) / (1 - split);
	return 0.88 + (1 - (1 - v) * (1 - v)) * 0.12;
};

/** Leave the sag quickly, then settle. One rebound, not a spring. */
const settleEase = (u: number) => 1 - Math.pow(1 - u, 2.6);

export const entranceDropDistance = (canvasHeight: number) => Math.max(1, canvasHeight);

export const entranceBoardOvershoot = (canvasHeight: number) =>
	Math.min(26, Math.max(14, canvasHeight * 0.02));

export const entranceImpactMs = () =>
	ENTRANCE_BOARD_DELAY_MS + ENTRANCE_BOARD_MS * ENTRANCE_BOARD_IMPACT_T;

export const entranceTimelineMs = () => {
	const impact = entranceImpactMs();
	const menuStart = impact + ENTRANCE_MENU_DELAY_AFTER_IMPACT_MS;
	const menuEnd =
		menuStart + (ENTRANCE_MENU_SLOTS - 1) * ENTRANCE_MENU_STAGGER_MS + ENTRANCE_MENU_MS;
	const boardEnd = ENTRANCE_BOARD_DELAY_MS + ENTRANCE_BOARD_MS;
	const logoEnd = impact + ENTRANCE_LOGO_MS;
	const cardsEnd = ENTRANCE_CARDS_MS + Math.max(...ENTRANCE_CARDS_STAGGER_MS);
	return Math.ceil(Math.max(menuEnd, boardEnd, logoEnd, cardsEnd));
};

/**
 * Screen-space Y added to the board. Negative is above the resting pose.
 * Before the delay the board is one screen up. t end → 0.
 */
export const sampleBoardDropOffset = (elapsedMs: number, drop: number, overshoot: number) => {
	const local = elapsedMs - ENTRANCE_BOARD_DELAY_MS;
	if (local <= 0) return -drop;
	const clamped = Math.min(1, local / ENTRANCE_BOARD_MS);
	const fallEnd = ENTRANCE_BOARD_IMPACT_T;
	if (clamped <= fallEnd) {
		const eased = fallEase(clamped / fallEnd);
		return -drop + (drop + overshoot) * eased;
	}
	const u = (clamped - fallEnd) / (1 - fallEnd);
	return overshoot * (1 - settleEase(u));
};

export const entranceShakeAmplitude = (canvasHeight: number) =>
	Math.min(5.5, Math.max(4, canvasHeight * 0.005));

const SHAKE_MS = 200;

/** One camera impulse. Peaks on the board's sag. Positive Y is downward. */
export const sampleScreenShake = (elapsedMs: number, amplitude: number) => {
	const impact = entranceImpactMs();
	const start = impact - SHAKE_MS / 2;
	const u = (elapsedMs - start) / SHAKE_MS;
	if (u <= 0 || u >= 1) return { x: 0, y: 0 };
	const lobe = Math.sin(u * Math.PI);
	const eased = lobe * lobe;
	return {
		x: Math.sin(u * Math.PI * 2) * amplitude * 0.42 * lobe,
		y: eased * amplitude,
	};
};

export const sampleLogoReveal = (elapsedMs: number) => {
	const t = (elapsedMs - entranceImpactMs()) / ENTRANCE_LOGO_MS;
	if (t <= 0) return 0;
	return easeOutCubic(Math.min(1, t));
};

export const sampleMenuPhase = (elapsedMs: number) =>
	elapsedMs >= entranceImpactMs() + ENTRANCE_MENU_DELAY_AFTER_IMPACT_MS;
