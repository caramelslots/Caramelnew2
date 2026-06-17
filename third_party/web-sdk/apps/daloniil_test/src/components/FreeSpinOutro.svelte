<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { CanvasSizeRectangle } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { stateUrlDerived } from 'state-shared';

	import {
		BITMAP_FONT_SCALE,
		FONT_KRUTOI,
		FONT_PROSTOI,
		WIN_SCREEN_POST_COUNT_UP_DELAY_MS,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
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
			waitForTimeout(1000).then(() => (cookieOpened = true));
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
						await waitForTimeout(WIN_SCREEN_POST_COUNT_UP_DELAY_MS);
						oncomplete();
					}}
				/>

				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

				{#key winAmount}
					<FreeSpinAnimation>
						{#snippet title({ width })}
							<Sprite
								anchor={0.5}
								width={isBigWin ? width * 3.2 : width * 4.0}
								height={isBigWin ? width * 1.0 : width * 0.65}
								key={isBigWin
									? `freespins_${stateUrlDerived.lang()}.png`
									: `winsmall_${stateUrlDerived.lang()}.png`}
							/>
						{/snippet}
						{#snippet winAmount({ width })}
							<ResponsiveBitmapText
								anchor={0.5}
								style={{
									fontFamily: isBigWin ? FONT_KRUTOI : FONT_PROSTOI,
									fontSize: width * 0.4 * BITMAP_FONT_SCALE,
								}}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								maxWidth={width * 3.0}
							/>
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
