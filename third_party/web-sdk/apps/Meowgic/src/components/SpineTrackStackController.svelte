<script lang="ts">
	/**
	 * Idle ↔ reaction with Spine mix.
	 *
	 * One-shot: idle stack keeps looping. Reaction plays on a higher overlay
	 * track (mix in). When it ends we freeze the last frame and dissolve
	 * `track.alpha` → 0 so particles/attachments don't pop off, then clear.
	 *
	 * Hold: replace tracks while `reacting`, mix back to idle after.
	 */
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import {
		SPIN_SCENE_REACTION_MIX_IN_SEC,
		SPIN_SCENE_REACTION_MIX_OUT_SEC,
	} from '../game/constants';

	type TrackClip = {
		trackIndex: number;
		animationName: string;
	};

	type Props = {
		idleTracks: readonly TrackClip[];
		reactionTracks: readonly TrackClip[];
		/** Hold mode: stay in reaction while true. Ignored when `oneShot`. */
		reacting?: boolean;
		/** Bump to (re)start a reaction. Required for `oneShot`. */
		reactionToken?: number;
		timeScale?: number;
		mixInSec?: number;
		mixOutSec?: number;
		/** Hold mode only — loop reaction for the whole spin. */
		loopReaction?: boolean;
		/** Play reaction once per token as an overlay, then fade back to idle. */
		oneShot?: boolean;
		/**
		 * Soft track-alpha dissolve (BG lamps/particles). Board reaction is
		 * bone-only — alpha fade made it look like it never fired; use Spine mix.
		 */
		alphaFade?: boolean;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	let booted = false;
	let lastReacting = false;
	let lastToken = -1;
	let oneShotGen = 0;
	let disposed = false;
	const fadeRafs = new Set<number>();

	onDestroy(() => {
		disposed = true;
		for (const id of fadeRafs) cancelAnimationFrame(id);
		fadeRafs.clear();
	});

	const mixIn = () => props.mixInSec ?? SPIN_SCENE_REACTION_MIX_IN_SEC;
	const mixOut = () => props.mixOutSec ?? SPIN_SCENE_REACTION_MIX_OUT_SEC;
	const timeScaleNow = () => props.timeScale ?? 1;

	const highestTrack = (tracks: readonly TrackClip[]) =>
		tracks.reduce((max, track) => Math.max(max, track.trackIndex), 0);

	const registerCrossMixes = (
		fromTracks: readonly TrackClip[],
		toTracks: readonly TrackClip[],
		sec: number,
	) => {
		const data = spine.state.data;
		for (const from of fromTracks) {
			for (const to of toTracks) {
				if (from.trackIndex !== to.trackIndex) continue;
				if (from.animationName === to.animationName) continue;
				try {
					data.setMix(from.animationName, to.animationName, sec);
				} catch {
					/* animation missing on this skeleton piece */
				}
			}
		}
	};

	const clearUnusedTracks = (keep: ReadonlySet<number>, mixSec: number) => {
		const clearThrough = Math.max(
			highestTrack(props.idleTracks),
			highestTrack(props.reactionTracks),
			(spine.state.tracks?.length ?? 1) - 1,
			0,
		);
		for (let i = 0; i <= clearThrough; i++) {
			if (keep.has(i)) continue;
			if (spine.state.getTrack(i)) spine.state.setEmptyAnimation(i, mixSec);
		}
	};

	const applyStack = (tracks: readonly TrackClip[], loop: boolean, mixSec: number) => {
		const state = spine.state;
		const scale = timeScaleNow();
		const keep = new Set(tracks.map((track) => track.trackIndex));
		clearUnusedTracks(keep, mixSec);

		for (const clip of tracks) {
			let entry: ReturnType<typeof state.setAnimation>;
			try {
				entry = state.setAnimation(clip.trackIndex, clip.animationName, loop);
			} catch {
				continue;
			}
			if (!entry) continue;
			entry.mixDuration = mixSec;
			entry.timeScale = scale;
			entry.listener = undefined;
		}

		spine.spineAttachmentsDirty = true;
		if (spine.autoUpdate === false) spine.update(0);
	};

	const applyIdle = (mixSec: number) => {
		registerCrossMixes(props.reactionTracks, props.idleTracks, mixSec);
		applyStack(props.idleTracks, true, mixSec);
	};

	const applyReaction = (loop: boolean, mixSec: number) => {
		registerCrossMixes(props.idleTracks, props.reactionTracks, mixSec);
		applyStack(props.reactionTracks, loop, mixSec);
	};

	const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

	/**
	 * Soft lamp ignition via track alpha.
	 * Ease-out (not ease-in): rises with the board reaction instead of lagging
	 * ~half a second behind a cubic ramp from zero.
	 */
	const fadeOverlayIn = (trackIndex: number, durationSec: number, gen: number) => {
		const state = spine.state;
		const track = state.tracks?.[trackIndex];
		if (!track) return;

		track.alpha = 0;
		const startedAt = performance.now();
		const durationMs = Math.max(16, durationSec * 1000);

		const step = (now: number) => {
			if (disposed || gen !== oneShotGen) return;
			const live = state.tracks?.[trackIndex];
			if (!live) return;

			const t = Math.min(1, (now - startedAt) / durationMs);
			live.alpha = easeOutCubic(t);
			spine.spineAttachmentsDirty = true;

			if (t < 1) {
				const id = requestAnimationFrame(step);
				fadeRafs.add(id);
				return;
			}
			live.alpha = 1;
		};

		const id = requestAnimationFrame(step);
		fadeRafs.add(id);
	};

	/**
	 * Dissolve overlay contribution so reaction-only particles don't hard-cut.
	 * Idle underneath is already looping — alpha → 0 reveals it.
	 */
	const fadeOverlayOut = (trackIndex: number, durationSec: number, gen: number) => {
		const state = spine.state;
		const track = state.tracks?.[trackIndex];
		if (!track) {
			state.setEmptyAnimation(trackIndex, 0);
			return;
		}

		track.timeScale = 0;
		const fromAlpha = track.alpha;
		const startedAt = performance.now();
		const durationMs = Math.max(16, durationSec * 1000);

		const step = (now: number) => {
			if (disposed || gen !== oneShotGen) return;
			const live = state.tracks?.[trackIndex];
			if (!live) return;

			const t = Math.min(1, (now - startedAt) / durationMs);
			const eased = easeOutCubic(t);
			live.timeScale = 0;
			live.alpha = fromAlpha * (1 - eased);
			spine.spineAttachmentsDirty = true;

			if (t < 1) {
				const id = requestAnimationFrame(step);
				fadeRafs.add(id);
				return;
			}

			live.alpha = 1;
			state.setEmptyAnimation(trackIndex, 0);
			spine.spineAttachmentsDirty = true;
		};

		const id = requestAnimationFrame(step);
		fadeRafs.add(id);
	};

	/**
	 * Overlay one-shot: leave idle tracks alone, play reaction above them.
	 * BG uses alpha dissolve (attachments/particles); board uses Spine mix
	 * (bone reaction must stay at full track alpha or it reads as "missing").
	 */
	const playOneShot = (token: number) => {
		const gen = ++oneShotGen;
		const inSec = mixIn();
		const outSec = mixOut();
		const state = spine.state;
		const scale = timeScaleNow();
		const useAlphaFade = props.alphaFade === true;

		const overlayBase =
			Math.max(highestTrack(props.idleTracks), highestTrack(props.reactionTracks), 0) + 1;

		// Drop a previous overlay if Spin is mashed mid-reaction.
		const clearThrough = overlayBase + props.reactionTracks.length;
		for (let i = overlayBase; i <= clearThrough; i++) {
			if (state.getTrack(i)) state.setEmptyAnimation(i, useAlphaFade ? 0 : inSec);
		}

		props.reactionTracks.forEach((clip, index) => {
			const trackIndex = overlayBase + index;
			let entry: ReturnType<typeof state.setAnimation>;
			try {
				entry = state.setAnimation(trackIndex, clip.animationName, false);
			} catch {
				return;
			}
			if (!entry) return;
			entry.timeScale = scale;
			entry.listener = undefined;

			if (useAlphaFade) {
				entry.mixDuration = 0;
				entry.alpha = 0;
				entry.listener = {
					complete: () => {
						if (gen !== oneShotGen) return;
						fadeOverlayOut(trackIndex, outSec, gen);
					},
				};
				fadeOverlayIn(trackIndex, inSec, gen);
			} else {
				entry.mixDuration = inSec;
				entry.alpha = 1;
				state.addEmptyAnimation(trackIndex, outSec, 0);
			}
		});

		spine.spineAttachmentsDirty = true;
		if (spine.autoUpdate === false) spine.update(0);
		void token;
	};

	$effect(() => {
		const token = props.reactionToken ?? 0;
		const reacting = props.reacting ?? false;
		void timeScaleNow();

		if (props.oneShot) {
			if (!booted) {
				booted = true;
				lastToken = token;
				applyIdle(0);
				return;
			}
			if (token !== lastToken && token > 0) {
				lastToken = token;
				playOneShot(token);
			}
			return;
		}

		if (!booted) {
			booted = true;
			lastReacting = reacting;
			lastToken = token;
			if (reacting) applyReaction(props.loopReaction ?? true, 0);
			else applyIdle(0);
			return;
		}

		if (reacting === lastReacting && token === lastToken) return;
		const entered = reacting && !lastReacting;
		const exited = !reacting && lastReacting;
		const retriggered = reacting && token !== lastToken;
		lastReacting = reacting;
		lastToken = token;

		if (entered || retriggered) {
			applyReaction(props.loopReaction ?? true, mixIn());
			return;
		}
		if (exited) {
			applyIdle(mixOut());
		}
	});

	$effect(() => {
		const scale = timeScaleNow();
		const tracks = spine.state.tracks;
		if (!tracks) return;
		for (const track of tracks) {
			if (track) track.timeScale = scale;
		}
	});
</script>
