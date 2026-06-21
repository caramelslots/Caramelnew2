const LOADER_CARD_FILES = ['loader_card_1.png', 'loader_card_2.png', 'loader_card_3.png'] as const;

const assetBase = `${import.meta.env.BASE_URL}assets/sprites/ui/loader`;

export const LOADER_NEON_LOGO_URL = `${assetBase}/wok_fury_neon_logo.png`;
/** Native px size of `wok_fury_neon_logo.png`. */
export const LOADER_NEON_LOGO_ASPECT = 3833 / 1394;

export const LOADER_CARD_IMAGE_URLS = LOADER_CARD_FILES.map(
	(file) => `${assetBase}/${file}`,
) as readonly [string, string, string];

/** Card PNGs + neon title for the info-cards loader screen. */
export const LOADER_SCREEN_IMAGE_URLS = [LOADER_NEON_LOGO_URL, ...LOADER_CARD_IMAGE_URLS] as const;

export const loaderCardImageUrl = (index: number) =>
	LOADER_CARD_IMAGE_URLS[index] ?? LOADER_CARD_IMAGE_URLS[0];
