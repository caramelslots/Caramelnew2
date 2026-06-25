<!--
	Shell for autoplay stop message — structure identical to BuyBonusModalShell.
-->
<script lang="ts">
	import { stateModal } from 'state-shared';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import AutoplayMessageOverlay from './AutoplayMessageOverlay.svelte';

	const shellMounted = $derived(gameEntrance.showContent);
	const isVisible = $derived(stateModal.modal?.name === 'autoSpinMessage');
</script>

{#if shellMounted}
	<div
		class="shell"
		class:active={isVisible}
		aria-hidden={!isVisible}
		data-test="autoplay-message-shell"
	>
		<div class="panel-slot" class:active={isVisible}>
			<AutoplayMessageOverlay />
		</div>
	</div>
{/if}

<style lang="scss">
	.shell {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		visibility: hidden;
		pointer-events: none;
		will-change: backdrop-filter;

		&.active {
			visibility: visible;
			pointer-events: auto;
		}
	}

	/* Identical to BuyBonusModalShell .panel-slot */
	.panel-slot {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		box-sizing: border-box;
		visibility: hidden;
		pointer-events: none;

		&.active {
			visibility: visible;
			pointer-events: auto;
		}
	}
</style>
