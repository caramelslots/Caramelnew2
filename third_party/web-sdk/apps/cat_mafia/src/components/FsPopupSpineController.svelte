<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import { getContextSpine } from 'pixi-svelte';

	type Phase = 'appear' | 'idle' | 'disappear';

	/** Visual fade-out in fs_popup `disappear` — track runs to 1.03s unless truncated. */
	const DISAPPEAR_VISUAL_END_SEC = 0.267;

	const spine = getContextSpine();

	let phase = $state<Phase>('appear');
	let disappearResolve = $state<(() => void) | undefined>();

	const resolveDisappear = () => {
		if (!disappearResolve) return;
		const resolve = disappearResolve;
		disappearResolve = undefined;
		resolve();
	};

	const onTrackComplete = (entry: { animation?: { name?: string } }) => {
		const name = entry.animation?.name;
		if (name === 'appear') {
			phase = 'idle';
			const idleEntry = spine.state.addAnimation(0, 'idle', true, 0);
			idleEntry.listener = { complete: onTrackComplete };
			return;
		}
		if (name === 'disappear') {
			resolveDisappear();
		}
	};

	const onTrackEnd = (entry: { animation?: { name?: string } }) => {
		if (entry.animation?.name === 'disappear') {
			resolveDisappear();
		}
	};

	const setAnimation = (name: Phase, loop: boolean, animationEnd?: number) => {
		const entry = spine.state.setAnimation(0, name, loop);
		if (animationEnd !== undefined) entry.animationEnd = animationEnd;
		entry.listener = { complete: onTrackComplete, end: onTrackEnd };
	};

	onMount(() => {
		setAnimation('appear', false);
	});

	export function playDisappear(): Promise<void> {
		if (phase === 'disappear') {
			return new Promise((resolve) => {
				disappearResolve = resolve;
			});
		}

		return new Promise((resolve) => {
			phase = 'disappear';
			disappearResolve = resolve;
			setAnimation('disappear', false, DISAPPEAR_VISUAL_END_SEC);
		});
	}

	onDestroy(() => {
		spine.state.setEmptyAnimation(0, 0);
	});
</script>
