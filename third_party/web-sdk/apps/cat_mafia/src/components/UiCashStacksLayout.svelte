<!--
	UiCashStacksLayout.svelte — кастомный layout для Wok Fury.
	  - BuyBonus  : CashStacksBuyBonusPanel (HTML)
	  - HUD bar + spin cluster : CashStacksDesktopHudOverlay (HTML), кроме portrait
	  - WIN — Pixi под доской
	Portrait — UiCashStacksPortraitLayout (+ CashStacksPortraitHudOverlay).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { stateBet } from 'state-shared';
	import { MainContainer } from 'components-layout';
	import { Container } from 'pixi-svelte';
	import { EnableSpaceHold } from 'components-shared';

	import UiFadeContainer from 'components-ui-pixi/src/components/UiFadeContainer.svelte';
	import UiCashStacksPortraitLayout from './UiCashStacksPortraitLayout.svelte';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';

	import {
		BITMAP_FONT_SCALE,
		isPopoutSmallViewport,
		isPopoutViewport,
		POPOUT_S_SCALE,
		WIN_HUD_COUNT_UP_MS,
		WIN_HUD_FONT_SIZE,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { isAnyMenuOpen } from '../game/isAnyMenuOpen';
	import { stateGame } from '../game/stateGame.svelte';
	import { getContextLayout } from 'utils-layout';

	type Props = {
		gameName?: Snippet;
		logo?: Snippet;
	};

	const props: Props = $props();
	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const useDesktopHud = $derived(layoutType !== 'portrait');
	const gameNameScale = $derived(isPopoutSmall ? POPOUT_S_SCALE : 1);
	const spaceHoldDisabled = $derived(isAnyMenuOpen());

	const WIN_BELOW_BOARD_GAP = 80;
	/** PC / laptop only — sit below the gold nameplate, slightly left of screen center. */
	const WIN_HUD_DESKTOP_NUDGE = { x: -28, y: 4 } as const;
	/** Popout L / S — raise WIN off the nameplate (S uses a larger game-px lift: scale is half of L). */
	const WIN_HUD_POPOUT_L_NUDGE = { x: 0, y: -5 } as const;
	const WIN_HUD_POPOUT_S_NUDGE = { x: 0, y: -5 } as const;
	const ml = $derived(stateLayoutDerived.mainLayout());
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const winHudNudge = $derived(
		isPopoutSmall
			? WIN_HUD_POPOUT_S_NUDGE
			: isPopout
				? WIN_HUD_POPOUT_L_NUDGE
				: layoutType === 'desktop'
					? WIN_HUD_DESKTOP_NUDGE
					: { x: 0, y: 0 },
	);
	const winHudPos = $derived({
		x: ml.width * 0.5 + winHudNudge.x,
		y: boardLayout.y + boardLayout.height * 0.5 + WIN_BELOW_BOARD_GAP + winHudNudge.y,
	});

	/**
	 * Under-board WIN: snap by default. Book handlers set `winHudCountUpPending`
	 * for bonus FS (any increase) or base post-SW — we tween that increase, then
	 * ignore follow-up writes to the same target so setTotalWin cannot kill the tween.
	 */
	const winAmountTween = new Tween(stateBet.winBookEventAmount);
	let hudTweenTarget: number | null = null;
	$effect(() => {
		const target = stateBet.winBookEventAmount;
		const wantCountUp = stateGame.winHudCountUpPending;
		const from = winAmountTween.current;

		if (target <= 0 || target + 0.01 < from) {
			if (stateGame.winHudCountUpPending) stateGame.winHudCountUpPending = false;
			hudTweenTarget = null;
			winAmountTween.set(target, { duration: 0 });
			return;
		}

		if (wantCountUp && target > from + 0.01) {
			stateGame.winHudCountUpPending = false;
			hudTweenTarget = target;
			winAmountTween.set(target, {
				duration: scaleMsByGameSpeed(WIN_HUD_COUNT_UP_MS, stateGame.gameSpeed),
			});
			return;
		}

		// Same cumulative write (setWin then setTotalWin) or flag-clear re-entry —
		// do not snap over an in-flight post-SW count-up.
		if (hudTweenTarget != null && Math.abs(target - hudTweenTarget) < 0.01) {
			return;
		}

		hudTweenTarget = null;
		winAmountTween.set(target, { duration: 0 });
	});
	const displayWinAmount = $derived(Math.round(winAmountTween.current));
	const showWin = $derived(stateBet.winBookEventAmount > 0 || displayWinAmount > 0);

	const WIN_TEXT_STYLE = {
		fontSize: WIN_HUD_FONT_SIZE * BITMAP_FONT_SCALE,
		fontWeight: 'bold' as const,
		letterSpacing: 1,
	};
	const winLabelGap = WIN_HUD_FONT_SIZE * BITMAP_FONT_SCALE * 0.78;
</script>

<EnableSpaceHold disabled={spaceHoldDisabled} />

{#if useDesktopHud}
	<UiFadeContainer>
		<Container x={20} scale={gameNameScale}>
			{#if props.gameName}
				{@render props.gameName()}
			{/if}
		</Container>

		<Container x={20} y={70}>
			{#if props.logo}
				{@render props.logo()}
			{/if}
		</Container>

		{#if showWin}
			<MainContainer>
				<Container x={winHudPos.x} y={winHudPos.y} zIndex={20}>
					<ResponsiveCurrencyBitmapText
						anchor={0.5}
						bodyFontVariant="prostoi"
						eventMode="none"
						prefix={context.i18nDerived.win().toUpperCase()}
						amount={displayWinAmount}
						bookEvent
						maxWidth={boardLayout.width * 0.96}
						minScale={0.5}
						labelGap={winLabelGap}
						style={WIN_TEXT_STYLE}
					/>
				</Container>
			</MainContainer>
		{/if}
	</UiFadeContainer>
{:else if layoutType === 'portrait'}
	<UiCashStacksPortraitLayout>
		{#snippet gameName()}
			{#if props.gameName}{@render props.gameName()}{/if}
		{/snippet}
		{#snippet logo()}
			{#if props.logo}{@render props.logo()}{/if}
		{/snippet}
	</UiCashStacksPortraitLayout>
{/if}
