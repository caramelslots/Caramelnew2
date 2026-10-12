<script lang="ts">
	import { onMount } from 'svelte';
	import { SpineProvider, SpineTrack } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { TRANSITION_THEME_SWITCH_DELAY_MS } from '../game/constants';

	type Props = {
		oncomplete: () => void;
		onThemeSwitch?: () => void;
		themeSwitchDelayMs?: number;
		/** False = caller applies theme after a GPU barrier (FS entry tir unload). */
		timedThemeSwitch?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	onMount(() => {
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_transition_steam' });

		if (!props.onThemeSwitch || props.timedThemeSwitch === false) return;

		const timer = setTimeout(
			props.onThemeSwitch,
			props.themeSwitchDelayMs ?? TRANSITION_THEME_SWITCH_DELAY_MS,
		);

		return () => clearTimeout(timer);
	});
</script>

<!--
	Pixi zIndex above Win (10), drum (8), tir FX (93), etc.
	CSS stacking: Game.svelte `.pixi-stage.above-html-ui` lifts the whole canvas
	over HTML HUD / win / duel chrome while the spine plays.
-->
<SpineProvider
	key="transition"
	x={context.stateLayoutDerived.canvasSizes().width * 0.5}
	y={context.stateLayoutDerived.canvasSizes().height * 0.5}
	height={context.stateLayoutDerived.canvasSizes().height * 1.7}
	zIndex={1000}
>
	<SpineTrack
		trackIndex={0}
		animationName={'transition'}
		listener={{
			complete: props.oncomplete,
		}}
	/>
</SpineProvider>
