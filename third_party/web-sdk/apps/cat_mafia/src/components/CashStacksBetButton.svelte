<!--
	CashStacksBetButton.svelte — обёртка над CashStacksSpinButton.
-->
<script lang="ts">
	import type { ButtonProps } from 'components-pixi';

	import { isLockedBonusHud } from '../game/activeFeature';
	import type { UiSizeScaleProps } from '../game/uiButtonSize';
	import CashStacksSpinButton from './CashStacksSpinButton.svelte';

	const props: Partial<Omit<ButtonProps, 'children'>> & UiSizeScaleProps = $props();
	const hudLocked = $derived(isLockedBonusHud());
</script>

{#if !hudLocked}
	<CashStacksSpinButton {...props} />
{/if}
