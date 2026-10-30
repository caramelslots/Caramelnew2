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
	} from '../game/constants';
	import { getContext } from '../game/context';
	import ArchedLocaleText from './ArchedLocaleText.svelte';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { ensureFsPopupReady, isFsPopupLive } from '../game/featureGpuMemory';
	import { stateGame } from '../game/stateGame.svelte';
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
	/** Bumped after ensure so `{#if fsPopupReady}` re-checks live atlas pages. */
	let fsPopupCheckNonce = $state(0);

	const fsPopupReady = $derived.by(() => {
		void fsPopupCheckNonce;
		void context.stateApp.loadedAssets?.['fsPopup'];
		return isFsPopupLive(context.stateApp);
	});

	const preloadFsPopup = async () => {
		await ensureFsPopupReady(context.stateApp);
		fsPopupCheckNonce += 1;
	};

	const finishOutro = async () => {
		if (finishingOutro) return;
		finishingOutro = true;
		closing = true;
		stateGame.overlayDimAlpha = 0;
		// Dead / missing fsPopup spine must not block dismiss (out2 complete never fires).
		await Promise.race([
			fsAnimation?.playDisappear() ?? Promise.resolve(),
			waitForTimeout(scaleMsByGameSpeed(1200, stateGame.gameSpeed)),
		]);
		show = false;
		winLevelData = undefined;
		stateGame.winOverlayActive = false;
		// HUD stays down until the exit transition finishes. Clearing this here
		// popped balance / bet / duel chrome back in before the steam.
		stateGame.overlayDimAlpha = 0;
		oncomplete();
	};

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			show = true;
			closing = false;
			stateGame.winOverlayActive = true;
			stateGame.fsOutroActive = true;
			// Preload in background — never block CountUp on this broadcast.
			void preloadFsPopup();
		},
		freeSpinOutroHide: async () => {
			show = false;
			closing = false;
			finishingOutro = false;
			winLevelData = undefined;
			winAmount = 0;
			stateGame.winOverlayActive = false;
			// Leave fsOutroActive to freeSpinEnd (keeps canvas over HUD through steam).
			stateGame.overlayDimAlpha = 0;
		},
		freeSpinOutroCountUp: async (emitterEvent) => {
			finishingOutro = false;
			closing = false;
			// Paint Total Win / PressToContinue FIRST. Awaiting ensureFsPopupReady
			// before this left fsOutroActive=true (canvas over HUD, black plate)
			// with no panel — looked like a frozen board after the last FS.
			winAmount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			stateGame.overlayDimAlpha = FS_OUTRO_DIM_ALPHA;
			stateGame.winOverlayActive = true;
			stateGame.fsOutroActive = true;
			show = true;
			void preloadFsPopup();
			waitForTimeout(scaleMsByGameSpeed(1000, stateGame.gameSpeed)).then(() => {
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
			});
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<!--
	`persistent` + duration 0: without extras, freeSpinEnd runs immediately after the
	last FS / Stage E. A non-persistent FadeContainer unmounts children at alpha 0 and
	can leave a raised black canvas (fsOutroActive) with no Total Win panel.
-->
<!--
	`persistent` + duration 0: without extras, freeSpinEnd runs immediately after the
	last FS / Stage E. A non-persistent FadeContainer unmounts children at alpha 0 and
	can leave a raised black canvas (fsOutroActive) with no Total Win panel.
-->
<FadeContainer {show} persistent duration={0} zIndex={10}>
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

					{#if fsPopupReady}
						{#key winAmount}
							<FreeSpinAnimation bind:this={fsAnimation}>
								{#snippet title({ width })}
									<!-- `total_win` slot — Meowfia Biger Latin atlas (same as Big Win titles). -->
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
									<!-- `sum` slot — empty gold plate; overlay currency count-up.
									     Base size a bit larger; minScale lets huge amounts shrink to fit the plaque. -->
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
						<!-- Fallback when fsPopup never lands — keep Total Win dismissible. -->
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
