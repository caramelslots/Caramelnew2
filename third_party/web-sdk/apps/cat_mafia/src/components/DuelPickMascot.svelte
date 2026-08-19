<!--
	Lightweight Spine mascot for the Duel side-pick screen (idle loop only).
	Kept mounted after warm-up so choose-side opens without a Spine load hitch.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SpinePlayer } from '@esotericsoftware/spine-player';
	import '@esotericsoftware/spine-player/dist/spine-player.css';

	import {
		MASCOT_SPINE_ANIMATIONS,
		MASCOT_SPINE_VIEWPORT,
		resolveMascotSpineUrl,
	} from '../game/mascotHtmlSpine';

	type Props = {
		/** Mirror for the dog-side pick. */
		mirror?: boolean;
		/** When false, pause the idle loop to save CPU while the pick UI is hidden. */
		playing?: boolean;
	};

	const props: Props = $props();
	const playing = $derived(props.playing !== false);

	let container = $state<HTMLDivElement | undefined>();
	let player: SpinePlayer | undefined;
	let ready = $state(false);

	$effect(() => {
		const el = container;
		if (!el) return;

		player?.dispose();
		player = undefined;
		ready = false;
		el.replaceChildren();

		const viewportAnims = Object.fromEntries(
			MASCOT_SPINE_ANIMATIONS.map((name) => [name, MASCOT_SPINE_VIEWPORT]),
		);

		const created = new SpinePlayer(el, {
			jsonUrl: resolveMascotSpineUrl('mascot_cat.json'),
			atlasUrl: resolveMascotSpineUrl('mascot_cat.atlas'),
			animation: 'idle',
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: false,
			alpha: true,
			defaultMix: 0.15,
			viewport: {
				...MASCOT_SPINE_VIEWPORT,
				animations: viewportAnims,
			},
			success: (spinePlayer) => {
				if (player !== created) return;
				spinePlayer.skeleton!.scaleY = -1;
				try {
					spinePlayer.skeleton!.setAttachment('smile', null);
				} catch {
					spinePlayer.skeleton!.findSlot('smile')?.setAttachment(null);
				}
				spinePlayer.animationState?.setAnimation(0, 'idle', true);
				spinePlayer.animationState!.timeScale = playing ? 1 : 0;
				ready = true;
			},
		});
		player = created;

		return () => {
			created.dispose();
			if (player === created) player = undefined;
			ready = false;
		};
	});

	$effect(() => {
		const p = player;
		if (!p?.animationState) return;
		p.animationState.timeScale = playing ? 1 : 0;
	});

	onDestroy(() => {
		player?.dispose();
		player = undefined;
	});
</script>

<div class="pick-spine" class:mirror={props.mirror} class:ready aria-hidden="true">
	<div class="pick-spine-host" bind:this={container}></div>
</div>

<style lang="scss">
	.pick-spine {
		position: relative;
		width: 100%;
		min-width: 0;
		aspect-ratio: 520 / 440;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.25s ease;
	}

	.pick-spine.ready {
		opacity: 1;
	}

	.pick-spine.mirror {
		transform: scaleX(-1);
	}

	.pick-spine-host {
		position: absolute;
		inset: 0;
	}

	.pick-spine-host :global(.spine-player) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: none !important;
	}

	.pick-spine-host :global(.spine-player-canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}
</style>
