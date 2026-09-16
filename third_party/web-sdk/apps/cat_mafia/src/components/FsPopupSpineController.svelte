<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import { getContextSpine } from 'pixi-svelte';

	type Phase = 'in' | 'idle' | 'out';

	/** `sum` scales to ~0 by 0.7s in total_win `out` — truncate trailing idle keys. */
	const OUT_VISUAL_END_SEC = 0.75;

	const spine = getContextSpine();

	let phase = $state<Phase>('in');
	let disappearResolve = $state<(() => void) | undefined>();

	const resolveDisappear = () => {
		if (!disappearResolve) return;
		const resolve = disappearResolve;
		disappearResolve = undefined;
		resolve();
	};

	const onTrackComplete = (entry: { animation?: { name?: string } }) => {
		const name = entry.animation?.name;
		if (name === 'in') {
			phase = 'idle';
			const idleEntry = spine.state.addAnimation(0, 'idle', true, 0);
			idleEntry.listener = { complete: onTrackComplete };
			return;
		}
		if (name === 'out') {
			resolveDisappear();
		}
	};

	const onTrackEnd = (entry: { animation?: { name?: string } }) => {
		if (entry.animation?.name === 'out') {
			resolveDisappear();
		}
	};

	const setAnimation = (name: Phase, loop: boolean, animationEnd?: number) => {
		const entry = spine.state.setAnimation(0, name, loop);
		if (animationEnd !== undefined) entry.animationEnd = animationEnd;
		entry.listener = { complete: onTrackComplete, end: onTrackEnd };
	};

	onMount(() => {
		setAnimation('in', false);
	});

	export function playDisappear(): Promise<void> {
		if (phase === 'out') {
			return new Promise((resolve) => {
				disappearResolve = resolve;
			});
		}

		return new Promise((resolve) => {
			phase = 'out';
			disappearResolve = resolve;
			setAnimation('out', false, OUT_VISUAL_END_SEC);
		});
	}

	onDestroy(() => {
		spine.state.setEmptyAnimation(0, 0);
	});
</script>
