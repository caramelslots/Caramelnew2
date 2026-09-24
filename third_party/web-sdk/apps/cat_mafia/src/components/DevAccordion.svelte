<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		title,
		badge,
		onToggle,
		children,
	}: {
		open: boolean;
		title: string;
		badge?: string;
		onToggle: () => void;
		children: Snippet;
	} = $props();
</script>

<section class="acc" class:acc--open={open}>
	<button
		type="button"
		class="acc-head"
		aria-expanded={open}
		onclick={onToggle}
	>
		<span class="acc-head__title">{title}</span>
		{#if badge}
			<span class="acc-head__badge">{badge}</span>
		{/if}
		<span class="acc-head__chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
	</button>
	{#if open}
		<div class="acc-body">
			{@render children()}
		</div>
	{/if}
</section>
