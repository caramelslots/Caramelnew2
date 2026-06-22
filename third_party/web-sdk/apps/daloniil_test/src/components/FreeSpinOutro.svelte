<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
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
		FONT_PROSTOI_WHITE,
		FONT_PROSTOI_WHITE_RU,
		fontForLocale,
		WIN_SCREEN_POST_COUNT_UP_DELAY_MS,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		FS_OUTRO_TOTAL_WIN_LABEL,
		getFsOutroCongratulationsText,
		getFsOutroYouWonText,
	} from '../game/fsOutroBannerText';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import WinCoins from './WinCoins.svelte';

	const context = getContext();

	let show = $state(true);
	let winAmount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});
	let cookieOpened = $state(false);

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			show = true;
		},
		freeSpinOutroHide: async () => {
			show = false;
			stateGame.winOverlayActive = false;
		},
		freeSpinOutroCountUp: async (emitterEvent) => {
			cookieOpened = false;
			waitForTimeout(scaleMsByGameSpeed(1000, stateGame.gameSpeed)).then(() => (cookieOpened = true));
			winAmount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			stateGame.winOverlayActive = emitterEvent.winLevelData.type === 'big';
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const duration = winLevelData.presentDuration}
		{@const isBigWin = winLevelData.type === 'big'}
		<WinCountUpProvider amount={winAmount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount
					onmount={async () => {
						await startCountUp();
						await waitForTimeout(
							scaleMsByGameSpeed(WIN_SCREEN_POST_COUNT_UP_DELAY_MS, stateGame.gameSpeed),
						);
						oncomplete();
					}}
				/>

				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

				{#key winAmount}
					<FreeSpinAnimation>
						{#snippet title({ width })}
							{@const lang = stateUrlDerived.lang()}
							{@const youWon = getFsOutroYouWonText(lang)}
							{@const titleLineGap = width * 0.2}
							{#if isBigWin}
								<Container>
									<ResponsiveBitmapText
										anchor={0.5}
										y={-titleLineGap}
										text={getFsOutroCongratulationsText(lang)}
										maxWidth={width * 3.4}
										style={{
											fontFamily: fontForLocale(FONT_KRUTOI, FONT_KRUTOI_RU, stateI18n.i18n.locale),
											fontSize: width * 0.56 * BITMAP_FONT_SCALE,
											align: 'center',
											fontWeight: 'bold',
											letterSpacing: 0,
										}}
									/>
									<ResponsiveBitmapText
										anchor={0.5}
										y={titleLineGap}
										text={youWon}
										maxWidth={width * 3.0}
										style={{
											fontFamily: fontForLocale(FONT_PROSTOI_WHITE, FONT_PROSTOI_WHITE_RU, stateI18n.i18n.locale),
											fontSize: width * 0.42 * BITMAP_FONT_SCALE,
											align: 'center',
											fontWeight: 'bold',
											letterSpacing: 0,
										}}
									/>
								</Container>
							{:else}
								<ResponsiveBitmapText
									anchor={0.5}
									text={youWon}
									maxWidth={width * 3.0}
									style={{
										fontFamily: fontForLocale(FONT_PROSTOI_WHITE, FONT_PROSTOI_WHITE_RU, stateI18n.i18n.locale),
										fontSize: width * 0.5 * BITMAP_FONT_SCALE,
										align: 'center',
										fontWeight: 'bold',
										letterSpacing: 0,
									}}
								/>
							{/if}
						{/snippet}
						{#snippet winAmount({ width })}
							{@const amountLineGap = width * 0.25}
							<Container>
								<ResponsiveCurrencyBitmapText
									anchor={0.5}
									y={-amountLineGap}
									style={{
										fontSize: width * 0.45 * BITMAP_FONT_SCALE,
									}}
									amount={countUpAmount}
									bookEvent
									maxWidth={width * 3.2}
								/>
								<ResponsiveBitmapText
									anchor={0.5}
									y={amountLineGap}
									text={FS_OUTRO_TOTAL_WIN_LABEL}
									maxWidth={width * 2.6}
									style={{
										fontFamily: fontForLocale(FONT_PROSTOI_WHITE, FONT_PROSTOI_WHITE_RU, stateI18n.i18n.locale),
										fontSize: width * 0.26 * BITMAP_FONT_SCALE,
										align: 'center',
										fontWeight: 'bold',
										letterSpacing: 0,
									}}
								/>
							</Container>
						{/snippet}
					</FreeSpinAnimation>
				{/key}

				{#if cookieOpened}
					<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />
				{/if}

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
