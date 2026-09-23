import { createSound } from 'utils-sound';

export type MusicName =
	| 'bgm_main_intro'
	| 'bgm_main'
	| 'bgm_freespin_intro'
	| 'bgm_freespin'
	| 'bgm_winlevel_big'
	| 'bgm_winlevel_epic'
	| 'bgm_winlevel_max'
	| 'bgm_winlevel_superwin';

/** Sprites in `static/assets/audio/sounds.json` (SOUNDS_MEOWFIA.opus). */
export type SoundEffectName =
	| 'jng_intro_fs'
	| 'sfx_bigwin_coinloop'
	| 'sfx_btn_general'
	| 'sfx_btn_minus'
	| 'sfx_btn_plus'
	| 'sfx_btn_spin'
	| 'sfx_bullet_fly'
	| 'sfx_cat_1'
	| 'sfx_cat_2'
	| 'sfx_cat_3'
	| 'sfx_cat_4'
	| 'sfx_cat_5'
	| 'sfx_cat_slow'
	| 'sfx_coin_1'
	| 'sfx_coin_2'
	| 'sfx_coin_3'
	| 'sfx_coin_4'
	| 'sfx_coin_5'
	| 'sfx_coins_fly_in_hat'
	| 'sfx_dog_1'
	| 'sfx_dog_2'
	| 'sfx_dog_3'
	| 'sfx_dog_4'
	| 'sfx_dog_5'
	| 'sfx_dog_6'
	| 'sfx_fs_respins'
	| 'sfx_lift_targets'
	| 'sfx_multiplier_landing'
	| 'sfx_reel_stop_1'
	| 'sfx_revolver_barrell_spining'
	| 'sfx_revolver_in'
	| 'sfx_revolver_load'
	| 'sfx_revolver_open'
	| 'sfx_scatter_stop_1'
	| 'sfx_scatter_stop_2'
	| 'sfx_scatter_stop_3'
	| 'sfx_scatter_stop_4'
	| 'sfx_scatter_win_v2'
	| 'sfx_soot'
	| 'sfx_superfreespin'
	| 'sfx_target_hit'
	| 'sfx_target_spining'
	| 'sfx_transition_steam'
	| 'sfx_wild_open_spin'
	| 'sfx_winlevel_small'
	| 'sfx_youwon_panel';

/** Paw-coin voices. One per coin on the flip, and again when that coin lands. */
export const COIN_TURN_SOUNDS = [
	'sfx_coin_1',
	'sfx_coin_2',
	'sfx_coin_3',
	'sfx_coin_4',
	'sfx_coin_5',
] as const satisfies readonly SoundEffectName[];

export const CAT_MEOW_SOUNDS = [
	'sfx_cat_1',
	'sfx_cat_2',
	'sfx_cat_3',
	'sfx_cat_4',
	'sfx_cat_5',
] as const satisfies readonly SoundEffectName[];

export const DOG_BARK_SOUNDS = [
	'sfx_dog_1',
	'sfx_dog_2',
	'sfx_dog_3',
	'sfx_dog_4',
	'sfx_dog_5',
	'sfx_dog_6',
] as const satisfies readonly SoundEffectName[];

export type SoundName = MusicName | SoundEffectName;

export type BgmLoopName = 'bgm_main' | 'bgm_freespin';

const BGM_INTRO: Record<BgmLoopName, MusicName> = {
	bgm_main: 'bgm_main_intro',
	bgm_freespin: 'bgm_freespin_intro',
};

const sound = createSound<SoundName>();

export function playBgm(name: BgmLoopName, options?: { withIntro?: boolean }) {
	if (options?.withIntro) {
		sound.players.music.playWithIntro?.({ intro: BGM_INTRO[name], loop: name });
		return;
	}
	sound.players.music.play({ name });
}

export { sound };
