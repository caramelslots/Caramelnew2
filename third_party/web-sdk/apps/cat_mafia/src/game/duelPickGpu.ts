/**
 * Duel pick HTML SpinePlayers (cat/dog). Drop WebGL on buy-bonus close.
 */
import type { SpinePlayer } from '@esotericsoftware/spine-player';

const livePlayers = new Set<SpinePlayer>();

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

export const disposeDuelPickSpinePlayer = (player: SpinePlayer | undefined) => {
	if (!player) return;
	livePlayers.delete(player);
	loseWebglCanvas(player.canvas);
	try {
		player.dispose();
	} catch {
		/* already disposed */
	}
};

export const trackDuelPickSpinePlayer = (player: SpinePlayer) => {
	livePlayers.add(player);
};

export const releaseAllDuelPickSpinePlayers = () => {
	for (const player of [...livePlayers]) disposeDuelPickSpinePlayer(player);
	livePlayers.clear();
};
