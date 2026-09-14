<!--
	Lightweight Spine mascot for the Duel side-pick screen (idle loop only).
	Kept mounted after warm-up so choose-side opens without a Spine load hitch.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SpinePlayer } from '@esotericsoftware/spine-player';
	import '@esotericsoftware/spine-player/dist/spine-player.css';

	import {
		MASCOT_DOG_SPINE_ANIMATIONS,
		MASCOT_DOG_SPINE_VIEWPORT,
		MASCOT_SPINE_ANIMATIONS,
		MASCOT_SPINE_VIEWPORT,
		resolveMascotSpineUrl,
	} from '../game/mascotHtmlSpine';

	type Props = {
		/** Dog side uses the dog skeleton; cat side uses the cat. */
		species?: 'cat' | 'dog';
		/** Mirror so the figure faces the opposite pedestal / board. */
		mirror?: boolean;
		/** When false, pause the idle loop to save CPU while the pick UI is hidden. */
		playing?: boolean;
		/** Fill parent box (hero confirm) instead of fixed aspect-ratio tile. */
		fill?: boolean;
	};

	const props: Props = $props();
	const species = $derived(props.species ?? 'cat');
	const playing = $derived(props.playing !== false);
	const fill = $derived(props.fill === true);

	let container = $state<HTMLDivElement | undefined>();
	let player: SpinePlayer | undefined;
	let ready = $state(false);

	$effect(() => {
		const el = container;
		if (!el) return;
		const isDog = species === 'dog';

		let disposed = false;
		player?.dispose();
		player = undefined;
		ready = false;
		el.replaceChildren();

		const viewport = isDog ? MASCOT_DOG_SPINE_VIEWPORT : MASCOT_SPINE_VIEWPORT;
		const animNames = isDog ? MASCOT_DOG_SPINE_ANIMATIONS : MASCOT_SPINE_ANIMATIONS;
		const viewportAnims = Object.fromEntries(animNames.map((name) => [name, viewport]));
		const jsonFile = isDog ? 'mascot_dog.json' : 'white/mascot_cat.json';
		const atlasFile = isDog ? 'mascot_dog.atlas' : 'white/mascot_cat.atlas';

		const created = new SpinePlayer(el, {
			jsonUrl: resolveMascotSpineUrl(jsonFile),
			atlasUrl: resolveMascotSpineUrl(atlasFile),
			animation: 'idle',
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: false,
			alpha: true,
			defaultMix: 0.15,
			viewport: {
				...viewport,
				animations: viewportAnims,
			},
			success: (spinePlayer) => {
				// success can run before `player = created` when assets are cached
				if (disposed) return;
				spinePlayer.skeleton!.scaleY = -1;
				if (!isDog) {
					try {
						spinePlayer.skeleton!.setAttachment('smile', null);
					} catch {
						spinePlayer.skeleton!.findSlot('smile')?.setAttachment(null);
					}
				}
				spinePlayer.animationState?.setAnimation(0, 'idle', true);
				spinePlayer.animationState!.timeScale = playing ? 1 : 0;
				ready = true;
			},
		});
		player = created;

		return () => {
			disposed = true;
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

<div class="pick-spine" class:mirror={props.mirror} class:ready class:fill aria-hidden="true">
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

	.pick-spine.fill {
		aspect-ratio: auto;
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
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
