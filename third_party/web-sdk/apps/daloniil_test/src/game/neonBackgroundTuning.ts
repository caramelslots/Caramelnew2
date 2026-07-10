/** Смещение в пикселях Spine-арта. +x вправо, +y вниз. */
export type NeonElementTuning = {
	x?: number;
	y?: number;
	scaleX?: number;
	scaleY?: number;
};

/**
 * Глобальная подгонка neon-слоя.
 *
 * Spine (0,0) размещается в центре canvas + offsetX/offsetY * spineScale.
 * Единицы: Spine design-px (1 единица = 1 px при spineScale=1).
 * +offsetX → вправо, +offsetY → вниз по экрану.
 *
 * Эти значения эквивалентны старым (offsetX:600, offsetY:400, centerX:6.13, centerY:31.19)
 * при spineScale≈0.64 (canvas ~1024px) и дают правильный пропорциональный адаптив при ресайзе.
 */
export const NEON_OVERLAY_TUNING = {
	offsetX: -13,
	offsetY: 56,
	scale: 1.2,
};

/**
 * Масштаб text_wok для каждого типа устройства.
 * Portrait розбитий на три розміри — portrait-large/medium/small (Mobile L/M/S).
 */
export const TEXT_WOK_SCALE_BY_LAYOUT: Record<string, number> = {
	desktop: 1.0,
	tablet: 1.0,
	landscape: 1.0,
	'portrait-large': 0.7,
	'portrait-medium': 0.7,
	'portrait-small': 0.7,
};

/**
 * Дополнительное смещение text_wok (Spine design-px) для каждого типа устройства.
 * Применяется каждый кадр ПОВЕРХ базовой позиции из NEON_BONE_TUNING и анимации.
 * +x → вправо, +y → вниз.
 */
/**
 * Portrait розбитий на три розміри (по короткій стороні екрану):
 *   portrait-large  > 424px   (Mobile L, напр. iPhone 14 Plus 430px)
 *   portrait-medium 375–424px (Mobile M, напр. iPhone 14 375px)
 *   portrait-small  ≤ 374px   (Mobile S, напр. iPhone SE 320px)
 */
export const TEXT_WOK_OFFSET_BY_LAYOUT: Record<string, { x: number; y: number }> = {
	desktop: { x: 0, y: 0 },
	tablet: { x: 0, y: 0 },
	landscape: { x: 0, y: 0 },
	'portrait-large': { x: 40, y: 0 },
	'portrait-medium': { x: 40, y: 25 },
	'portrait-small': { x: 40, y: 15 },
};

/**
 * Сдвиг целой группы (кость). Двигает все слоты на этой кости.
 * Имена костей: signboard_left, signboard_right, text_wok, board, …
 */
export const NEON_BONE_TUNING: Record<string, NeonElementTuning> = {
	signboard_left: { x: 50, y: 60 },
	signboard_left_bottom: { x: 0, y: 0 },

	signboard_right: { x: -50, y: 60 },

	text_wok: { x: 5, y: 100 },

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

// ---------------------------------------------------------------------------
// Staggered neon activation (left → right)
// ---------------------------------------------------------------------------

/** Delay (ms) before the first sign lights up after game entrance. */
export const NEON_START_DELAY_MS = 1000;

/** Gap (ms) between each sign group activating. */
export const NEON_STAGGER_GAP_MS = 0;

/**
 * Additive glow slots grouped left-to-right.
 * Each group activates NEON_START_DELAY_MS + index * NEON_STAGGER_GAP_MS after
 * game entrance (started=true). HIDDEN_SLOTS are excluded — they stay invisible.
 */
export const NEON_STAGGER_GROUPS: readonly (readonly string[])[] = [
	// Group 0 — left lantern lights
	['light_l_top2', 'light_l_top3', 'light_l_glow2', 'light_l_glow3'],
	// Group 1 — left signboard text (Chinese characters)
	['text_left_1a', 'text_left_1a2', 'text_left_2a', 'text_left_2a2', 'j1', 'j2', 'ji2', 'ji5'],
	// Group 2 — left-bottom signboard (cat, bonus, bottom lights)
	['text_bonus2', 'cat2', 'cat3', 'light_glow_l3', 'light_glow_l4', 'light_l3', 'light_l4'],
	// Group 3 — WOK FURY (center top)
	['text_wok2', 'text_fury_ad'],
	// Group 4 — mivina sign
	['mivina_ad'],
	// Group 5 — right signboard (lights + text)
	[
		'light _r_bottom2',
		'light _r_bottom3',
		'light_glow_bottom2',
		'light_glow_bottom3',
		'light_r_top2',
		'light_r_top3',
		'light_glow_r_top2',
		'light_glow_r_top3',
		'text_right_bottom5',
		'text_right_bottom7',
		'text_right_bottom2',
		'text_right_bottom6',
		'text_right_bottom3',
		'text_right_bottom4',
		'text_right_top1',
		'text_right_top5',
		'text_right_top9',
		'text_right_top2',
		'text_right_top6',
		'text_right_top10',
		'text_right_top3',
		'text_right_top7',
		'text_right_top11',
		'text_right_top4',
		'text_right_top8',
		'text_right_top12',
	],
	// Group 6 — board purple glow (Glow_purple_* bones)
	[
		'Glow_purple_bottom',
		'Glow_purple3',
		'Glow_purple4',
		'Glow_purple5',
		'Glow_purple6',
		'Glow_purple7',
		'Glow_purple8',
	],
];
