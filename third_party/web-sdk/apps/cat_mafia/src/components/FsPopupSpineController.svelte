<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import { getContextSpine } from 'pixi-svelte';

	/** Matches total_win export clips (`in3` → `idle2` → `out2`). */
	type Phase = 'in3' | 'idle2' | 'out2';

	/** `sum` scales to ~0 by 0.7s in total_win `out2` — truncate trailing idle keys. */
	const OUT_VISUAL_END_SEC = 0.75;

	const spine = getContextSpine();

	let phase = $state<Phase>('in3');
	let disappearResolve = $state<(() => void) | undefined>();

	const resolveDisappear = () => {
		if (!disappearResolve) return;
		const resolve = disappearResolve;
		disappearResolve = undefined;
		resolve();
	};

	const onTrackComplete = (entry: { animation?: { name?: string } }) => {
		const name = entry.animation?.name;
		if (name === 'in3') {
			phase = 'idle2';
			const idleEntry = spine.state.addAnimation(0, 'idle2', true, 0);
			idleEntry.listener = { complete: onTrackComplete };
			return;
		}
		if (name === 'out2') {
			resolveDisappear();
		}
	};

	const onTrackEnd = (entry: { animation?: { name?: string } }) => {
		if (entry.animation?.name === 'out2') {
			resolveDisappear();
		}
	};

	const setAnimation = (name: Phase, loop: boolean, animationEnd?: number) => {
		const entry = spine.state.setAnimation(0, name, loop);
		if (animationEnd !== undefined) entry.animationEnd = animationEnd;
		entry.listener = { complete: onTrackComplete, end: onTrackEnd };
	};

	onMount(() => {
		setAnimation('in3', false);
	});

	export function playDisappear(): Promise<void> {
		if (phase === 'out2') {
			return new Promise((resolve) => {
				disappearResolve = resolve;
			});
		}

		return new Promise((resolve) => {
			phase = 'out2';
			disappearResolve = resolve;
			setAnimation('out2', false, OUT_VISUAL_END_SEC);
		});
	}

	onDestroy(() => {
		spine.state.setEmptyAnimation(0, 0);
	});
</script>
