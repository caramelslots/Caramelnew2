/**
 * Dev FPS HUD: pin the floating overlay from Session in the Dev panel.
 * Overlay is off by default. Only mounted while SHOW_DEV_UI is on.
 */
const OVERLAY_KEY = 'catmafia.dev.fpsOverlay';

const readOverlay = () => {
	try {
		return globalThis.localStorage?.getItem(OVERLAY_KEY) === '1';
	} catch {
		return false;
	}
};

export const pixiFpsHud = $state({
	overlay: readOverlay(),
});

export const setFpsOverlayVisible = (on: boolean) => {
	pixiFpsHud.overlay = on;
	try {
		globalThis.localStorage?.setItem(OVERLAY_KEY, on ? '1' : '0');
	} catch {
		/* ignore quota / private mode */
	}
};
