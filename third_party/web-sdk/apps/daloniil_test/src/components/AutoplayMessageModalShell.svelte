<!--
	Backdrop shell for autoplay stop message (insufficient funds, limits).
-->
<script lang="ts">
	import { stateModal } from 'state-shared';

	import AutoplayMessageOverlay from './AutoplayMessageOverlay.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';

	const shellMounted = $derived(gameEntrance.showContent);
	const isVisible = $derived(stateModal.modal?.name === 'autoSpinMessage');
</script>

{#if shellMounted}
	<div
		class="autoplay-message-shell"
		class:active={isVisible}
		aria-hidden={!isVisible}
		data-test="autoplay-message-shell"
	>
		<AutoplayMessageOverlay />
	</div>
{/if}

<style lang="scss">
	.autoplay-message-shell {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 60;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		visibility: hidden;
		pointer-events: none;
		will-change: backdrop-filter;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
		box-sizing: border-box;

		&.active {
			visibility: visible;
			pointer-events: auto;
		}

		:global(.message-panel) {
			pointer-events: auto;
		}
	}
</style>
