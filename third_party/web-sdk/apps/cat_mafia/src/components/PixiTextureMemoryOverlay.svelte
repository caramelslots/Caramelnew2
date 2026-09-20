<!--
	Overlay: estimated Pixi texture / atlas footprint (not system RAM).
	Top-30 + totals refresh every animation frame.
	Accordion: tap header to collapse / expand.
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

	const app = getContextApp();

	let stats = $state<PixiTextureMemoryStats | null>(null);
	let open = $state(true);

	const toggle = () => {
		open = !open;
	};

	onMount(() => {
		let raf = 0;
		let alive = true;

		const tick = () => {
			if (!alive) return;
			stats = estimatePixiTextureMemory(app.stateApp.pixiApplication ?? null);
			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => {
			alive = false;
			cancelAnimationFrame(raf);
		};
	});
</script>

{#if stats}
	<div
		class="pixi-mem"
		class:pixi-mem--collapsed={!open}
		data-test="pixi-texture-memory"
	>
		<button
			type="button"
			class="pixi-mem__header"
			aria-expanded={open}
			aria-label={open ? 'Collapse Pixi memory panel' : 'Expand Pixi memory panel'}
			onclick={toggle}
		>
			<span class="pixi-mem__total">Pixi ~{formatMb(stats.totalBytes)}</span>
			<span class="pixi-mem__chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
		</button>

		{#if open}
			<div class="pixi-mem__body">
				<div class="pixi-mem__row">
					GPU {formatMb(stats.gpuBytes)} · {stats.gpuCount} tex
				</div>
				<div class="pixi-mem__row">
					Cache {formatMb(stats.cacheBytes)} · {stats.cacheCount} tex
				</div>
				<div class="pixi-mem__top-title">Top 30 live</div>
				{#if stats.top.length}
					<ol class="pixi-mem__top">
						{#each stats.top as entry, i (entry.uid)}
							<li>
								<span class="pixi-mem__rank">{i + 1}.</span>
								<span class="pixi-mem__label"
									>{entry.label}
									<span class="pixi-mem__size"
										>{entry.pixelWidth}×{entry.pixelHeight}</span
									></span
								>
								<span class="pixi-mem__bytes">{formatMb(entry.bytes)}</span>
							</li>
						{/each}
					</ol>
				{:else}
					<div class="pixi-mem__row">—</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style lang="scss">
	.pixi-mem {
		position: fixed;
		top: 8px;
		right: 8px;
		z-index: 99999;
		pointer-events: auto;
		padding: 6px 8px;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.72);
		color: #e8ffe8;
		font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		letter-spacing: 0.01em;
		max-width: min(280px, 52vw);
		max-height: min(70vh, 560px);
		overflow-y: auto;
		backdrop-filter: blur(4px);
	}

	.pixi-mem--collapsed {
		max-height: none;
		overflow: visible;
	}

	.pixi-mem__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		margin: 0;
		padding: 2px 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.pixi-mem__total {
		font-weight: 700;
		color: #9dffb0;
	}

	.pixi-mem__chevron {
		flex: none;
		opacity: 0.7;
		font-size: 12px;
		line-height: 1;
	}

	.pixi-mem__body {
		margin-top: 4px;
	}

	.pixi-mem__row {
		opacity: 0.85;
	}

	.pixi-mem__top-title {
		margin-top: 6px;
		padding-top: 6px;
		border-top: 1px solid rgba(255, 255, 255, 0.18);
		font-weight: 700;
		color: #c8ffd4;
		opacity: 0.95;
	}

	.pixi-mem__top {
		list-style: none;
		margin: 4px 0 0;
		padding: 0;
	}

	.pixi-mem__top li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 6px;
		opacity: 0.9;
	}

	.pixi-mem__rank {
		flex: none;
		opacity: 0.55;
		width: 1.4em;
	}

	.pixi-mem__label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
		flex: 1;
	}

	.pixi-mem__size {
		opacity: 0.45;
		margin-left: 4px;
	}

	.pixi-mem__bytes {
		flex: none;
		opacity: 0.75;
	}
</style>
