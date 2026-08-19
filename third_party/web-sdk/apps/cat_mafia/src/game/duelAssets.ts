/** Static symbol sprites for Duel HTML mock boards. */

const assetUrl = (path: string) =>
	new URL(
		path.replace(/^\//, ''),
		typeof window !== 'undefined' ? window.location.href : import.meta.url,
	).href;

const SPRITES: Record<string, string> = {
	L1: assetUrl('assets/sprites/symbolsNew/A.webp'),
	L2: assetUrl('assets/sprites/symbolsNew/K.webp'),
	L3: assetUrl('assets/sprites/symbolsNew/Q.webp'),
	L4: assetUrl('assets/sprites/symbolsNew/J.webp'),
	H1: assetUrl('assets/sprites/symbolsNew/Diamond.webp'),
	H2: assetUrl('assets/sprites/symbolsNew/Telephone.webp'),
	H3: assetUrl('assets/sprites/symbolsNew/Lighter.webp'),
	H4: assetUrl('assets/sprites/symbolsNew/Revolver.webp'),
	W: assetUrl('assets/sprites/symbolsNew/Special_2.webp'),
	SW: assetUrl('assets/sprites/symbolsNew/Special_2.webp'),
};

export const duelSymbolSrc = (name: string) => SPRITES[name] ?? SPRITES.L1;

export const DUEL_BOARD_DESK_SRC = assetUrl('assets/sprites/boardFrame/desk_day_base.webp');
export const DUEL_BOARD_CONTOUR_SRC = assetUrl('assets/sprites/boardFrame/desk_contour.webp');
/** Phone duel corner portrait (cat face). */
export const DUEL_CAT_FACE_AVATAR_SRC = assetUrl('assets/sprites/duel/cat_face_avatar.png');
