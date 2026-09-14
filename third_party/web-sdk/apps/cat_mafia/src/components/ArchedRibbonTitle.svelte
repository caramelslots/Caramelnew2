<!--
	Card-ribbon title on a shallow circular arc — same layout as
	FreeSpinIntro CONGRATULATIONS (proxima-nova + gold gradient).
-->
<script lang="ts">
	import { onMount } from 'svelte';

	type Glyph = { char: string; x: number; y: number; rot: number };

	type Props = {
		text: string;
		archDeg?: number;
		tracking?: number;
	};

	const { text, archDeg = 34, tracking }: Props = $props();

	let host = $state<HTMLDivElement>();
	let hostWidth = $state(0);
	let fontPx = $state(16);
	let cssTracking = $state(0.14);

	const readTracking = (el: HTMLElement) => {
		if (tracking != null) return tracking;
		const fromCss = Number.parseFloat(getComputedStyle(el).getPropertyValue('--bb-title-tracking'));
		return Number.isFinite(fromCss) ? fromCss : 0.14;
	};

	const measureHost = () => {
		const el = host;
		if (!el) return;
		const styles = getComputedStyle(el);
		hostWidth = el.clientWidth;
		const size = Number.parseFloat(styles.fontSize);
		fontPx = Number.isFinite(size) && size > 0 ? size : 16;
		const next = readTracking(el);
		if (next !== cssTracking) cssTracking = next;
	};

	const resolvedTracking = $derived(tracking ?? cssTracking);

	const glyphs = $derived.by((): Glyph[] => {
		const chars = Array.from(text);
		const n = chars.length;
		if (n === 0 || hostWidth < 4) return [];

		const chord = hostWidth * 0.9;
		const halfRad = (archDeg * Math.PI) / 360;
		const radius = halfRad > 0.001 ? chord / (2 * Math.sin(halfRad)) : chord;
		const pack = Math.max(0.04, resolvedTracking);

		const widths: number[] = [];
		if (typeof document !== 'undefined') {
			const ctx = document.createElement('canvas').getContext('2d');
			if (ctx) {
				ctx.font = `800 ${fontPx}px proxima-nova, sans-serif`;
				for (const char of chars) {
					const raw = Math.max(
						ctx.measureText(char === ' ' ? '\u00a0' : char).width,
						fontPx * 0.18,
					);
					widths.push(raw * pack);
				}
			}
		}
		if (widths.length !== n) {
			for (let i = 0; i < n; i++) widths.push(fontPx * 0.55 * pack);
		}

		const total = widths.reduce((sum, width) => sum + width, 0);
		let cursor = -total / 2;
		return chars.map((char, i) => {
			const width = widths[i]!;
			const arc = cursor + width * 0.5;
			cursor += width;
			const phi = arc / radius;
			return {
				char,
				x: radius * Math.sin(phi),
				y: radius * (1 - Math.cos(phi)),
				rot: (phi * 180) / Math.PI,
			};
		});
	});

	onMount(() => {
		const el = host;
		if (!el) return;
		measureHost();
		const observer = new ResizeObserver(measureHost);
		observer.observe(el);
		const poll = window.setInterval(measureHost, 80);
		void document.fonts?.ready.then(() => {
			if (host === el) measureHost();
		});
		return () => {
			observer.disconnect();
			window.clearInterval(poll);
		};
	});
</script>

<div class="arched-title" bind:this={host} aria-label={text}>
	{#each glyphs as glyph, i (i)}
		<span
			class="arch-char"
			style="transform:translate(-50%, -50%) translate({glyph.x}px, {glyph.y}px) rotate({glyph.rot}deg)"
			>{glyph.char === ' ' ? '\u00a0' : glyph.char}</span
		>
	{/each}
</div>

<style lang="scss">
	.arched-title {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
		line-height: 1;
		user-select: none;
		pointer-events: none;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 2px 0 #5a3a0e)
			drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
	}

	.arch-char {
		position: absolute;
		left: 50%;
		top: 34%;
		display: block;
		white-space: pre;
		transform-origin: center center;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}
</style>
