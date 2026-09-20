/**
 * Registry of menu BuyBonusCardSpine roots so confirm can reparent the same
 * WebGL hosts (scale up) instead of mounting a second copy.
 */
import type { BuyBonusSpineVariant } from './buyBonusHtmlSpine';

const hosts = new Map<BuyBonusSpineVariant, HTMLElement>();

export const registerBuyBonusCardSpineHost = (
	variant: BuyBonusSpineVariant,
	el: HTMLElement | null | undefined,
) => {
	if (el) hosts.set(variant, el);
	else hosts.delete(variant);
};

export const getBuyBonusCardSpineHost = (variant: BuyBonusSpineVariant) => hosts.get(variant);
