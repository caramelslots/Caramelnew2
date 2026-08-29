/** Static Duel HTML chrome assets (avatars, bank-ratio scale, etc.). */

const assetUrl = (path: string) =>
	new URL(
		path.replace(/^\//, ''),
		typeof window !== 'undefined' ? window.location.href : import.meta.url,
	).href;

/** Phone duel corner portrait (cat face). */
export const DUEL_CAT_FACE_AVATAR_SRC = assetUrl('assets/sprites/duel/cat_face_avatar.png');
/** Phone duel corner portrait (dog face). */
export const DUEL_DOG_FACE_AVATAR_SRC = assetUrl('assets/sprites/duel/dog_face_avatar.png');

/** Ornate dog↔cat bank tug-of-war scale (1500×270). */
export const DUEL_BANK_SCALE_SRC = assetUrl('assets/sprites/duel/scale.png');
/** Paw diamond slider that rides the bank scale (89×94). */
export const DUEL_BANK_SCALE_PAW_SRC = assetUrl('assets/sprites/duel/scale_paw.png');

/**
 * Paw travel on `scale.png` (fractions of art width / height).
 * Left = dog lead, right = cat lead; measured from the coloured track edges.
 */
export const DUEL_BANK_SCALE = {
	aspect: 1500 / 270,
	/** Paw centre X when dog bank share = 1 — flush to inner edge of left shield. */
	trackLeft: 220 / 1500,
	/** Paw centre X when dog bank share = 0 — flush to inner edge of right shield. */
	trackRight: 1320 / 1500,
	/** Neutral / 50-50 sits on the VS badge (art centre). */
	trackCenter: 750 / 1500,
	/** Vertical centre of the blue/red bar. */
	trackY: 114 / 270,
	pawWidthFrac: 89 / 1500,
	pawHeightFrac: 94 / 270,
	/** Combined-win text slot in the bottom plaque (fractions of art). */
	plaqueLeft: 445 / 1500,
	plaqueWidth: (1053 - 445) / 1500,
	plaqueTop: 176 / 270,
	plaqueHeight: (258 - 184) / 270,
} as const;
