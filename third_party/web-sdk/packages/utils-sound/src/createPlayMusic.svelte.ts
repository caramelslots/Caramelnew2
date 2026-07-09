import type { Howl } from 'howler';

import type { LoadedAudio } from 'pixi-svelte';

import type { PlayOptions, GetSound, GetSoundMap } from './types';

export function createPlayMusic<TSoundName extends string>(options: {
	howl: Howl;
	newSound: (value: TSoundName) => GetSound<TSoundName>;
	getSoundMap: () => GetSoundMap<TSoundName>;
	initSoundVolume: (soundName: TSoundName) => void;
	loadedAudio: LoadedAudio<TSoundName>;
}) {
	type Sound = GetSound<TSoundName>;

	const isLoopSprite = (soundName: TSoundName) =>
		options.loadedAudio.sprite[soundName]?.[2] === true;

	const removeSound = (sound: Sound) => {
		options.howl.stop(sound.soundId);
		delete options.getSoundMap()[sound.soundName];
	};

	const pauseLoopTrack = (sound: Sound) => {
		if (sound.soundState !== 'playing') return;
		options.howl.pause(sound.soundId);
		options.getSoundMap()[sound.soundName] = {
			...sound,
			soundState: 'paused',
		};
	};

	const pauseOtherLoopMusic = (except: TSoundName) => {
		(Object.values(options.getSoundMap()) as Sound[]).forEach((existingSound) => {
			if (!isLoopSprite(existingSound.soundName) || existingSound.soundName === except) {
				return;
			}
			pauseLoopTrack(existingSound);
		});
	};

	const pauseAllLoopMusic = () => {
		(Object.values(options.getSoundMap()) as Sound[]).forEach((existingSound) => {
			if (isLoopSprite(existingSound.soundName)) {
				pauseLoopTrack(existingSound);
			}
		});
	};

	const stopNonLoopMusic = () => {
		(Object.values(options.getSoundMap()) as Sound[]).forEach((existingSound) => {
			if (!isLoopSprite(existingSound.soundName)) {
				removeSound(existingSound);
			}
		});
	};

	const playFresh = (sound: Sound) => {
		const soundId = options.howl.play(sound.soundName);
		options.getSoundMap()[sound.soundName] = {
			...sound,
			soundId,
			soundState: 'playing',
		};
		options.initSoundVolume(sound.soundName);
	};

	const startLoopFresh = (sound: Sound) => {
		pauseOtherLoopMusic(sound.soundName);
		const existingLoop = options.getSoundMap()[sound.soundName];
		if (existingLoop) removeSound(existingLoop);
		stopNonLoopMusic();
		playFresh(sound);
	};

	const startOverlayMusic = (sound: Sound) => {
		pauseAllLoopMusic();
		stopNonLoopMusic();
		playFresh(sound);
	};

	const resumeLoopMusic = (sound: Sound) => {
		pauseOtherLoopMusic(sound.soundName);
		stopNonLoopMusic();
		const soundId = options.howl.play(sound.soundId);
		options.getSoundMap()[sound.soundName] = {
			...sound,
			soundId,
			soundState: 'playing',
		};
		options.initSoundVolume(sound.soundName);
	};

	const soundPlayMap = {
		new: (sound: Sound) =>
			isLoopSprite(sound.soundName) ? startLoopFresh(sound) : startOverlayMusic(sound),
		paused: (sound: Sound) =>
			isLoopSprite(sound.soundName) ? resumeLoopMusic(sound) : startOverlayMusic(sound),
		playing: (sound: Sound) => {
			if (isLoopSprite(sound.soundName)) return;
			startOverlayMusic(sound);
		},
	};

	const play = (playOptions: PlayOptions<TSoundName>) => {
		const existingSound = options.getSoundMap()[playOptions.name];
		const sound = existingSound ?? options.newSound(playOptions.name);
		soundPlayMap[sound.soundState](sound);
	};

	let introEndListener: ((soundId: number) => void) | null = null;

	const playWithIntro = (playOptions: { intro: TSoundName; loop: TSoundName }) => {
		if (introEndListener) {
			options.howl.off('end', introEndListener);
			introEndListener = null;
		}

		pauseOtherLoopMusic(playOptions.loop);
		const existingLoop = options.getSoundMap()[playOptions.loop];
		if (existingLoop) removeSound(existingLoop);
		stopNonLoopMusic();

		const soundId = options.howl.play(playOptions.intro);
		options.getSoundMap()[playOptions.intro] = {
			...options.newSound(playOptions.intro),
			soundId,
			soundState: 'playing',
		};
		options.initSoundVolume(playOptions.intro);

		introEndListener = (endedId: number) => {
			if (endedId !== soundId) return;
			options.howl.off('end', introEndListener!);
			introEndListener = null;
			delete options.getSoundMap()[playOptions.intro];
			options.howl.stop(soundId);
			startLoopFresh(options.newSound(playOptions.loop));
		};
		options.howl.on('end', introEndListener);
	};

	return {
		play,
		playWithIntro,
	};
}
