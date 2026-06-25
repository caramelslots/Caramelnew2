<script lang="ts">
	import { onMount } from 'svelte';
	import { SpineProvider, SpineTrack } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { TRANSITION_THEME_SWITCH_DELAY_MS } from '../game/constants';

	type Props = {
		oncomplete: () => void;
		onThemeSwitch?: () => void;
		themeSwitchDelayMs?: number;
	};

	const props: Props = $props();
	const context = getContext();

	onMount(() => {
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_transition_steam' });

		if (!props.onThemeSwitch) return;

		const timer = setTimeout(
			props.onThemeSwitch,
			props.themeSwitchDelayMs ?? TRANSITION_THEME_SWITCH_DELAY_MS,
		);

		return () => clearTimeout(timer);
	});
</script>

<SpineProvider
	key="transition"
	x={context.stateLayoutDerived.canvasSizes().width * 0.5}
	y={context.stateLayoutDerived.canvasSizes().height * 0.5}
	height={context.stateLayoutDerived.canvasSizes().height * 1.7}
	zIndex={100}
>
	<SpineTrack
		trackIndex={0}
		animationName={'transition'}
		listener={{
			complete: props.oncomplete,
		}}
	/>
</SpineProvider>
