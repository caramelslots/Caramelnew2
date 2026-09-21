/**
 * Dev RAM HUD: pin the floating overlay from Session in the Dev panel.
 * Overlay is off by default.
 */
const OVERLAY_KEY = 'catmafia.dev.ramOverlay';

const readOverlay = () => {
	try {
		return globalThis.localStorage?.getItem(OVERLAY_KEY) === '1';
	} catch {
		return false;
	}
};

export const pixiMemoryHud = $state({
	overlay: readOverlay(),
});

export const setRamOverlayVisible = (on: boolean) => {
	pixiMemoryHud.overlay = on;
	try {
		globalThis.localStorage?.setItem(OVERLAY_KEY, on ? '1' : '0');
	} catch {
		/* ignore quota / private mode */
	}
};
