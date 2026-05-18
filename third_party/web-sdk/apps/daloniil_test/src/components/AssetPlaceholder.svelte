<!--
	AssetPlaceholder.svelte — HTML-плейсхолдер для UI-элементов, для которых
	нет стоковых ассетов в SDK (логотип Cash Stacks, иконки Bonus x3/x4/x5
	в меню Buy Bonus, и т.п.). Используется ТОЛЬКО в HTML-overlay, не в PIXI.
-->
<script lang="ts">
	type Props = {
		label: string;
		width?: number | string;
		height?: number | string;
		variant?: 'neutral' | 'bonus' | 'super' | 'mystery' | 'logo';
		rounded?: boolean;
	};

	const props: Props = $props();

	const VARIANT_COLORS: Record<NonNullable<Props['variant']>, { bg: string; fg: string }> = {
		neutral: { bg: '#444', fg: '#fff' },
		bonus: { bg: '#ff9a3c', fg: '#1a1a1a' },
		super: { bg: '#e91e63', fg: '#fff' },
		mystery: { bg: '#7b3ff2', fg: '#fff' },
		logo: { bg: '#1a1a1a', fg: '#ffd700' },
	};

	const variant = $derived(props.variant ?? 'neutral');
	const colors = $derived(VARIANT_COLORS[variant]);
	const width = $derived(typeof props.width === 'number' ? `${props.width}px` : (props.width ?? '100%'));
	const height = $derived(typeof props.height === 'number' ? `${props.height}px` : (props.height ?? '100%'));
	const radius = $derived(props.rounded ?? true ? '8px' : '0');
</script>

<div
	class="asset-placeholder"
	style:width
	style:height
	style:background-color={colors.bg}
	style:color={colors.fg}
	style:border-radius={radius}
>
	<span class="label">{props.label}</span>
</div>

<style>
	.asset-placeholder {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-family: 'Arial Black', sans-serif;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border: 2px dashed rgba(255, 255, 255, 0.3);
		box-sizing: border-box;
		user-select: none;
	}

	.label {
		font-size: clamp(0.6rem, 2vw, 1.2rem);
		padding: 0.25em 0.5em;
		line-height: 1.1;
		word-break: break-word;
	}
</style>
