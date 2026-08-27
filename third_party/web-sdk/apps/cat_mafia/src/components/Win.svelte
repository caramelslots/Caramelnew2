<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import WinCoins from './WinCoins.svelte';
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
	import { winLevelMap, UNIFIED_BIG_WIN_SPINE, type WinLevel } from '../game/winLevelMap';
	import { sound } from '../game/sound';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
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

	/**
	 * Builds the win ladder for big wins:
	 *   level 6  → [Big]
	 *   level 7  → [Big, Super]
	 *   level 8  → [Big, Super, Epic]
	 *   level 9+ → [Big, Super, Epic, Sensational]
	 *
	 * Duplicate banner labels are deduplicated (levels 9 & 10 both say
	 * SENSATIONAL WIN) so the ladder never shows the same title twice.
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
	 * Portrait phone keeps looping idle — clap holdEnd reads as a freeze under the banner.
	 */
	$effect(() => {
		winUpdateCount;
		if (!show || !winLevelData || winLevelData.type !== 'big') return;
		if (context.stateLayoutDerived.layoutType() === 'portrait') return;
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
		},
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			const isBig = emitterEvent.winLevelData.type === 'big';
			stateGame.winOverlayActive = isBig;
			stateGame.overlayDimAlpha = isBig ? BIG_WIN_DIM_ALPHA : 0;
			currentTierIndex = 0;
			winUpdateCount++;
			startTierAdvancement(computeWinLadder(emitterEvent.winLevelData));
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show} zIndex={10}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={BIG_WIN_DIM_ALPHA} />
				{/if}

				<OnMount
					onmount={async () => {
						await startCountUp();
						await waitForTimeout(
							scaleMsByGameSpeed(WIN_SCREEN_POST_COUNT_UP_DELAY_MS, stateGame.gameSpeed),
						);
						oncomplete();
					}}
				/>

				<MainContainer>
					<Container
						x={context.stateGameDerived.boardLayout().x}
						y={context.stateGameDerived.boardLayout().y}
					>
						{#if currentTierData?.animation}
							<WinAnimation
								animationMap={UNIFIED_BIG_WIN_SPINE}
								bannerOverrideText={currentTierData.text ?? undefined}
							>
								<ResponsiveCurrencyBitmapText
									anchor={0.5}
									maxWidth={2130}
									amount={countUpAmount}
									bookEvent
									style={{
										fontSize: SYMBOL_SIZE * 3.6 * BITMAP_FONT_SCALE,
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

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue
					onpress={() => {
						if (countUpCompleted) {
							oncomplete();
						} else if (skipCurrentTier) {
							// On an intermediate ladder tier — skip to the next one
							skipCurrentTier();
						} else {
							// On the final tier — fast-forward the count-up
							finishCountUp();
						}
					}}
				/>
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
