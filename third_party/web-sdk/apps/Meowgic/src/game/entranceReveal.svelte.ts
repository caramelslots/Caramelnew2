import {
	entranceBoardOvershoot,
	entranceDropDistance,
	entranceShakeAmplitude,
	entranceTimelineMs,
	sampleBoardDropOffset,
	sampleLogoReveal,
	sampleMascotReveal,
	sampleMenuPhase,
	sampleScreenShake,
} from './entranceReveal';

/** Live offsets for the opening reveal. Rest pose is identity so nothing pops when it ends. */
export const entranceReveal = $state({
	/** True while the post-Continue motion is running, including the settled frame before unlock. */
	driving: false,
	/** Added to the board's stage Y. 0 at rest. */
	boardOffsetY: 0,
	/** Board logo opacity. 1 at rest. The logo does not move. */
	logoAlpha: 1,
	/** HUD children start their stagger once this is true. */
	menuPhase: false,
	/** Mascot opacity during the entrance. 1 at rest. */
	mascotAlpha: 1,
	/** Camera impulse at the board hit. 0 at rest. */
	shakeX: 0,
	shakeY: 0,
});

export const applyEntranceFrame = (elapsedMs: number, canvasHeight: number) => {
	const height = Math.max(1, canvasHeight);
	const elapsed = Math.min(entranceTimelineMs(), Math.max(0, elapsedMs));
	entranceReveal.boardOffsetY = sampleBoardDropOffset(
		elapsed,
		entranceDropDistance(height),
		entranceBoardOvershoot(height),
	);
	entranceReveal.logoAlpha = sampleLogoReveal(elapsed);
	entranceReveal.menuPhase = sampleMenuPhase(elapsed);
	entranceReveal.mascotAlpha = sampleMascotReveal(elapsed);
	const shake = sampleScreenShake(elapsed, entranceShakeAmplitude(height));
	entranceReveal.shakeX = shake.x;
	entranceReveal.shakeY = shake.y;
};

export const restEntranceReveal = () => {
	entranceReveal.driving = false;
	entranceReveal.boardOffsetY = 0;
	entranceReveal.logoAlpha = 1;
	entranceReveal.menuPhase = false;
	entranceReveal.mascotAlpha = 1;
	entranceReveal.shakeX = 0;
	entranceReveal.shakeY = 0;
};
