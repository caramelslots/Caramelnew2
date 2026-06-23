<!--
	UiCashStacksPortraitLayout.svelte — portrait mobile (ref. IMAGE 2026-06-02 13:11:58).
	  WIN под доской
	  Buy + Bonus Boost — CashStacksBuyBonusPanel (HTML)
	  − | Spin | + и util-ряд — CashStacksPortraitHudOverlay (HTML)
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { stateBet } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container } from 'pixi-svelte';
	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';

	import { BITMAP_FONT_SCALE, WIN_HUD_FONT_SIZE } from '../game/constants';
	import { portraitScaleY, portraitWinHudLocalY } from '../game/portraitHudLayout';
	import { getContext } from '../game/context';
	import { getContextLayout } from 'utils-layout';

	type Props = {
		gameName?: Snippet;
		logo?: Snippet;
	};

	const props: Props = $props();
	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const ml = $derived(stateLayoutDerived.mainLayout());
	const W = $derived(ml.width);
	const H = $derived(ml.height);

	const winHudPos = $derived({
		x: W * 0.5,
		y: portraitWinHudLocalY(stateLayoutDerived),
	});

	const showWin = $derived(stateBet.winBookEventAmount > 0);

	const winHudFontSize = $derived(
		portraitScaleY(WIN_HUD_FONT_SIZE, H) * BITMAP_FONT_SCALE,
	);

	const WIN_TEXT_STYLE = $derived({
		fontSize: winHudFontSize,
		fontWeight: 'bold' as const,
		letterSpacing: 1,
	});
</script>

<UiFadeContainer>
	<Container x={20}>
		{#if props.gameName}{@render props.gameName()}{/if}
	</Container>

	<Container x={W - 20}>
		{#if props.logo}{@render props.logo()}{/if}
	</Container>

	{#if showWin}
		<MainContainer>
			<Container x={winHudPos.x} y={winHudPos.y} zIndex={20}>
				<ResponsiveCurrencyBitmapText
					anchor={0.5}
					bodyFontVariant="prostoi"
					eventMode="none"
					prefix={`${context.i18nDerived.win().toUpperCase()} `}
					amount={stateBet.winBookEventAmount}
					bookEvent
					maxWidth={W * 0.9}
					style={WIN_TEXT_STYLE}
				/>
			</Container>
		</MainContainer>
	{/if}
</UiFadeContainer>
