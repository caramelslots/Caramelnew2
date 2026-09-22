import { Howl } from 'howler';

import type { LoadedAudio } from 'pixi-svelte';

type SoundIdEntry = { howl: Howl; realId: number };

type EndListener = (soundId: number) => void;

/**
 * Howl-compatible facade over multiple audio packs (separate files / sprite maps).
 * Sound IDs are remapped so callers can treat all packs as one Howl.
 */
export function createMultiHowl(packs: LoadedAudio<string>[]): Howl {
	if (packs.length === 0) {
		throw new Error('createMultiHowl requires at least one audio pack');
	}
	if (packs.length === 1) {
		const pack = packs[0];
		return new Howl({
			src: pack.src,
			sprite: pack.sprite,
			volume: 1,
		});
	}

	const howls: Howl[] = [];
	const spriteToHowl = new Map<string, Howl>();
	const idMap = new Map<number, SoundIdEntry>();
	const realToSynthetic = new Map<Howl, Map<number, number>>();
	let nextSyntheticId = 1;
	const endListeners = new Set<EndListener>();
	let unloaded = false;

	const remember = (howl: Howl, realId: number) => {
		let byReal = realToSynthetic.get(howl);
		if (!byReal) {
			byReal = new Map();
			realToSynthetic.set(howl, byReal);
		}
		const existing = byReal.get(realId);
		if (existing !== undefined) return existing;

		const syntheticId = nextSyntheticId++;
		idMap.set(syntheticId, { howl, realId });
		byReal.set(realId, syntheticId);
		return syntheticId;
	};

	const resolve = (soundId: number) => idMap.get(soundId);

	const forget = (syntheticId: number) => {
		const entry = idMap.get(syntheticId);
		if (!entry) return;
		idMap.delete(syntheticId);
		realToSynthetic.get(entry.howl)?.delete(entry.realId);
	};

	for (const pack of packs) {
		const howl = new Howl({
			src: pack.src,
			sprite: pack.sprite,
			volume: 1,
		});
		howls.push(howl);
		for (const spriteName of Object.keys(pack.sprite)) {
			if (spriteToHowl.has(spriteName)) {
				throw new Error(`Duplicate sound sprite "${spriteName}" across audio packs`);
			}
			spriteToHowl.set(spriteName, howl);
		}
		howl.on('end', (realId: number) => {
			const syntheticId = realToSynthetic.get(howl)?.get(realId);
			if (syntheticId === undefined) return;
			for (const listener of endListeners) {
				listener(syntheticId);
			}
		});
	}

	const facade = {
		play(nameOrId?: string | number) {
			if (typeof nameOrId === 'number') {
				const entry = resolve(nameOrId);
				if (!entry) return nameOrId;
				const realId = entry.howl.play(entry.realId);
				entry.realId = realId;
				realToSynthetic.get(entry.howl)?.set(realId, nameOrId);
				return nameOrId;
			}

			if (typeof nameOrId !== 'string') {
				throw new Error('MultiHowl.play requires a sprite name or sound id');
			}

			const howl = spriteToHowl.get(nameOrId);
			if (!howl) {
				throw new Error(`Unknown sound sprite "${nameOrId}"`);
			}
			const realId = howl.play(nameOrId);
			return remember(howl, realId);
		},

		stop(soundId?: number) {
			if (soundId === undefined) {
				for (const howl of howls) howl.stop();
				idMap.clear();
				for (const map of realToSynthetic.values()) map.clear();
				return facade;
			}
			const entry = resolve(soundId);
			if (entry) {
				entry.howl.stop(entry.realId);
				forget(soundId);
			}
			return facade;
		},

		pause(soundId?: number) {
			if (soundId === undefined) {
				for (const howl of howls) howl.pause();
				return facade;
			}
			const entry = resolve(soundId);
			if (entry) entry.howl.pause(entry.realId);
			return facade;
		},

		volume(vol?: number, soundId?: number) {
			if (vol === undefined) {
				return howls[0]?.volume() ?? 1;
			}
			if (soundId === undefined) {
				for (const howl of howls) howl.volume(vol);
				return facade;
			}
			const entry = resolve(soundId);
			if (entry) entry.howl.volume(vol, entry.realId);
			return facade;
		},

		fade(from: number, to: number, duration: number, soundId?: number) {
			if (soundId === undefined) {
				for (const howl of howls) howl.fade(from, to, duration);
				return facade;
			}
			const entry = resolve(soundId);
			if (entry) entry.howl.fade(from, to, duration, entry.realId);
			return facade;
		},

		rate(rate?: number, soundId?: number) {
			if (rate === undefined) {
				return howls[0]?.rate() ?? 1;
			}
			if (soundId === undefined) {
				for (const howl of howls) howl.rate(rate);
				return facade;
			}
			const entry = resolve(soundId);
			if (entry) entry.howl.rate(rate, entry.realId);
			return facade;
		},

		on(event: string, listener: EndListener) {
			if (event === 'end') {
				endListeners.add(listener);
			}
			return facade;
		},

		off(event: string, listener?: EndListener) {
			if (event === 'end') {
				if (listener) endListeners.delete(listener);
				else endListeners.clear();
			}
			return facade;
		},

		once(event: string, listener: () => void, soundId?: number) {
			if (event !== 'end') return facade;

			const wrap: EndListener = (id) => {
				if (soundId !== undefined && id !== soundId) return;
				endListeners.delete(wrap);
				listener();
			};
			endListeners.add(wrap);
			return facade;
		},

		unload() {
			if (unloaded) return;
			unloaded = true;
			endListeners.clear();
			idMap.clear();
			realToSynthetic.clear();
			for (const howl of howls) howl.unload();
		},
	};

	return facade as unknown as Howl;
}

export function mergeLoadedAudio<TSoundName extends string>(
	packs: LoadedAudio<string>[],
): LoadedAudio<TSoundName> {
	const sprite: LoadedAudio<string>['sprite'] = {};
	const config: Record<string, { volume: number }> = {};
	const src: string[] = [];

	for (const pack of packs) {
		const packSrc = Array.isArray(pack.src) ? pack.src : [pack.src];
		src.push(...packSrc);
		Object.assign(sprite, pack.sprite);
		Object.assign(config, pack.config);
	}

	return {
		src,
		sprite,
		config: config as Record<TSoundName, { volume: number }>,
	};
}
