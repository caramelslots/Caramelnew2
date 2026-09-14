const LOADER_CARD_FILES = ['loader_card_1.webp', 'loader_card_2.webp', 'loader_card_3.webp'] as const;

const assetBase = `${import.meta.env.BASE_URL}assets/sprites/ui/loader`;

export const LOADER_NEON_LOGO_URL = `${assetBase}/meowfia_neon_logo.webp`;
/** Native px size of `meowfia_neon_logo.webp`. */
export const LOADER_NEON_LOGO_ASPECT = 1877 / 748;

export const LOADER_CARD_IMAGE_URLS = LOADER_CARD_FILES.map(
	(file) => `${assetBase}/${file}`,
) as readonly [string, string, string];

/** Maps on-screen slot (0..2) to card asset/copy index; first two slots swapped. */
const LOADER_CARD_SLOT_TO_CONTENT_INDEX = [1, 0, 2] as const;

export const loaderCardContentIndex = (slotIndex: number) =>
	LOADER_CARD_SLOT_TO_CONTENT_INDEX[slotIndex] ?? slotIndex;

/** Card WebPs + neon title for the info-cards loader screen. */
export const LOADER_SCREEN_IMAGE_URLS = [LOADER_NEON_LOGO_URL, ...LOADER_CARD_IMAGE_URLS] as const;

export const loaderCardImageUrl = (slotIndex: number) =>
	LOADER_CARD_IMAGE_URLS[loaderCardContentIndex(slotIndex)] ?? LOADER_CARD_IMAGE_URLS[0];
