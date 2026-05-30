import { SECOND } from 'constants-shared/time';

/**
 * Cash Stacks 4-tier win-level visual map.
 *
 * MUST stay in sync with math-sdk override in
 * `third_party/math-sdk/games/0_0_daloniil_test/game_config.py`
 * (`GameConfig.get_win_level`):
 *
 *   1..5  → no full-screen banner, just count-up ticker
 *   6     → BIG WIN          (10x..50x)
 *   7     → SUPER WIN        (50x..100x)
 *   8     → EPIC WIN         (100x..250x)
 *   9..10 → SENSATIONAL WIN  (250x..wincap..∞)
 *
 * Spine animation names (`big_win_*`, `super_win_*`, `epic_win_*`,
 * `max_win_*`) reference baked-in sets inside
 * `static/assets/spines/bigwin/mm_bigwin.json`. The `mega_win_*` set is
 * still present in the spine but no longer referenced (kept as dead
 * asset to avoid an art rebuild).
 *
 * TODO (art):
 *   `sensational` reuses `max_win_*` spine, so the on-screen banner
 *   currently renders as "MAX WIN" (baked into the atlas). Replace with
 *   a dedicated `sensational_win_*` set when art delivers it. The
 *   in-data `text` field is already 'SENSATIONAL WIN' so DevButtons /
 *   logging surfaces the new label correctly.
 */
export const winLevelMap = {
	1: {
		level: 1,
		alias: 'zero',
		type: 'small',
		text: null,
		presentDuration: 0,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	2: {
		level: 2,
		alias: 'standard',
		type: 'small',
		text: null,
		presentDuration: 0.6 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	3: {
		level: 3,
		alias: 'small',
		type: 'small',
		text: null,
		presentDuration: 1 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	4: {
		level: 4,
		alias: 'nice',
		type: 'medium',
		text: null,
		presentDuration: 1.5 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	5: {
		level: 5,
		alias: 'substantial',
		type: 'medium',
		text: null,
		presentDuration: 2.0 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	6: {
		level: 6,
		alias: 'big',
		type: 'big',
		text: 'BIG WIN',
		presentDuration: 7 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_big' },
		animation: { intro: 'big_win_intro', idle: 'big_win_idle', outro: 'big_win_exit' },
	},
	7: {
		level: 7,
		alias: 'superwin',
		type: 'big',
		text: 'SUPER WIN',
		presentDuration: 16 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_superwin' },
		animation: { intro: 'super_win_intro', idle: 'super_win_idle', outro: 'super_win_exit' },
	},
	8: {
		level: 8,
		alias: 'epic',
		type: 'big',
		text: 'EPIC WIN',
		presentDuration: 22 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_epic' },
		animation: { intro: 'epic_win_intro', idle: 'epic_win_idle', outro: 'epic_win_exit' },
	},
	9: {
		level: 9,
		alias: 'sensational',
		type: 'big',
		text: 'SENSATIONAL WIN',
		presentDuration: 30 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_max' },
		animation: { intro: 'max_win_intro', idle: 'max_win_idle', outro: 'max_win_exit' },
	},
	10: {
		level: 10,
		alias: 'sensational',
		type: 'big',
		text: 'SENSATIONAL WIN',
		presentDuration: 32 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_max' },
		animation: { intro: 'max_win_intro', idle: 'max_win_idle', outro: 'max_win_exit' },
	},
} as const;

export type WinLevelMap = typeof winLevelMap;
export type WinLevel = keyof typeof winLevelMap;
export type WinLevelData = WinLevelMap[WinLevel];
export type WinLevelAlias = WinLevelData['alias'];
