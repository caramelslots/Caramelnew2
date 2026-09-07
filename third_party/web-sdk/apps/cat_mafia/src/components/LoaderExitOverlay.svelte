<!--
	Duplicate street plate on top of the pre-mounted slot.
	Pre-mounted (armed) while cards are visible so the image is painted before exit.
	Fades out + blurs once while cards slide down.
-->
<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';

	import { getContext } from '../game/context';
	import { LOADER_STATIC_DAY_URL } from '../game/earlyLoaderPreload';
	import { LOADER_EXIT_BG_BLUR_PX, LOADER_EXIT_BG_DURATION_MS } from '../game/constants';
	import { getBackgroundCoverScreenBox } from '../game/neonBackgroundLayout';

	type Props = {
		/** Exit animation is running. */
		exiting: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	let bgFadeDone = $state(false);

	const opacity = new Tween(1);
	const blur = new Tween(0);

	const streetStyle = $derived.by(() => {
		const layout = context.stateLayoutDerived.canvasSizes();
		const canvas =
			layout.width > 0 && layout.height > 0
				? layout
				: { width: window.innerWidth, height: window.innerHeight };
		const box = getBackgroundCoverScreenBox(canvas);
		return [
			`left:${box.left}px`,
			`top:${box.top}px`,
			`width:${box.width}px`,
			`height:${box.height}px`,
		].join(';');
	});

	$effect(() => {
		if (!props.exiting) {
			bgFadeDone = false;
			void opacity.set(1, { duration: 0 });
			void blur.set(0, { duration: 0 });
			return;
		}

		bgFadeDone = false;
		void Promise.all([
			opacity.set(0, { duration: LOADER_EXIT_BG_DURATION_MS, easing: cubicOut }),
			blur.set(LOADER_EXIT_BG_BLUR_PX, { duration: LOADER_EXIT_BG_DURATION_MS, easing: cubicOut }),
		]).then(() => {
			bgFadeDone = true;
		});
	});
</script>

<!-- Always in DOM while armed — img stays decoded; hidden until exiting. -->
{#if !bgFadeDone}
	<div
		class="exit-layer"
		class:exit-layer--exiting={props.exiting}
		style:opacity={props.exiting ? opacity.current : 1}
	>
	<img
		class="street"
		src={LOADER_STATIC_DAY_URL}
		alt=""
		draggable="false"
		style="{streetStyle}; filter: blur({blur.current}px);"
	/>
	</div>
{/if}

<style lang="scss">
	.exit-layer {
		position: fixed;
		inset: 0;
		z-index: 48;
		pointer-events: none;
		overflow: hidden;
		/* Transparent while armed — LoaderStreetStill (z-42) shows through. */
		visibility: hidden;
		background: transparent;
		will-change: opacity;
	}

	.exit-layer--exiting {
		visibility: visible;
		background: #000;
	}

	.street {
		position: absolute;
		object-fit: fill;
		opacity: 1;
		pointer-events: none;
		user-select: none;
		will-change: filter;
	}
</style>
