<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
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
		FONT_KRUTOI_VI,
		FONT_KRUTOI_CJK,
		fontForLocale,
		FS_OUTRO_DIM_ALPHA,
		FS_OUTRO_TOTAL_WIN_ARCH_DEG,
		FS_OUTRO_TOTAL_WIN_TRACKING,
		LOCALE_TEXT_FILL_GOLD,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import ArchedLocaleText from './ArchedLocaleText.svelte';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { stateGame } from '../game/stateGame.svelte';
	import { getFsOutroTotalWinText } from '../game/fsOutroBannerText';
	import { stopWinLevelCountUpSounds } from '../game/bookEventHandlerMap';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';

	const context = getContext();

	let show = $state(true);
	let winAmount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});
	let fsAnimation = $state<FreeSpinAnimation | undefined>();
	let finishingOutro = $state(false);
	let closing = $state(false);

	const finishOutro = async () => {
		if (finishingOutro) return;
		finishingOutro = true;
		closing = true;
		stateGame.overlayDimAlpha = 0;
		await fsAnimation?.playDisappear();
		show = false;
		stateGame.winOverlayActive = false;
		stateGame.overlayDimAlpha = 0;
		oncomplete();
	};

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			show = true;
			closing = false;
			// Raise the Pixi stage over HTML HUD (spin / bet / balance).
			stateGame.winOverlayActive = true;
		},
		freeSpinOutroHide: async () => {
			show = false;
			closing = false;
			stateGame.winOverlayActive = false;
			stateGame.overlayDimAlpha = 0;
		},
		freeSpinOutroCountUp: async (emitterEvent) => {
			finishingOutro = false;
			closing = false;
			waitForTimeout(scaleMsByGameSpeed(1000, stateGame.gameSpeed)).then(() => {
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
			});
			winAmount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			stateGame.winOverlayActive = true;
			stateGame.overlayDimAlpha = FS_OUTRO_DIM_ALPHA;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show} zIndex={10}>
	{#if winLevelData}
		{@const duration = winLevelData.presentDuration}
		{#key winAmount}
			<WinCountUpProvider
				amount={winAmount}
				{duration}
				oncomplete={() => {
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
								<!-- `total_win` slot — arched like loader card 1 ribbon title. -->
								<ArchedLocaleText
									y={-width * 0.4}
									text={getFsOutroTotalWinText(lang)}
									maxWidth={width * 5.8}
									archDeg={FS_OUTRO_TOTAL_WIN_ARCH_DEG}
									tracking={FS_OUTRO_TOTAL_WIN_TRACKING}
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
										fontSize: width * 1.18 * BITMAP_FONT_SCALE,
										align: 'center',
										fontWeight: 'bold',
										letterSpacing: 0,
									}}
								/>
							{/snippet}
							{#snippet winAmount({ width })}
								<!-- `sum` slot — empty gold plate; overlay currency count-up. -->
								<ResponsiveCurrencyBitmapText
									anchor={0.5}
									y={-width * 0.1}
									style={{
										fontSize: width * 0.95 * BITMAP_FONT_SCALE,
									}}
									amount={countUpAmount}
									bookEvent
									maxWidth={width * 5.0}
								/>
							{/snippet}
						</FreeSpinAnimation>
					{/key}

					{#if !closing}
						<PressToContinue
							onpress={() => {
								if (countUpCompleted) {
									finishOutro();
								} else {
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
