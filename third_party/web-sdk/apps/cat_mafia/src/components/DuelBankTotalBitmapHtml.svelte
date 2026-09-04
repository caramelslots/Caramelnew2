<!--
	Duel scale plaque total — prostoi/bablo bitmap (same as under-desk WIN),
	drawn into an HTML <img> so it sits ABOVE the scale art (HTML z-index).
	Never touches the Pixi renderer during cloud transition.
-->
<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { stateI18n } from 'state-shared';

	import { amountToLayoutParts } from '../game/currencyTextSegments';
	import {
		BITMAP_FONT_SCALE,
		FONT_BABLO,
		FONT_PROSTOI,
		FONT_PROSTOI_CJK,
		FONT_PROSTOI_HI,
		FONT_PROSTOI_RU,
		FONT_PROSTOI_VI,
		WIN_HUD_FONT_SIZE,
		fontForLocale,
		supportsBitmapFont,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';

	type Props = {
		amount: number;
		prefix: string;
		maxWidth: number;
		maxHeight: number;
	};

	const props: Props = $props();
	const context = getContext();

	let imgEl = $state<HTMLImageElement | undefined>();
	let useFallback = $state(false);

	const locale = $derived(stateI18n.i18n.locale);
	const canBitmap = $derived(supportsBitmapFont(locale) && !useFallback);
	const fallbackText = $derived(
		`${props.prefix} ${bookEventAmountToCurrencyString(props.amount)}`,
	);
	const fitW = $derived(Math.max(0, Math.floor(props.maxWidth)));
	const fitH = $derived(Math.max(0, Math.floor(props.maxHeight)));

	$effect(() => {
		if (!canBitmap || !imgEl) return;
		if (fitW < 4 || fitH < 4) return;
		if (stateGame.transitionActive) return;

		const renderer = context.stateApp.pixiApplication?.renderer;
		if (!renderer) {
			useFallback = true;
			return;
		}

		const amount = props.amount;
		const prefix = props.prefix;
		const loc = locale;
		let cancelled = false;

		const raf = requestAnimationFrame(() => {
			if (cancelled || !imgEl || stateGame.transitionActive) return;

			let rt: PIXI.RenderTexture | undefined;
			let container: PIXI.Container | undefined;

			try {
				const parts = amountToLayoutParts(amount, { bookEvent: true, prefix });
				const labelText = parts.label.trimEnd();
				const fontSize = WIN_HUD_FONT_SIZE * BITMAP_FONT_SCALE * 0.75;
				const letterSpacing = 1;
				const labelFont = fontForLocale(
					FONT_PROSTOI,
					FONT_PROSTOI_RU,
					loc,
					FONT_PROSTOI_HI,
					FONT_PROSTOI_VI,
					FONT_PROSTOI_CJK,
				);

				container = new PIXI.Container();
				let x = 0;
				const add = (text: string, fontFamily: string) => {
					if (!text || !container) return;
					const node = new PIXI.BitmapText({
						text,
						style: { fontFamily, fontSize, letterSpacing, align: 'left' },
					});
					node.position.set(x, 0);
					container.addChild(node);
					x += node.width;
				};

				add(labelText, labelFont);
				if (labelText && (parts.before || parts.symbol || parts.after)) {
					x += fontSize * 0.78;
				}
				add(parts.before, FONT_PROSTOI);
				add(parts.symbol, FONT_BABLO);
				add(parts.after, FONT_PROSTOI);

				const rawW = Math.max(1, container.width);
				const rawH = Math.max(1, container.height);
				const fit = Math.min(fitW / rawW, fitH / rawH, 1);
				container.scale.set(fit);

				const w = Math.max(1, Math.ceil(rawW * fit));
				const h = Math.max(1, Math.ceil(rawH * fit));
				rt = PIXI.RenderTexture.create({ width: w, height: h });
				renderer.render({ container, target: rt });
				const canvas = renderer.extract.canvas(rt);
				if (cancelled || !imgEl) return;
				imgEl.src = canvas.toDataURL('image/png');
				imgEl.style.width = `${w}px`;
				imgEl.style.height = `${h}px`;
			} catch (err) {
				console.warn('[DuelBankTotalBitmapHtml] render failed', err);
				useFallback = true;
			} finally {
				rt?.destroy(true);
				container?.destroy({ children: true });
			}
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
		};
	});
</script>

{#if canBitmap}
	<img bind:this={imgEl} class="duel-bank-total-bitmap" alt="" />
{:else}
	<span class="duel-bank-total-fallback">{fallbackText}</span>
{/if}

<style lang="scss">
	.duel-bank-total-bitmap {
		display: block;
		pointer-events: none;
		user-select: none;
		-webkit-user-drag: none;
	}

	.duel-bank-total-fallback {
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		font-weight: 400;
		font-size: clamp(0.7rem, 3vh, 1.25rem);
		letter-spacing: 0.04em;
		line-height: 1;
		color: #ffcc44;
		text-shadow:
			0 0 8px rgba(255, 196, 48, 0.45),
			0 1px 0 rgba(92, 58, 8, 0.75),
			0 2px 6px rgba(0, 0, 0, 0.7);
		white-space: nowrap;
	}
</style>
