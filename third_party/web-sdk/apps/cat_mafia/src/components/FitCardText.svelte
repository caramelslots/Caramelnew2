<script lang="ts">
	import { stateI18n } from 'state-shared';

	import { isLatinScriptLocale } from '../game/constants';
	import { ensureKnewaveFontLoaded } from '../game/knewaveFont';

	type Variant = 'spin-label' | 'trigger';

	type Props = {
		text: string;
		variant: Variant;
		maxLines?: number;
		minScale?: number;
	};

	const { text, variant, maxLines = 2, minScale = 0.55 }: Props = $props();

	let containerEl = $state<HTMLDivElement | undefined>();
	let innerEl = $state<HTMLSpanElement | undefined>();
	let scale = $state(1);

	const locale = $derived(stateI18n.i18n.locale);
	const dir = $derived(locale === 'ar' ? 'rtl' : 'ltr');
	const useKnewave = $derived(isLatinScriptLocale(locale));
	let knewaveFontReady = $state(false);

	$effect(() => {
		let cancelled = false;
		void ensureKnewaveFontLoaded().then(() => {
			if (!cancelled) knewaveFontReady = true;
		});
		return () => {
			cancelled = true;
		};
	});

	const lineHeightFactor = $derived(variant === 'spin-label' ? 0.92 : 0.95);

	const getHeightLimit = (inner: HTMLSpanElement) => {
		const style = getComputedStyle(inner);
		const fontSize = Number.parseFloat(style.fontSize);
		if (!Number.isFinite(fontSize) || fontSize <= 0) return Infinity;

		const parsedLineHeight = Number.parseFloat(style.lineHeight);
		const lineHeightPx = Number.isFinite(parsedLineHeight)
			? parsedLineHeight
			: fontSize * lineHeightFactor;

		return lineHeightPx * maxLines + fontSize * 0.06;
	};

	const getScaledMetrics = (inner: HTMLSpanElement, s: number) => ({
		width: inner.scrollWidth * s,
		height: inner.scrollHeight * s,
	});

	const applySlotHeight = (container: HTMLDivElement, inner: HTMLSpanElement, s: number) => {
		const visualHeight = inner.scrollHeight * s;
		if (visualHeight <= 0) return;

		container.style.height = `${visualHeight}px`;
		container.style.minHeight = `${visualHeight}px`;
		container.style.maxHeight = `${visualHeight}px`;
	};

	const refit = () => {
		const container = containerEl;
		const inner = innerEl;
		if (!container || !inner) return;

		scale = 1;
		inner.style.transform = 'scale(1)';
		container.style.height = '';
		container.style.minHeight = '';
		container.style.maxHeight = '';

		const maxWidth = container.clientWidth;
		if (maxWidth <= 0) return;

		const heightLimit = getHeightLimit(inner);

		const fits = (s: number) => {
			inner.style.transform = `scale(${s})`;
			const { width, height } = getScaledMetrics(inner, s);
			return width <= maxWidth + 1 && height <= heightLimit + 1;
		};

		if (fits(1)) {
			scale = 1;
			applySlotHeight(container, inner, 1);
			return;
		}

		let lo = minScale;
		let hi = 1;
		for (let i = 0; i < 14; i++) {
			const mid = (lo + hi) / 2;
			if (fits(mid)) lo = mid;
			else hi = mid;
		}

		scale = lo;
		inner.style.transform = `scale(${scale})`;
		applySlotHeight(container, inner, scale);
	};

	$effect(() => {
		text;
		locale;
		maxLines;
		minScale;
		variant;
		requestAnimationFrame(() => requestAnimationFrame(refit));
	});

	$effect(() => {
		const container = containerEl;
		if (!container) return;

		const observer = new ResizeObserver(() => refit());
		observer.observe(container);
		return () => observer.disconnect();
	});
</script>

<div
	class="fit-card-text"
	class:fit-card-text--knewave={useKnewave && knewaveFontReady}
	class:fit-card-text--spin-label={variant === 'spin-label'}
	class:fit-card-text--trigger={variant === 'trigger'}
	class:fit-card-text--lines-2={maxLines === 2}
	class:fit-card-text--lines-3={maxLines === 3}
	bind:this={containerEl}
>
	<span
		class="fit-card-text__inner"
		class:desc-spin-label={variant === 'spin-label'}
		class:desc-trigger={variant === 'trigger'}
		{dir}
		bind:this={innerEl}
		style:transform="scale({scale})"
	>
		{text}
	</span>
</div>

<style lang="scss">
	.fit-card-text {
		width: 100%;
		max-width: 100%;
		flex: 0 0 auto;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		box-sizing: border-box;
		overflow: visible;
	}

	.fit-card-text--spin-label.fit-card-text--lines-2 {
		min-height: calc(var(--bb-desc-spin-label-fs, 1em) * 0.92);
	}

	.fit-card-text--trigger.fit-card-text--lines-2 {
		min-height: calc(var(--bb-desc-trigger-fs, 1em) * 0.95);
	}

	.fit-card-text__inner {
		width: 100%;
		max-width: 100%;
		display: block;
		text-align: center;
		white-space: normal;
		word-break: normal;
		overflow-wrap: break-word;
		transform-origin: center top;
		color: inherit;
	}

	.fit-card-text__inner.desc-spin-label {
		font-size: var(--bb-desc-spin-label-fs, 1em);
		font-weight: 900;
		line-height: 0.92;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.fit-card-text__inner.desc-trigger {
		font-size: var(--bb-desc-trigger-fs, 1em);
		font-weight: 800;
		line-height: 0.95;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	:global(.fit-card-text--knewave) .fit-card-text__inner {
		font-family: 'Knewave', sans-serif;
		font-style: normal;
		font-weight: 400;
		letter-spacing: 0;
	}
</style>
