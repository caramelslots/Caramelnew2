<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import WinCoins from './WinCoins.svelte';
	import WinAnimation from './WinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { winLevelMap, type WinLevel } from '../game/winLevelMap';

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
	 * Duplicate spine intro animations (levels 9 & 10 share `max_win_intro`)
	 * are deduplicated so the ladder never shows the same banner twice.
	 */
	function computeWinLadder(data: WinLevelData): WinLevelData[] {
		const BIG_WIN_LEVEL = 6;
		if (data.type !== 'big' || data.level <= BIG_WIN_LEVEL) return [data];

		const ladder: WinLevelData[] = [];
		const seenIntros = new Set<string>();

		for (let l = BIG_WIN_LEVEL; l <= data.level; l++) {
			const levelData = winLevelMap[l as WinLevel];
			if (!levelData?.animation) continue;
			if (seenIntros.has(levelData.animation.intro)) continue;
			seenIntros.add(levelData.animation.intro);
			ladder.push(levelData);
		}
		return ladder;
	}

	const winLadder = $derived(winLevelData ? computeWinLadder(winLevelData) : []);
	const currentTierData = $derived(winLadder[currentTierIndex] ?? winLevelData);

	/**
	 * Advances through ladder tiers while the count-up is running.
	 * Each intermediate tier shows for its incremental presentDuration
	 * (i.e. the time added to reach that tier vs the previous one).
	 * The final tier stays until the count-up completes or the user skips.
	 *
	 * The wait on each tier is skippable: when the user clicks, `skipCurrentTier`
	 * is called which resolves the promise early and advances to the next tier.
	 * On the final tier `skipCurrentTier` is null, so clicking falls through to
	 * `finishCountUp()` (existing fast-forward behaviour).
	 *
	 * Also advances the BGM to match each new tier.
	 */
	$effect(() => {
		winUpdateCount; // re-run on every new win event
		const ladder = winLadder;
		if (ladder.length <= 1) return;

		let aborted = false;

		void (async () => {
			for (let i = 0; i < ladder.length - 1; i++) {
				if (aborted) return;

				const tierDuration =
					i === 0
						? ladder[i].presentDuration
						: ladder[i].presentDuration - ladder[i - 1].presentDuration;

				// Skippable wait: resolves after tierDuration OR immediately when the
				// user clicks (via skipCurrentTier). Using raw setTimeout so we can
				// clearTimeout on skip without leaving a dangling timer.
				await new Promise<void>((resolve) => {
					const timer = setTimeout(resolve, tierDuration);
					skipCurrentTier = () => {
						clearTimeout(timer);
						resolve();
					};
				});

				if (aborted) return;
				skipCurrentTier = null;
				currentTierIndex = i + 1;

				const nextBgm = ladder[i + 1]?.sound?.bgm;
				if (nextBgm) {
					context.eventEmitter.broadcast({ type: 'soundMusic', name: nextBgm });
				}
			}
			skipCurrentTier = null;
		})();

		return () => {
			aborted = true;
			// Unblock any pending wait so the async can reach `if (aborted) return`.
			const skip = skipCurrentTier;
			skipCurrentTier = null;
			skip?.();
		};
	});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			currentTierIndex = 0;
			winUpdateCount++;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />
				{/if}

				<OnMount
					onmount={async () => {
						await startCountUp();
						await waitForTimeout(300);
						oncomplete();
					}}
				/>

				<MainContainer>
					<Container
						x={context.stateGameDerived.boardLayout().x}
						y={context.stateGameDerived.boardLayout().y}
					>
						{#if currentTierData?.animation}
							{#key currentTierIndex}
								<WinAnimation
									animationMap={currentTierData.animation}
									bannerOverrideText={currentTierData.alias === 'sensational'
										? currentTierData.text
										: undefined}
								>
									<ResponsiveBitmapText
										anchor={0.5}
										maxWidth={2130}
										text={bookEventAmountToCurrencyString(countUpAmount)}
										style={{
											fontFamily: 'gold',
											fontSize: SYMBOL_SIZE * 3.6,
											align: 'center',
											fontWeight: 'bold',
											letterSpacing: 0,
										}}
									/>
								</WinAnimation>
							{/key}
						{:else}
							<ResponsiveBitmapText
								anchor={0.5}
								maxWidth={context.stateLayoutDerived.canvasSizes().width /
									context.stateLayoutDerived.mainLayout().scale}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								style={{
									fontFamily: 'gold',
									fontSize: SYMBOL_SIZE,
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
