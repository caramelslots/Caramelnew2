/** Смещение в пикселях Spine-арта. +x вправо, +y вниз. */
export type NeonElementTuning = {
	x?: number;
	y?: number;
	scaleX?: number;
	scaleY?: number;
};

/** Глобальная подгонка всего neon-слоя относительно фона (1922×1074 art px). */
export const NEON_OVERLAY_TUNING = {
	offsetX: 600,
	offsetY: 400,
	scale: 1.2,
	centerX: 6.13,
	centerY: 31.19,
};

/**
 * Сдвиг целой группы (кость). Двигает все слоты на этой кости.
 * Имена костей: signboard_left, signboard_right, text_wok, board, …
 */
export const NEON_BONE_TUNING: Record<string, NeonElementTuning> = {
	signboard_left: { x: 200, y: -20 },
	signboard_left_bottom: { x: 0, y: 0 },

	signboard_right: { x: 0, y: 0 },

	text_wok: { x: 40, y: 15 },

	text_fury: { x: 0, y: 0 },
	text_mivina: { x: 0, y: 0 },

	Glow_orange: { x: 0, y: 0 },
	Glow_orange2: { x: 0, y: 0 },
	Glow_blue: { x: 0, y: 0 },
	Glow_blue2: { x: 0, y: 0 },
};

/**
 * Масштаб рамки свечения доски.
 * 1.0 = точно по размеру доски, 1.1 = +10% больше, 0.9 = -10% меньше.
 */
export const BOARD_GLOW_SIZE = 1.12;

/**
 * Тонкая подгонка авто-выравнивания обводки доски (board_glow + Glow_purple_*).
 * Позиция/размер берутся из desk/contour как в BoardFrame.
 */
export const NEON_BOARD_ALIGNMENT: NeonElementTuning = {
	x: 7.5,
	y: -15,
	scaleX: BOARD_GLOW_SIZE,
	scaleY: BOARD_GLOW_SIZE,
};

/**
 * Кости, которые рисуются ПОВЕРХ игровой доски.
 * Остальные neon-элементы — под доской (в Background).
 */
export const NEON_FOREGROUND_BONES = [
	'text_wok',
	'text_fury',
	'text_mivina',
	'board',
	'Glow_purple_bottom',
	'Glow_purple_left',
	'Glow_purple_right',
	'Glow_purple_top',
	'Glow_orange',
	'Glow_orange2',
	'Glow_blue',
	'Glow_blue2',
] as const;

export const NEON_FOREGROUND_BONE_SET = new Set<string>(NEON_FOREGROUND_BONES);

/**
 * Сдвиг каждого слота (элемента) отдельно. Имя = slot в skeleton.json.
 * Работает поверх NEON_BONE_TUNING — можно двигать и группу, и отдельный элемент.
 */
