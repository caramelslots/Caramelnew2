/** Static symbol sprites for Duel HTML mock boards. */

const assetUrl = (path: string) =>
	new URL(
		path.replace(/^\//, ''),
		typeof window !== 'undefined' ? window.location.href : import.meta.url,
	).href;

const SPRITES: Record<string, string> = {
	L1: assetUrl('assets/sprites/symbolsNew/L1.webp'),
	L2: assetUrl('assets/sprites/symbolsNew/L2.webp'),
	L3: assetUrl('assets/sprites/symbolsNew/L3.webp'),
	L4: assetUrl('assets/sprites/symbolsNew/L4.webp'),
	H1: assetUrl('assets/sprites/symbolsNew/H1.webp'),
	H2: assetUrl('assets/sprites/symbolsNew/H2.webp'),
	H3: assetUrl('assets/sprites/symbolsNew/H3.webp'),
	H4: assetUrl('assets/sprites/symbolsNew/H4.webp'),
	W: assetUrl('assets/sprites/symbolsNew/Special_2.webp'),
	SW: assetUrl('assets/sprites/symbolsNew/Special_2.webp'),
};

export const duelSymbolSrc = (name: string) => SPRITES[name] ?? SPRITES.L1;

export const DUEL_BOARD_DESK_SRC = assetUrl('assets/sprites/boardFrame/desk_day_base.webp');
export const DUEL_BOARD_CONTOUR_SRC = assetUrl('assets/sprites/boardFrame/desk_contour.webp');
/** Phone duel corner portrait (cat face). */
export const DUEL_CAT_FACE_AVATAR_SRC = assetUrl('assets/sprites/duel/cat_face_avatar.png');
/** Phone duel corner portrait (dog face). */
export const DUEL_DOG_FACE_AVATAR_SRC = assetUrl('assets/sprites/duel/dog_face_avatar.png');
