<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import {
		BITMAP_FONT_SCALE,
		FONT_MEOWFIA_BIGER,
		FS_OUTRO_DIM_ALPHA,
		FS_OUTRO_POPUP_Y_FRAC,
		FS_OUTRO_TOTAL_WIN_ARCH_DEG,
		FS_OUTRO_TOTAL_WIN_TRACKING,
		LOCALE_TEXT_FILL_GOLD,
		WIN_SCREEN_POST_COUNT_UP_DELAY_MS,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { eventEmitter } from '../game/eventEmitter';
	import ArchedLocaleText from './ArchedLocaleText.svelte';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { ensureFsPopupReady, isFsPopupLive } from '../game/featureGpuMemory';
	import { stateGame } from '../game/stateGame.svelte';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';

	const context = getContext();

	/** Same singleton bookEventHandlerMap broadcasts on — not context (HMR-safe). */
	const stopWinLevelCountUpSounds = () => {
		eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
		for (const name of [
			'bgm_winlevel_big',
			'bgm_winlevel_superwin',
			'bgm_winlevel_epic',
			'bgm_winlevel_max',
		] as const) {
			eventEmitter.broadcast({ type: 'soundStop', name });
		}
	};

	let show = $state(false);
	let winAmount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});
	let fsAnimation = $state<FreeSpinAnimation | undefined>();
	let finishingOutro = $state(false);
	let closing = $state(false);
	let fsPopupCheckNonce = $state(0);

	const fsPopupReady = $derived.by(() => {
		void fsPopupCheckNonce;
		void context.stateApp.loadedAssets?.['fsPopup'];
		return isFsPopupLive(context.stateApp);
	});

	const warmFsPopup = async () => {
		try {
			await Promise.race([
				ensureFsPopupReady(context.stateApp),
				waitForTimeout(scaleMsByGameSpeed(4000, stateGame.gameSpeed)),
			]);
		} catch {
			/* keep fallback panel */
		}
		fsPopupCheckNonce += 1;
	};

	const finishOutro = async () => {
		if (finishingOutro) return;
		finishingOutro = true;
		closing = true;
		stateGame.overlayDimAlpha = 0;
		try {
			await Promise.race([
				fsAnimation?.playDisappear() ?? Promise.resolve(),
				waitForTimeout(scaleMsByGameSpeed(1200, stateGame.gameSpeed)),
			]);
		} catch {
			/* still unblock freeSpinEnd */
		}
		show = false;
		winLevelData = undefined;
		stateGame.winOverlayActive = false;
		stateGame.overlayDimAlpha = 0;
		const done = oncomplete;
		oncomplete = () => {};
		done();
	};

	// Same module emitter bookEventHandlerMap broadcasts on (not context).
	eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			show = true;
			closing = false;
			finishingOutro = false;
			stateGame.winOverlayActive = true;
			stateGame.fsOutroActive = true;
			void warmFsPopup();
		},
		freeSpinOutroHide: async () => {
			show = false;
			closing = false;
			finishingOutro = false;
			winLevelData = undefined;
			winAmount = 0;
			stateGame.winOverlayActive = false;
			stateGame.overlayDimAlpha = 0;
			const done = oncomplete;
			oncomplete = () => {};
			done();
		},
		freeSpinOutroCountUp: async (emitterEvent) => {
			finishingOutro = false;
			closing = false;
			winAmount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			stateGame.overlayDimAlpha = FS_OUTRO_DIM_ALPHA;
			stateGame.winOverlayActive = true;
			stateGame.fsOutroActive = true;
			show = true;
			void warmFsPopup();
			waitForTimeout(scaleMsByGameSpeed(1000, stateGame.gameSpeed)).then(() => {
				eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
			});

			const presentMs = Math.max(1500, Number(emitterEvent.winLevelData?.presentDuration) || 2000);
			const autoMs = scaleMsByGameSpeed(
				presentMs + WIN_SCREEN_POST_COUNT_UP_DELAY_MS,
				stateGame.gameSpeed,
			);
			void waitForTimeout(autoMs).then(() => {
				if (finishingOutro) return;
				void finishOutro();
			});

			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show} persistent duration={0} zIndex={10}>
	{#if winLevelData}
		{@const duration = Math.max(600, winLevelData.presentDuration || 2000)}
		{#key `${winAmount}:${duration}`}
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

					{#if fsPopupReady}
						{#key winAmount}
							<FreeSpinAnimation bind:this={fsAnimation}>
								{#snippet title({ width })}
									<ArchedLocaleText
										y={-width * 0.4}
										text="TOTAL WIN"
										maxWidth={width * 8}
										archDeg={FS_OUTRO_TOTAL_WIN_ARCH_DEG}
										tracking={FS_OUTRO_TOTAL_WIN_TRACKING}
										fallbackFill={LOCALE_TEXT_FILL_GOLD}
										forceBitmap={true}
										style={{
											fontFamily: FONT_MEOWFIA_BIGER,
											fontSize: width * 2.36 * BITMAP_FONT_SCALE,
											align: 'center',
											fontWeight: 'bold',
											letterSpacing: 0,
										}}
									/>
								{/snippet}
								{#snippet winAmount({ width })}
									<ResponsiveCurrencyBitmapText
										anchor={0.5}
										y={-width * 0.1}
										style={{
											fontSize: width * 1.2 * BITMAP_FONT_SCALE,
										}}
										amount={countUpAmount}
										bookEvent
										bodyFontVariant="meowfiaBiger"
										maxWidth={width * 5.0}
										minScale={0.18}
									/>
								{/snippet}
							</FreeSpinAnimation>
						{/key}
					{:else if !closing}
						{@const mainLayout = context.stateLayoutDerived.mainLayout()}
						<MainContainer>
							<Container
								x={mainLayout.width * 0.5}
								y={mainLayout.height * FS_OUTRO_POPUP_Y_FRAC}
							>
								<ArchedLocaleText
									y={-120}
									text="TOTAL WIN"
									maxWidth={720}
									archDeg={FS_OUTRO_TOTAL_WIN_ARCH_DEG}
									tracking={FS_OUTRO_TOTAL_WIN_TRACKING}
									fallbackFill={LOCALE_TEXT_FILL_GOLD}
									forceBitmap={true}
									style={{
										fontFamily: FONT_MEOWFIA_BIGER,
										fontSize: 72 * BITMAP_FONT_SCALE,
										align: 'center',
										fontWeight: 'bold',
										letterSpacing: 0,
									}}
								/>
								<ResponsiveCurrencyBitmapText
									anchor={0.5}
									style={{
										fontSize: 96 * BITMAP_FONT_SCALE,
									}}
									amount={countUpAmount}
									bookEvent
									bodyFontVariant="meowfiaBiger"
									maxWidth={720}
									minScale={0.18}
								/>
							</Container>
						</MainContainer>
					{/if}

					{#if !closing}
						<PressToContinue
							onpress={() => {
								if (countUpCompleted) {
									void finishOutro();
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
