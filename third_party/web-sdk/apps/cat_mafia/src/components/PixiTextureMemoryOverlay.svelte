<!--
	Overlay: estimated Pixi texture / atlas footprint (not system RAM).
	Visible in prod builds too (Stake debug) — remove when done.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { getContextApp } from 'pixi-svelte';

	import {
		estimatePixiTextureMemory,
		formatMb,
		type PixiTextureMemoryStats,
	} from '../game/pixiTextureMemory';

	const POLL_MS = 1000;

	const app = getContextApp();

	let stats = $state<PixiTextureMemoryStats | null>(null);

	const refresh = () => {
		stats = estimatePixiTextureMemory(app.stateApp.pixiApplication ?? null);
	};

	onMount(() => {
		refresh();
		const id = window.setInterval(refresh, POLL_MS);
		return () => window.clearInterval(id);
	});
</script>

{#if stats}
	<div class="pixi-mem" data-test="pixi-texture-memory">
		<div class="pixi-mem__total">Pixi ~{formatMb(stats.totalBytes)}</div>
		<div class="pixi-mem__row">
			GPU {formatMb(stats.gpuBytes)} · {stats.gpuCount} tex
		</div>
		<div class="pixi-mem__row">
			Cache {formatMb(stats.cacheBytes)} · {stats.cacheCount} tex
		</div>
		{#if stats.top.length}
			<ul class="pixi-mem__top">
				{#each stats.top as entry (entry.uid)}
					<li>
						<span class="pixi-mem__label">{entry.label}</span>
						<span class="pixi-mem__bytes">{formatMb(entry.bytes)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style lang="scss">
	.pixi-mem {
		position: fixed;
		top: 8px;
		right: 8px;
		z-index: 99999;
		pointer-events: none;
		padding: 8px 10px;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.72);
		color: #e8ffe8;
		font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		letter-spacing: 0.01em;
		max-width: min(240px, 46vw);
		backdrop-filter: blur(4px);
	}

	.pixi-mem__total {
		font-weight: 700;
		color: #9dffb0;
		margin-bottom: 2px;
	}

	.pixi-mem__row {
		opacity: 0.85;
	}

	.pixi-mem__top {
		list-style: none;
		margin: 6px 0 0;
		padding: 6px 0 0;
		border-top: 1px solid rgba(255, 255, 255, 0.18);
	}

	.pixi-mem__top li {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		opacity: 0.9;
	}

	.pixi-mem__label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.pixi-mem__bytes {
		flex: none;
		opacity: 0.75;
	}
</style>
