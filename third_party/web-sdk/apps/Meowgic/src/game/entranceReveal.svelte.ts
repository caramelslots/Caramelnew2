import {
	entranceBoardOvershoot,
	entranceDropDistance,
	entranceTimelineMs,
	sampleBoardDropOffset,
	sampleCameraScale,
	sampleLogoPulse,
	sampleLogoReveal,
	sampleMascotReveal,
	sampleMenuPhase,
} from './entranceReveal';

/** Live offsets for the opening reveal. Rest pose is identity so nothing pops when it ends. */
export const entranceReveal = $state({
	/** True while the post-Continue motion is running, including the settled frame before unlock. */
	driving: false,
	/** Added to the board's stage Y. 0 at rest. */
	boardOffsetY: 0,
	/** Board logo opacity. 1 at rest. */
	logoAlpha: 1,
	/** Board logo scale on top of the camera. 1 at rest. */
	logoScale: 1,
	/** HUD fades in once this is true. */
	menuPhase: false,
	/** Mascot opacity during the entrance. 1 at rest. */
	mascotAlpha: 1,
	/** Whole-scene zoom around the screen center at the board hit. 1 at rest. */
	cameraScale: 1,
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
	entranceReveal.logoScale = sampleLogoPulse(elapsed);
	entranceReveal.menuPhase = sampleMenuPhase(elapsed);
	entranceReveal.mascotAlpha = sampleMascotReveal(elapsed);
	entranceReveal.cameraScale = sampleCameraScale(elapsed);
};

export const restEntranceReveal = () => {
	entranceReveal.driving = false;
	entranceReveal.boardOffsetY = 0;
	entranceReveal.logoAlpha = 1;
	entranceReveal.logoScale = 1;
	entranceReveal.menuPhase = false;
	entranceReveal.mascotAlpha = 1;
	entranceReveal.cameraScale = 1;
};

/** CSS `scale` for HTML layers that must zoom with the WebGL stage. */
export const entranceCameraCssScale = () =>
	Math.abs(entranceReveal.cameraScale - 1) > 0.0005 ? `${entranceReveal.cameraScale}` : undefined;
