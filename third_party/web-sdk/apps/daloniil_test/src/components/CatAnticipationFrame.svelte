<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { sineOut } from 'svelte/easing';
	import { Container, Sprite } from 'pixi-svelte';

	import { CAT_ANTICIPATION_FRAME_LAYOUT } from '../game/catAnticipation';

	type Props = {
		x: number;
		y: number;
		width: number;
		height: number;
	};

	const props: Props = $props();

	const alpha = new Tween(0);
	const scale = new Tween(CAT_ANTICIPATION_FRAME_LAYOUT.scaleFrom);

	onMount(() => {
		void alpha.set(1, {
			duration: CAT_ANTICIPATION_FRAME_LAYOUT.fadeInMs,
			easing: sineOut,
		});
		void scale.set(1, {
			duration: CAT_ANTICIPATION_FRAME_LAYOUT.fadeInMs + 60,
			easing: sineOut,
		});
	});
</script>

<Container x={props.x} y={props.y} alpha={alpha.current} scale={scale.current}>
	<Sprite key="catAnticipationFrame" anchor={0.5} width={props.width} height={props.height} />
</Container>
