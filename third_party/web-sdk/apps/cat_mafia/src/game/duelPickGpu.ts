/**
 * Duel pick GPU helpers.
 * Pick mascots are static `<img>` now (no SpinePlayer WebGL).
 * `loseWebglCanvas` remains for other HTML Spine teardown (buy-bonus legacy).
 */
import type { SpinePlayer } from '@esotericsoftware/spine-player';

export const loseWebglCanvas = (canvas: HTMLCanvasElement | null | undefined) => {
	if (!canvas) return;
	for (const type of ['webgl2', 'webgl', 'experimental-webgl'] as const) {
		try {
			const gl = canvas.getContext(type) as WebGLRenderingContext | null;
			gl?.getExtension('WEBGL_lose_context')?.loseContext();
		} catch {
			/* context type mismatch / already lost */
		}
	}
	try {
		canvas.width = 1;
		canvas.height = 1;
	} catch {
		/* detached */
	}
};

/** @deprecated Pick mascots no longer use SpinePlayer — kept for call-site no-ops. */
export const disposeDuelPickSpinePlayer = (_player: SpinePlayer | undefined) => {
	/* no-op */
};

/** @deprecated */
export const trackDuelPickSpinePlayer = (_player: SpinePlayer) => {
	/* no-op */
};

/** Always empty — pick cards use static images. */
export const getLiveDuelPickSpinePlayers = (): readonly SpinePlayer[] => [];

/** @deprecated no SpinePlayers to release */
export const releaseAllDuelPickSpinePlayers = () => {
	/* no-op */
};
