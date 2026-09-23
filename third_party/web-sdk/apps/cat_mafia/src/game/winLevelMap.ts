import { SECOND } from 'constants-shared/time';

/**
 * BGM segment lengths in `static/assets/audio/sounds.json` (ms).
 * SOUNDS_MEOWFIA.mp3 (see designer_assets/SOUND_MAP_MEOWFIA.md):
 *   Big          00:01.000 → 00:07.433
 *   Super        00:08.500 → 00:14.957
 *   Epic         00:16.000 → 00:22.361
 *   Sensational  00:24.000 → 00:33.457  (loops during count-up)
 */
export const WIN_BGM_MS = {
	big: 6433,
	superwin: 6457,
	epic: 6361,
	sensational: 9457,
} as const;

/** Cumulative ladder time through Epic (Big + Super + Epic). */
const WIN_LADDER_THROUGH_EPIC_MS = WIN_BGM_MS.big + WIN_BGM_MS.superwin + WIN_BGM_MS.epic;

/**
 * Money-stack big-win spine (`static/assets/spines/bigwin/money.json`).
 * Per tier: intro/transition on the main spine → freeze (stack stays) while
 * `banknotes_paket_*` loops on a second overlay spine (flying notes only).
 * Sensational dismiss plays `paket_4_out`; lower tiers map outro=idle (skip).
 */
export type BigWinSpineAnimationMap = {
	intro:
		| 'paket_1_in'
		| 'paket_1_to_paket_2'
		| 'paket_2_to_paket_3'
		| 'paket_3_to_paket_4';
	idle: 'banknotes_paket_1' | 'banknotes_paket_2' | 'banknotes_paket_3' | 'banknotes_paket_4';
	outro: 'paket_4_out' | 'banknotes_paket_1' | 'banknotes_paket_2' | 'banknotes_paket_3' | 'banknotes_paket_4';
};

/**
 * Wok Fury 4-tier win-level visual map.
 *
 * MUST stay in sync with math-sdk override in
 * `third_party/math-sdk/games/0_0_daloniil_test/game_config.py`
 * (`GameConfig.get_win_level`):
 *
 *   1..5  → no full-screen banner, just count-up ticker
 *   6     → BIG WIN              (10x..50x)
 *   7     → SUPER WIN            (50x..100x)
 *   8     → EPIC WIN             (100x..250x)
 *   9..10 → SENSATIONAL          (250x..wincap..∞)
 *
 * Spine clips live in `static/assets/spines/bigwin/money.json`.
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
		presentDuration: WIN_BGM_MS.big,
		bgmDuration: WIN_BGM_MS.big,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_big' },
		animation: {
			intro: 'paket_1_in',
			idle: 'banknotes_paket_1',
			outro: 'banknotes_paket_1',
		} satisfies BigWinSpineAnimationMap,
	},
	7: {
		level: 7,
		alias: 'superwin',
		type: 'big',
		text: 'SUPER WIN',
		presentDuration: WIN_BGM_MS.big + WIN_BGM_MS.superwin,
		bgmDuration: WIN_BGM_MS.superwin,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_superwin' },
		animation: {
			intro: 'paket_1_to_paket_2',
			idle: 'banknotes_paket_2',
			outro: 'banknotes_paket_2',
		} satisfies BigWinSpineAnimationMap,
	},
	8: {
		level: 8,
		alias: 'epic',
		type: 'big',
		text: 'EPIC WIN',
		presentDuration: WIN_LADDER_THROUGH_EPIC_MS,
		bgmDuration: WIN_BGM_MS.epic,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_epic' },
		animation: {
			intro: 'paket_2_to_paket_3',
			idle: 'banknotes_paket_3',
			outro: 'banknotes_paket_3',
		} satisfies BigWinSpineAnimationMap,
	},
	9: {
		level: 9,
		alias: 'sensational',
		type: 'big',
		text: 'SENSATIONAL',
		// Total count-up; sensational BGM loops for the remainder after the ladder.
		presentDuration: WIN_LADDER_THROUGH_EPIC_MS + 12 * SECOND,
		bgmDuration: WIN_BGM_MS.sensational,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_max' },
		animation: {
			intro: 'paket_3_to_paket_4',
			idle: 'banknotes_paket_4',
			outro: 'paket_4_out',
		} satisfies BigWinSpineAnimationMap,
	},
	10: {
		level: 10,
		alias: 'sensational',
		type: 'big',
		text: 'SENSATIONAL',
		presentDuration: WIN_LADDER_THROUGH_EPIC_MS + 14 * SECOND,
		bgmDuration: WIN_BGM_MS.sensational,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_max' },
		animation: {
			intro: 'paket_3_to_paket_4',
			idle: 'banknotes_paket_4',
			outro: 'paket_4_out',
		} satisfies BigWinSpineAnimationMap,
	},
} as const;

export type WinLevelMap = typeof winLevelMap;
export type WinLevel = keyof typeof winLevelMap;
export type WinLevelData = WinLevelMap[WinLevel];
export type WinLevelAlias = WinLevelData['alias'];
