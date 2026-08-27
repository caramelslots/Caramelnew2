/** Static Duel HTML chrome assets (avatars, etc.). */

const assetUrl = (path: string) =>
	new URL(
		path.replace(/^\//, ''),
		typeof window !== 'undefined' ? window.location.href : import.meta.url,
	).href;

/** Phone duel corner portrait (cat face). */
export const DUEL_CAT_FACE_AVATAR_SRC = assetUrl('assets/sprites/duel/cat_face_avatar.png');
/** Phone duel corner portrait (dog face). */
export const DUEL_DOG_FACE_AVATAR_SRC = assetUrl('assets/sprites/duel/dog_face_avatar.png');
