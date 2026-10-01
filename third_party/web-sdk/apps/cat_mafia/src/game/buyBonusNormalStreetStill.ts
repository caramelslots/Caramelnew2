/**
 * Normal sandwich needs street behind the white mascot and frame in front.
 * Two SpinePlayers both upload buyBonus/normal (bonus_normal.webp) → 2× VRAM.
 * Use a pre-cropped, un-premultiplied street still instead of a second WebGL atlas.
 */
import { resolveBuyBonusSpineUrl } from './buyBonusHtmlSpine';

/** Atlas region `normal_background`, exported as straight-alpha webp. */
export const BUY_BONUS_NORMAL_STREET_STILL_URL = resolveBuyBonusSpineUrl(
	'normal',
	'bonus_normal_street.webp',
);

/** Resolves immediately — shared URL for menu + confirm reparent. */
export const ensureBuyBonusNormalStreetStill = (): Promise<string> =>
	Promise.resolve(BUY_BONUS_NORMAL_STREET_STILL_URL);

/** No blob to revoke — static asset stays on disk. */
export const releaseBuyBonusNormalStreetStill = () => {
	/* static asset */
};
