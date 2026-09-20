<!--
	Main money-stack track: intro/transition → freeze last frame (stack stays).
	`banknotes_paket_*` run on a sibling overlay from tier start. Sensational
	dismiss uses `paket_4_out` while banknotes keep running until outro completes.
-->
<script lang="ts">
	import { SpineTrack, getContextSpine } from 'pixi-svelte';

	import type { BigWinSpineAnimationMap } from '../game/winLevelMap';

	type AnimationState = 'intro' | 'outro';

	type Props = {
		animationMap: BigWinSpineAnimationMap;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	let animationState = $state<AnimationState>('intro');
	let outroResolve: (() => void) | null = null;

	const freezeAtEnd = () => {
		const track = spine.state.tracks[0];
		if (!track) return;
		track.timeScale = 0;
		if (track.animation) {
			track.trackTime = track.animation.duration;
		}
	};

	/** New ladder tier — restart from that tier's intro at full speed. */
	$effect(() => {
		props.animationMap.intro;
		animationState = 'intro';
		outroResolve = null;
		const track = spine.state.tracks[0];
		if (track) track.timeScale = 1;
	});

	/**
	 * Play map.outro when it differs from idle (Sensational → `paket_4_out`).
	 * Banknotes overlay stays up — parent tears it down after this resolves.
	 * Big/Super/Epic map outro=idle — resolve immediately (parent finishes banknotes).
	 */
	export function playOutro(): Promise<void> {
		const { idle, outro } = props.animationMap;
		if (outro === idle) {
			return Promise.resolve();
		}
		if (animationState === 'outro') {
			return new Promise((resolve) => {
				const prev = outroResolve;
				outroResolve = () => {
					prev?.();
					resolve();
				};
			});
		}
		return new Promise((resolve) => {
			outroResolve = resolve;
			animationState = 'outro';
			const track = spine.state.tracks[0];
			if (track) track.timeScale = 1;
		});
	}

	const onComplete = () => {
		if (animationState === 'intro') {
			freezeAtEnd();
			return;
		}
		if (animationState === 'outro') {
			const resolve = outroResolve;
			outroResolve = null;
			resolve?.();
		}
	};
</script>

<SpineTrack
	trackIndex={0}
	animationName={
		animationState === 'outro' ? props.animationMap.outro : props.animationMap.intro
	}
	loop={false}
	listener={{
		complete: onComplete,
	}}
/>
