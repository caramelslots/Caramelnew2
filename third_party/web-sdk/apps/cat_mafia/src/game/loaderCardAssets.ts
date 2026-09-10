const LOADER_CARD_FILES = ['loader_card_1.webp', 'loader_card_2.webp', 'loader_card_3.webp'] as const;

const assetBase = `${import.meta.env.BASE_URL}assets/sprites/ui/loader`;

export const LOADER_NEON_LOGO_URL = `${assetBase}/meowfia_neon_logo.webp`;
/** Native px size of `meowfia_neon_logo.webp`. */
export const LOADER_NEON_LOGO_ASPECT = 1877 / 748;

export const LOADER_CARD_IMAGE_URLS = LOADER_CARD_FILES.map(
	(file) => `${assetBase}/${file}`,
) as readonly [string, string, string];

/** Card WebPs + neon title for the info-cards loader screen. */
export const LOADER_SCREEN_IMAGE_URLS = [LOADER_NEON_LOGO_URL, ...LOADER_CARD_IMAGE_URLS] as const;

export const loaderCardImageUrl = (index: number) =>
	LOADER_CARD_IMAGE_URLS[index] ?? LOADER_CARD_IMAGE_URLS[0];
