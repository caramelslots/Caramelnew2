<!--
	Landed ×N on the top wood recess — Pixi overlay ABOVE the Spine curtain
	(not a SpineSlot: background_1x1 draws under arch / ribbon / character).
-->
<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { sineOut } from 'svelte/easing';
	import { untrack } from 'svelte';
	import { Container, Text } from 'pixi-svelte';

	import {
		SUPER_WILD_RESULT_BADGE_FADE_MS,
		SUPER_WILD_RESULT_BADGE_Y_FRAC,
		superWildResultBadgeFontFrac,
	} from '../game/superWildHtmlSpine';

	type Props = {
		visible: boolean;
		mult: number;
		/** Curtain column height (board-local px). */
		boxH: number;
		/** Curtain column width (board-local px). */
		boxW: number;
	};

	const props: Props = $props();

	const fontSize = $derived(Math.round(props.boxW * superWildResultBadgeFontFrac(props.mult)));
	const strokeWidth = $derived(Math.max(4, Math.round(fontSize * 0.1)));
	/** From column center: top of box + fraction down into the wood arch. */
	const badgeY = $derived(-props.boxH * 0.5 + props.boxH * SUPER_WILD_RESULT_BADGE_Y_FRAC);

	const alpha = new Tween(0);
	const popScale = new Tween(0.82);
	let wasVisible = $state(false);

	$effect(() => {
		const show = props.visible;
		untrack(() => {
			// Only animate on rising edge — stay put while visible stays true
			// (neighbor curtain spins must not restart this fade).
			if (show && !wasVisible) {
				void alpha.set(0, { duration: 0 });
				void popScale.set(0.82, { duration: 0 });
				void alpha.set(1, { duration: SUPER_WILD_RESULT_BADGE_FADE_MS, easing: sineOut });
				void popScale.set(1, { duration: SUPER_WILD_RESULT_BADGE_FADE_MS, easing: sineOut });
			} else if (!show && wasVisible) {
				void alpha.set(0, { duration: 0 });
				void popScale.set(0.82, { duration: 0 });
			}
			wasVisible = show;
		});
	});
</script>

{#if props.visible || alpha.current > 0.01}
	<Container
		x={0}
		y={badgeY}
		zIndex={20}
		alpha={alpha.current}
		scale={popScale.current}
	>
		<Text
			text={`×${props.mult}`}
			anchor={0.5}
			style={{
				fontFamily: 'proxima-nova, sans-serif',
				fontSize,
				fontWeight: '800',
				fill: 0xf3e6c0,
				align: 'center',
				stroke: { color: 0x1a1208, width: strokeWidth },
			}}
		/>
	</Container>
{/if}
