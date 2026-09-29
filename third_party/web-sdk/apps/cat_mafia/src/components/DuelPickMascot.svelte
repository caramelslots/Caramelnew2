<!--
	Static mascot art for the Duel side-pick screen (no SpinePlayer / WebGL).
	Same host classes as the old spine path so card framing CSS keeps working.
-->
<script lang="ts">
	import {
		DUEL_CAT_FACE_AVATAR_SRC,
		DUEL_DOG_FACE_AVATAR_SRC,
	} from '../game/duelAssets';

	type Props = {
		/** Dog side uses the dog still; cat side uses the cat. */
		species?: 'cat' | 'dog';
		/** Mirror so the figure faces the opposite pedestal / board. */
		mirror?: boolean;
		/** Kept for call-site compatibility (static art ignores it). */
		playing?: boolean;
		/** Fill parent box (hero confirm) instead of fixed aspect-ratio tile. */
		fill?: boolean;
	};

	const props: Props = $props();
	const species = $derived(props.species ?? 'cat');
	const fill = $derived(props.fill === true);
	const src = $derived(
		species === 'dog' ? DUEL_DOG_FACE_AVATAR_SRC : DUEL_CAT_FACE_AVATAR_SRC,
	);
</script>

<div
	class="pick-spine ready"
	class:mirror={props.mirror}
	class:fill
	class:species-dog={species === 'dog'}
	class:species-cat={species === 'cat'}
	aria-hidden="true"
>
	<img class="pick-spine-still" {src} alt="" draggable="false" />
</div>

<style lang="scss">
	.pick-spine {
		position: relative;
		width: 100%;
		min-width: 0;
		aspect-ratio: 520 / 440;
		pointer-events: none;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
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

	.pick-spine-still {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center 55%;
		user-select: none;
		-webkit-user-drag: none;
		pointer-events: none;
	}
</style>
