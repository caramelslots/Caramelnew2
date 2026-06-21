const LOADER_CARD_FILES = ['loader_card_1.png', 'loader_card_2.png', 'loader_card_3.png'] as const;

const assetBase = `${import.meta.env.BASE_URL}assets/sprites/ui/loader`;

export const LOADER_CARD_IMAGE_URLS = LOADER_CARD_FILES.map(
	(file) => `${assetBase}/${file}`,
) as readonly [string, string, string];

export const loaderCardImageUrl = (index: number) =>
	LOADER_CARD_IMAGE_URLS[index] ?? LOADER_CARD_IMAGE_URLS[0];
