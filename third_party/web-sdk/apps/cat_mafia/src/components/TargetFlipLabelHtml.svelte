<!--
	FS / reward label during Pixi flip — same CSS as TargetFlipSpine / board face
	so size & position do not jump when the static HTML face takes over.
-->
<script lang="ts">
	import { stateGame } from '../game/stateGame.svelte';
	import { TARGET_PICK_DISC_LIFT_FRAC } from '../game/targetBoardAssets';

	const flip = $derived(stateGame.targetShotFlip);
	const labelFx = $derived(stateGame.targetShotFlipLabel);

	const wrapStyle = $derived.by(() => {
		const f = flip;
		const lab = labelFx;
		if (!f || !lab?.visible) return 'opacity:0';
		const size = f.size;
		const lift = size * TARGET_PICK_DISC_LIFT_FRAC;
		const left = f.x - size * 0.5;
		const top = f.y - size * 0.5 - lift;
		return [
			`left:${left}px`,
			`top:${top}px`,
			`width:${size}px`,
			`height:${size}px`,
			`opacity:1`,
			`transform:scale(${lab.scaleX},${lab.scaleY})`,
		].join(';');
	});

	const text = $derived(flip?.displayText ?? (flip ? String(flip.value) : ''));
	const showFs = $derived(flip?.showFsLabel !== false);
</script>

{#if flip && labelFx?.visible}
	<div class="flip-fs" style={wrapStyle} aria-hidden="true">
		<span class="fs">
			<span class="fs-num">{text}</span>
			{#if showFs}
				<span class="fs-label">FS</span>
			{/if}
		</span>
	</div>
{/if}

<style lang="scss">
	.flip-fs {
		position: fixed;
		z-index: 71;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
		transform-origin: center center;
		will-change: transform, opacity;
	}

	.fs {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1;
		color: #f0d78c;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.55),
			0 2px 8px rgba(0, 0, 0, 0.85);
		user-select: none;
	}

	.fs-num {
		font-family: 'proxima-nova', sans-serif;
		font-size: clamp(1.35rem, 3.8vw, 2.35rem);
		font-weight: 800;
	}

	.fs-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: clamp(0.55rem, 1.4vw, 0.75rem);
		letter-spacing: 0.14em;
		margin-top: 0.12em;
	}

	/* Phone: slightly larger FS digits on the disc. */
	@media (max-width: 500px), ((hover: none) and (pointer: coarse) and (max-width: 900px)) {
		.fs-num {
			font-size: clamp(1.55rem, 4.5vw, 2.55rem);
		}

		.fs-label {
			font-size: clamp(0.62rem, 1.65vw, 0.85rem);
		}
	}
</style>
