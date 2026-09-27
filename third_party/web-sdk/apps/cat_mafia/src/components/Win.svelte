<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| {
				type: 'winUpdate';
				amount: number;
				winLevelData: WinLevelData;
				/** When set, count-up starts here (e.g. phase-1 total before additive phase-2). */
				fromAmount?: number;
		  };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { createInterruptible } from 'utils-shared/interruptible';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import WinAnimation from './WinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';
	import {
		BIG_WIN_DIM_ALPHA,
		BITMAP_FONT_SCALE,
		SYMBOL_SIZE,
		WIN_SCREEN_POST_COUNT_UP_DELAY_MS,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { stateGame } from '../game/stateGame.svelte';
	import { winLevelMap, type WinLevel } from '../game/winLevelMap';
	import { sound } from '../game/sound';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let fromAmount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	// Ladder state: tracks which tier is currently displayed
	let currentTierIndex = $state(0);
	// Increments on every new win to ensure the $effect re-runs even for same-level repeats
	let winUpdateCount = $state(0);
	// When non-null, calling it skips the current tier's wait and advances to the next tier.
	// Null means we're on the final tier — click should finish the count-up instead.
	let skipCurrentTier = $state<(() => void) | null>(null);
	let winAnimation: { playOutro: (options?: { instant?: boolean }) => Promise<void> } | undefined =
		$state();

	/** Guards against double-dismiss (press + auto path after count-up). */
	let dismissRequested = false;
	/** Interruptible wait between count-up end and auto-dismiss. */
	const postCountUpWait = createInterruptible();

	const finishWinPresentation = async (options?: { instant?: boolean }) => {
		if (dismissRequested) return;
		dismissRequested = true;
		clearTierTimers();
		postCountUpWait.interrupt();
		postCountUpWait.clear();
		await winAnimation?.playOutro({ instant: options?.instant === true });
		oncomplete();
	};

	/**
	 * Builds the win ladder for big wins:
	 *   level 6  → [Big]
	 *   level 7  → [Big, Super]
	 *   level 8  → [Big, Super, Epic]
	 *   level 9+ → [Big, Super, Epic, Sensational]
	 *
	 * Duplicate banner labels are deduplicated (levels 9 & 10 both say
	 * SENSATIONAL) so the ladder never shows the same title twice.
	 */
	function computeWinLadder(data: WinLevelData): WinLevelData[] {
		const BIG_WIN_LEVEL = 6;
		if (data.type !== 'big' || data.level <= BIG_WIN_LEVEL) return [data];

		const ladder: WinLevelData[] = [];
		const seenLabels = new Set<string>();

		for (let l = BIG_WIN_LEVEL; l <= data.level; l++) {
			const levelData = winLevelMap[l as WinLevel];
			if (!levelData?.animation) continue;
			const label = levelData.text ?? '';
			if (seenLabels.has(label)) continue;
			seenLabels.add(label);
			ladder.push(levelData);
		}
		return ladder;
	}

	const winLadder = $derived(winLevelData ? computeWinLadder(winLevelData) : []);
	const currentTierData = $derived(winLadder[currentTierIndex] ?? winLevelData);

	let tierTimers: ReturnType<typeof setTimeout>[] = [];

	const clearTierTimers = () => {
		tierTimers.forEach(clearTimeout);
		tierTimers = [];
	};

	/** Schedule one tier wait, then advance currentTierIndex and chain the next step. */
	const scheduleTierStep = (ladder: WinLevelData[], stepIndex: number) => {
		if (stepIndex >= ladder.length - 1) {
			skipCurrentTier = null;
			return;
		}

		const tier = ladder[stepIndex];
		const tierDuration =
			'bgmDuration' in tier && tier.bgmDuration != null
				? tier.bgmDuration
				: stepIndex === 0
					? tier.presentDuration
					: tier.presentDuration - ladder[stepIndex - 1].presentDuration;

		skipCurrentTier = () => {
			clearTierTimers();
			currentTierIndex = stepIndex + 1;
			scheduleTierStep(ladder, stepIndex + 1);
		};

		tierTimers.push(
			setTimeout(() => {
				currentTierIndex = stepIndex + 1;
				scheduleTierStep(ladder, stepIndex + 1);
			}, tierDuration),
		);
	};

	const startTierAdvancement = (ladder: WinLevelData[]) => {
		clearTierTimers();
		if (ladder.length <= 1) {
			skipCurrentTier = null;
			return;
		}
		scheduleTierStep(ladder, 0);
	};

	/** Keep win BGM in sync with the visible ladder tier (Big → Super → Epic → Sensational). */
	$effect(() => {
		winUpdateCount;
		const bgm = winLadder[currentTierIndex]?.sound?.bgm;
		if (bgm) {
			sound.players.music.play({ name: bgm });
		}
	});

	/**
	 * Big Win overlay only: like for Big/Super, applause for Epic/Sensational.
	 * After the one-shot the mascot returns to idle (desktop and phone).
	 */
	$effect(() => {
		winUpdateCount;
		if (!show || !winLevelData || winLevelData.type !== 'big') return;
		if (winLevelData.alias === 'epic' || winLevelData.alias === 'sensational') {
			if (stateGame.mascotPose !== 'clap') {
				stateGame.mascotAnimToken += 1;
				stateGame.mascotPose = 'clap';
			}
			return;
		}
		if (stateGame.mascotPose !== 'react') {
			stateGame.mascotAnimToken += 1;
			stateGame.mascotPose = 'react';
		}
	});

	context.eventEmitter.subscribeOnMount({
		winShow: () => {
			show = true;
		},
		winHide: () => {
			show = false;
			stateGame.winOverlayActive = false;
			stateGame.overlayDimAlpha = 0;
			clearTierTimers();
			postCountUpWait.interrupt();
			postCountUpWait.clear();
		},
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			fromAmount = Math.max(0, Math.min(emitterEvent.fromAmount ?? 0, emitterEvent.amount));
			winLevelData = emitterEvent.winLevelData;
			const isBig = emitterEvent.winLevelData.type === 'big';
			stateGame.winOverlayActive = isBig;
			stateGame.overlayDimAlpha = isBig ? BIG_WIN_DIM_ALPHA : 0;
			currentTierIndex = 0;
			winUpdateCount++;
			dismissRequested = false;
			startTierAdvancement(computeWinLadder(emitterEvent.winLevelData));
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show} zIndex={10}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} from={fromAmount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={BIG_WIN_DIM_ALPHA} />
				{/if}

				<OnMount
					onmount={async () => {
						await startCountUp();
						if (dismissRequested) return;
						await postCountUpWait.add(() =>
							waitForTimeout(
								scaleMsByGameSpeed(WIN_SCREEN_POST_COUNT_UP_DELAY_MS, stateGame.gameSpeed),
							),
						);
						postCountUpWait.clear();
						if (dismissRequested) return;
						await finishWinPresentation();
					}}
				/>

				<MainContainer>
					<Container
						x={context.stateGameDerived.boardLayout().x}
						y={context.stateGameDerived.boardLayout().y}
					>
						{#if currentTierData?.animation}
							{@const amountMaxWidth = context.stateGameDerived.boardLayout().width * 2.8}
							<WinAnimation
								bind:this={winAnimation}
								animationMap={currentTierData.animation}
								bannerOverrideText={currentTierData.text ?? undefined}
							>
								<ResponsiveCurrencyBitmapText
									anchor={0.5}
									y={-SYMBOL_SIZE * 0.2}
									maxWidth={amountMaxWidth}
									amount={countUpAmount}
									bookEvent
									bodyFontVariant="meowfiaBiger"
									minScale={0.18}
									style={{
										fontSize: SYMBOL_SIZE * 17.6 * BITMAP_FONT_SCALE,
										align: 'center',
										fontWeight: 'bold',
										letterSpacing: 0,
									}}
								/>
							</WinAnimation>
						{:else}
							<ResponsiveCurrencyBitmapText
								anchor={0.5}
								bodyFontVariant="prostoi"
								maxWidth={context.stateLayoutDerived.canvasSizes().width /
									context.stateLayoutDerived.mainLayout().scale}
								amount={countUpAmount}
								bookEvent
								style={{
									fontSize: SYMBOL_SIZE * BITMAP_FONT_SCALE,
									align: 'center',
									fontWeight: 'bold',
									letterSpacing: 0,
								}}
							/>
						{/if}
					</Container>
				</MainContainer>

				<PressToContinue
					onpress={() => {
						if (dismissRequested) return;
						if (countUpCompleted) {
							// Hold after count-up — skip delay / outro and dismiss.
							void finishWinPresentation({ instant: true });
						} else if (skipCurrentTier) {
							// Intermediate ladder tier — advance Big → Super → Epic → …
							skipCurrentTier();
						} else {
							// Final ladder tier (or single-tier Big Win): snap amount and dismiss.
							finishCountUp();
							void finishWinPresentation({ instant: true });
						}
					}}
				/>
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