export const NEON_SLOT_TUNING: Record<string, NeonElementTuning> = {
	// --- LEFT SIGNBOARD ---
	Glow: { x: 0, y: 0 },
	j: { x: 0, y: 0 },
	j1: { x: 0, y: 0 },
	j2: { x: 0, y: 0 },
	ji: { x: 0, y: 0 },
	ji2: { x: 0, y: 0 },
	ji5: { x: 0, y: 0 },
	light_l_glow: { x: 0, y: 0 },
	light_l_glow2: { x: 0, y: 0 },
	light_l_glow3: { x: 0, y: 0 },
	light_l_top: { x: 0, y: 0 },
	light_l_top2: { x: 0, y: 0 },
	light_l_top3: { x: 0, y: 0 },
	signboard_1: { x: 0, y: 0 },
	signboard_left: { x: 0, y: 0 },
	text_left_1: { x: 0, y: 0 },
	text_left_1a: { x: 0, y: 0 },
	text_left_1a2: { x: 0, y: 0 },
	text_left_2: { x: 0, y: 0 },
	text_left_2a: { x: 0, y: 0 },
	text_left_2a2: { x: 0, y: 0 },

	// --- LEFT BOTTOM (bonus) ---
	Glow_blue: { x: 0, y: 0 },
	cat: { x: 0, y: 0 },
	cat2: { x: 0, y: 0 },
	cat3: { x: 0, y: 0 },
	light_glow_l2: { x: 0, y: 0 },
	light_glow_l3: { x: 0, y: 0 },
	light_glow_l4: { x: 0, y: 0 },
	light_l2: { x: 0, y: 0 },
	light_l3: { x: 0, y: 0 },
	light_l4: { x: 0, y: 0 },
	signboard_3: { x: 0, y: 0 },
	signboard_left_bottom: { x: 0, y: 0 },
	text_bonus: { x: 0, y: 0 },
	text_bonus2: { x: 0, y: 0 },

	// --- RIGHT SIGNBOARD ---
	Glow2: { x: 0, y: 0 },
	Glow_blue2: { x: 0, y: 0 },
	'light _r_bottom': { x: 0, y: 0 },
	'light _r_bottom2': { x: 0, y: 0 },
	'light _r_bottom3': { x: 0, y: 0 },
	light_glow_bottom: { x: 0, y: 0 },
	light_glow_bottom2: { x: 0, y: 0 },
	light_glow_bottom3: { x: 0, y: 0 },
	light_glow_r_top: { x: 0, y: 0 },
	light_glow_r_top2: { x: 0, y: 0 },
	light_glow_r_top3: { x: 0, y: 0 },
	light_r_top: { x: 0, y: 0 },
	light_r_top2: { x: 0, y: 0 },
	light_r_top3: { x: 0, y: 0 },
	signboard_4: { x: 0, y: 0 },
	signboard_right: { x: 0, y: 0 },
	text_right_bottom2: { x: 0, y: 0 },
	text_right_bottom3: { x: 0, y: 0 },
	text_right_bottom4: { x: 0, y: 0 },
	text_right_bottom5: { x: 0, y: 0 },
	text_right_bottom6: { x: 0, y: 0 },
	text_right_bottom7: { x: 0, y: 0 },
	text_right_top1: { x: 0, y: 0 },
	text_right_top10: { x: 0, y: 0 },
	text_right_top11: { x: 0, y: 0 },
	text_right_top12: { x: 0, y: 0 },
	text_right_top2: { x: 0, y: 0 },
	text_right_top3: { x: 0, y: 0 },
	text_right_top4: { x: 0, y: 0 },
	text_right_top5: { x: 0, y: 0 },
	text_right_top6: { x: 0, y: 0 },
	text_right_top7: { x: 0, y: 0 },
	text_right_top8: { x: 0, y: 0 },
	text_right_top9: { x: 0, y: 0 },

	// --- CENTER TEXT ---
	mivina: { x: 0, y: 0 },
	mivina_ad: { x: 0, y: 0 },
	text_fury: { x: 0, y: 0 },
	text_fury_ad: { x: 0, y: 0 },
	text_wok: { x: 0, y: 0 },
	text_wok2: { x: 0, y: 0 },

	// --- BOARD GLOW ---
	board_glow: { x: 0, y: 0 },
	board_glow2: { x: 0, y: 0 },
	board_glow_midlle2: { x: 0, y: 0 },
	board_glow_midlle3: { x: 0, y: 0 },
	board_glow_top2: { x: 0, y: 0 },
	board_glow_top3: { x: 0, y: 0 },

	// --- PURPLE GLOW ---
	Glow_purple3: { x: 0, y: 0 },
	Glow_purple4: { x: 0, y: 0 },
	Glow_purple5: { x: 0, y: 0 },
	Glow_purple6: { x: 0, y: 0 },
	Glow_purple7: { x: 0, y: 0 },
	Glow_purple8: { x: 0, y: 0 },
	Glow_purple_bottom: { x: 0, y: 0 },
};
