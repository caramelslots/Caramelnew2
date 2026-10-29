/** Opening reveal after Press to Continue. One clock for cards, board, logo, mascot, and menu. */

/** Logo + cards fade out as one layer, shrinking slightly in place. */
export const ENTRANCE_CARDS_MS = 240;

/** Logo pops in as the cards finish, well before the board. */
export const ENTRANCE_LOGO_DELAY_MS = 200;
export const ENTRANCE_LOGO_MS = 70;
/** Jelly pulse on the logo when the board hits. */
export const ENTRANCE_LOGO_PULSE_MS = 420;
const LOGO_PULSE_AMPLITUDE = 0.08;

/** Mascot fades in together with the logo. */
export const ENTRANCE_MASCOT_DELAY_MS = 220;
export const ENTRANCE_MASCOT_MS = 200;

/** Board falls from above the screen in a short, hard drop, then settles out of the sag. */
export const ENTRANCE_BOARD_DELAY_MS = 380;
export const ENTRANCE_BOARD_MS = 300;
/** Sag inside the drop. Camera punch peaks on this beat. */
export const ENTRANCE_BOARD_IMPACT_T = 0.33;

/** Camera zoom punch on the hit: quick push in, slower release. */
const CAMERA_PUNCH_ATTACK_MS = 60;
const CAMERA_PUNCH_RELEASE_MS = 360;
const CAMERA_PUNCH_SCALE = 0.04;

/** The whole HUD fades in at once, a beat after the hit. */
export const ENTRANCE_MENU_DELAY_AFTER_IMPACT_MS = 350;
export const ENTRANCE_MENU_MS = 300;

const easeOutCubic = (t: number) => {
	const u = 1 - t;
	return 1 - u * u * u;
};

/** Accelerate through most of the fall, then ease into the sag. */
const fallEase = (u: number) => {
	const split = 0.82;
	if (u <= split) {
		const v = u / split;
		return v * v * 0.92;
	}
	const v = (u - split) / (1 - split);
	return 0.92 + (1 - (1 - v) * (1 - v)) * 0.08;
};

/** Leave the sag quickly, then settle. One rebound, not a spring. */
const settleEase = (u: number) => 1 - Math.pow(1 - u, 2.6);

export const entranceDropDistance = (canvasHeight: number) => Math.max(1, canvasHeight);

export const entranceBoardOvershoot = (canvasHeight: number) =>
	Math.min(22, Math.max(12, canvasHeight * 0.018));

export const entranceImpactMs = () =>
	ENTRANCE_BOARD_DELAY_MS + ENTRANCE_BOARD_MS * ENTRANCE_BOARD_IMPACT_T;

export const entranceMenuStartMs = () =>
	entranceImpactMs() + ENTRANCE_MENU_DELAY_AFTER_IMPACT_MS;

export const entranceTimelineMs = () => {
	const impact = entranceImpactMs();
	const menuEnd = entranceMenuStartMs() + ENTRANCE_MENU_MS;
	const boardEnd = ENTRANCE_BOARD_DELAY_MS + ENTRANCE_BOARD_MS;
	const logoEnd = impact + ENTRANCE_LOGO_PULSE_MS;
	const cameraEnd = impact + CAMERA_PUNCH_RELEASE_MS;
	const mascotEnd = ENTRANCE_MASCOT_DELAY_MS + ENTRANCE_MASCOT_MS;
	return Math.ceil(
		Math.max(menuEnd, boardEnd, logoEnd, cameraEnd, mascotEnd, ENTRANCE_CARDS_MS),
	);
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

/** Whole-scene zoom around the screen center. 1 at rest. */
export const sampleCameraScale = (elapsedMs: number) => {
	const impact = entranceImpactMs();
	const attackStart = impact - CAMERA_PUNCH_ATTACK_MS;
	if (elapsedMs <= attackStart) return 1;
	if (elapsedMs <= impact) {
		const t = (elapsedMs - attackStart) / CAMERA_PUNCH_ATTACK_MS;
		return 1 + CAMERA_PUNCH_SCALE * easeOutCubic(t);
	}
	const t = (elapsedMs - impact) / CAMERA_PUNCH_RELEASE_MS;
	if (t >= 1) return 1;
	return 1 + CAMERA_PUNCH_SCALE * (1 - easeOutCubic(t));
};

export const sampleLogoReveal = (elapsedMs: number) => {
	const t = (elapsedMs - ENTRANCE_LOGO_DELAY_MS) / ENTRANCE_LOGO_MS;
	if (t <= 0) return 0;
	return Math.min(1, t);
};

/** Logo scale on top of the camera: swell on the hit, one small undershoot, settle. */
export const sampleLogoPulse = (elapsedMs: number) => {
	const t = (elapsedMs - entranceImpactMs()) / ENTRANCE_LOGO_PULSE_MS;
	if (t <= 0 || t >= 1) return 1;
	const damp = Math.pow(1 - t, 1.6);
	return 1 + LOGO_PULSE_AMPLITUDE * Math.sin(t * Math.PI * 2.2) * damp;
};

export const sampleMenuPhase = (elapsedMs: number) => elapsedMs >= entranceMenuStartMs();

export const sampleMascotReveal = (elapsedMs: number) => {
	const t = (elapsedMs - ENTRANCE_MASCOT_DELAY_MS) / ENTRANCE_MASCOT_MS;
	if (t <= 0) return 0;
	return easeOutCubic(Math.min(1, t));
};
