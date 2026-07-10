<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { Container } from 'pixi-svelte';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { CanvasSizeRectangle } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { stateUrlDerived } from 'state-shared';

	import { stateI18n } from 'state-shared';

	import {
		BITMAP_FONT_SCALE,
		FONT_KRUTOI,
		FONT_KRUTOI_RU,
		FONT_PROSTOI_HI,
		FONT_PROSTOI_WHITE,
		FONT_PROSTOI_WHITE_RU,
		FONT_PROSTOI_WHITE_HI,
		FONT_PROSTOI_WHITE_VI,
		FONT_PROSTOI_WHITE_CJK,
		FONT_KRUTOI_VI,
		FONT_KRUTOI_CJK,
		fontForLocale,
		FS_OUTRO_DIM_ALPHA,
		getFsOutroPopupVisualCenter,
		LOCALE_TEXT_FILL_GOLD,
		LOCALE_TEXT_FILL_WHITE,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';
	import ResponsiveLocaleText from './ResponsiveLocaleText.svelte';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { stateGame } from '../game/stateGame.svelte';
	import { getFsOutroCongratulationsText, getFsOutroYouWonText } from '../game/fsOutroBannerText';
	import { stopWinLevelCountUpSounds } from '../game/bookEventHandlerMap';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import WinCoins from './WinCoins.svelte';

	const context = getContext();

	const fsOutroPopupCenter = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const cs = context.stateLayoutDerived.canvasSizes();
		// Popup spine is in MainContainer at (ml.width*0.5, ml.height*0.3).
		// Convert to canvas px: screenPos = canvasCenter + (localPos - ml.center) * scale
		return {
			x: cs.width * 0.5,
			y: cs.height * 0.5 + (ml.height * 0.3 - ml.height * 0.5) * ml.scale,
		};
	});

	let show = $state(true);
	let winAmount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});
	let cookieOpened = $state(false);
	let coinsEmit = $state(false);
	let fsAnimation = $state<FreeSpinAnimation | undefined>();
	let finishingOutro = $state(false);
	let closing = $state(false);

	const finishOutro = async () => {
		if (finishingOutro) return;
		finishingOutro = true;
		closing = true;
		await fsAnimation?.playDisappear();
		show = false;
		stateGame.winOverlayActive = false;
		oncomplete();
	};

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			show = true;
			closing = false;
		},
		freeSpinOutroHide: async () => {
			show = false;
			closing = false;
			stateGame.winOverlayActive = false;
		},
		freeSpinOutroCountUp: async (emitterEvent) => {
			finishingOutro = false;
			closing = false;
			cookieOpened = false;
			coinsEmit = false;
			waitForTimeout(scaleMsByGameSpeed(1000, stateGame.gameSpeed)).then(() => {
				cookieOpened = true;
				coinsEmit = true;
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
			});
			winAmount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			stateGame.winOverlayActive = emitterEvent.winLevelData.type === 'big';
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show} zIndex={10}>
	{#if winLevelData}
		{@const duration = winLevelData.presentDuration}
		{@const isBigWin = winLevelData.type === 'big'}
		{#key winAmount}
			<WinCountUpProvider
				amount={winAmount}
				{duration}
				oncomplete={() => {
					coinsEmit = false;
					stopWinLevelCountUpSounds();
					onCountUpComplete();
				}}
			>
				{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
					<OnMount
						onmount={async () => {
							await startCountUp();
						}}
					/>

					{#if !closing}
						<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={FS_OUTRO_DIM_ALPHA} />
					{/if}

					{#key winAmount}
						<FreeSpinAnimation bind:this={fsAnimation}>
							{#snippet title({ width })}
								{@const lang = stateUrlDerived.lang()}
								{@const titleLineGap = width * 0.22}
								{@const titleYOffset = width * 0.06}
								{#if isBigWin}
									<Container y={titleYOffset}>
										<ResponsiveLocaleText
											anchor={0.5}
											y={-(titleLineGap * 3.0)}
											text={getFsOutroCongratulationsText(lang)}
											maxWidth={width * 3.5}
											fallbackFill={LOCALE_TEXT_FILL_GOLD}
											style={{
												fontFamily: fontForLocale(
													FONT_KRUTOI,
													FONT_KRUTOI_RU,
													stateI18n.i18n.locale,
													FONT_PROSTOI_HI,
													FONT_KRUTOI_VI,
													FONT_KRUTOI_CJK,
												),
												fontSize: width * 0.7 * BITMAP_FONT_SCALE,
												align: 'center',
												fontWeight: 'bold',
												letterSpacing: 0,
											}}
										/>
									</Container>
								{/if}
							{/snippet}
							{#snippet winAmount({ width })}
								{@const lang = stateUrlDerived.lang()}
								{@const youWon = getFsOutroYouWonText(lang)}
								{@const lineGap = width * 0.22}
								<Container y={width * 0.05}>
									<ResponsiveLocaleText
										anchor={0.5}
										y={isBigWin ? -lineGap * 0.65 : -lineGap * 0.75}
										text={youWon}
										maxWidth={width * 3.2}
										fallbackFill={LOCALE_TEXT_FILL_WHITE}
										style={{
											fontFamily: fontForLocale(
												FONT_PROSTOI_WHITE,
												FONT_PROSTOI_WHITE_RU,
												stateI18n.i18n.locale,
												FONT_PROSTOI_WHITE_HI,
												FONT_PROSTOI_WHITE_VI,
												FONT_PROSTOI_WHITE_CJK,
											),
											fontSize: width * (isBigWin ? 0.58 : 0.68) * BITMAP_FONT_SCALE,
											align: 'center',
											fontWeight: 'bold',
											letterSpacing: 0,
										}}
									/>
									<ResponsiveCurrencyBitmapText
										anchor={0.5}
										y={isBigWin ? lineGap * 1.85 : lineGap * 1.05}
										style={{
											fontSize: width * 0.62 * BITMAP_FONT_SCALE,
										}}
										amount={countUpAmount}
										bookEvent
										maxWidth={width * 3.6}
									/>
								</Container>
							{/snippet}
						</FreeSpinAnimation>
					{/key}

					{#if cookieOpened && !closing}
						<WinCoins
							emit={coinsEmit}
							levelAlias={winLevelData?.alias}
							canvasSpace
							x={fsOutroPopupCenter.x}
							y={fsOutroPopupCenter.y}
						/>
					{/if}

					{#if !closing}
						<PressToContinue
							onpress={() => {
								if (countUpCompleted) {
									finishOutro();
								} else {
									coinsEmit = false;
									stopWinLevelCountUpSounds();
									finishCountUp();
								}
							}}
						/>
					{/if}
				{/snippet}
			</WinCountUpProvider>
		{/key}
	{/if}
</FadeContainer>
