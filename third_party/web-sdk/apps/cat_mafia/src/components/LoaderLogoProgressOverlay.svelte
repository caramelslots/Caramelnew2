<script lang="ts">
	/**
	 * Stage A boot: logo + progress bar while assets load.
	 * Cards appear only after `stateApp.loaded`.
	 */
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_NEON_LOGO_URL } from '../game/loaderCardAssets';

	const context = getContext();

	const show = $derived(
		context.stateLayout.showLoadingScreen &&
			gameEntrance.loadingCardsVisible &&
			!context.stateApp.loaded,
	);

	const progress = $derived(Math.max(0, Math.min(100, context.stateApp.loadingProgress ?? 0)));
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());

	const overlayStyle = $derived(
		`left:${canvasSizes.width * 0.5}px;top:${canvasSizes.height * 0.45}px;transform:translate(-50%,-50%);`,
	);
</script>

{#if show}
	<div class="logo-progress-overlay" style={overlayStyle} aria-busy="true" aria-live="polite">
		<img class="logo" src={LOADER_NEON_LOGO_URL} alt="Cat Mafia" draggable="false" />
		<div class="progress-wrap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
			<div class="progress-track">
				<div class="progress-fill" style:width="{progress}%"></div>
			</div>
			<span class="progress-label">{Math.round(progress)}%</span>
		</div>
	</div>
{/if}

<style lang="scss">
	.logo-progress-overlay {
		position: fixed;
		z-index: 45;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.4rem;
		pointer-events: none;
		user-select: none;
	}

	.logo {
		display: block;
		width: min(520px, 72vw);
		height: auto;
		filter: drop-shadow(0 0 18px rgba(255, 180, 60, 0.35));
	}

	.progress-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		width: min(280px, 55vw);
	}

	.progress-track {
		width: 100%;
		height: 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.12);
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.18);
	}

	.progress-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #c9a24a, #f0d78c);
		transition: width 120ms linear;
	}

	.progress-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.75);
	}
</style>
