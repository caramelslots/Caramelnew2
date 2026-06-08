import type { Howl } from 'howler';

import type { PlayOptions, GetSound, GetSoundMap } from './types';

export function createPlayMusic<TSoundName extends string>(options: {
	howl: Howl;
	newSound: (value: TSoundName) => GetSound<TSoundName>;
	getSoundMap: () => GetSoundMap<TSoundName>;
	initSoundVolume: (soundName: TSoundName) => void;
}) {
	type Sound = GetSound<TSoundName>;

	/** Stop every tracked music instance so the next sprite starts cleanly. */
	const stopAllMusic = () => {
		(Object.values(options.getSoundMap()) as Sound[]).forEach((existingSound) => {
			options.howl.stop(existingSound.soundId);
			delete options.getSoundMap()[existingSound.soundName];
		});
	};

	const startMusic = (sound: Sound) => {
		stopAllMusic();
		const soundId = options.howl.play(sound.soundName);
		options.getSoundMap()[sound.soundName] = {
			...sound,
			soundId,
			soundState: 'playing',
		};
		options.initSoundVolume(sound.soundName);
	};

	const soundPlayMap = {
		new: (sound: Sound) => startMusic(sound),
		// Always restart from the sprite offset — resuming by soundId breaks after
		// ladder tier switches (Big → Super → Epic) leave stale paused instances.
		paused: (sound: Sound) => startMusic(sound),
		playing: (sound: Sound) => startMusic(sound),
	};

	const play = (playOptions: PlayOptions<TSoundName>) => {
		const existingSound = options.getSoundMap()[playOptions.name];
		const sound = existingSound ?? options.newSound(playOptions.name);
		soundPlayMap[sound.soundState](sound);
	};

	return {
		play,
	};
}
