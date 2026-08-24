<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_CAT_MAFIA/bookEvent',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';
	import { stateBet, stateBetDerived } from 'state-shared';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { playBookEvent, playBookEvents } from '../game/utils';
	import { stateGame } from '../game/stateGame.svelte';
	import config from '../game/config';
	import type { BookEvent } from '../game/typesBookEvent';
	import type { GameType, RawSymbol } from '../game/types';
	import {
		PAW_DEMO_VISIBLE_BOARD,
		SW_DEMO_VISIBLE_BOARD,
		FS_TRIGGER_VISIBLE_BOARD,
		FS_BULLET_VISIBLE_BOARD,
		FS_SW_VISIBLE_BOARD,
		pawCoinResolveDemo,
		superWildExpandDemo,
		freeSpinTargetPickDemo,
		freeSpinTriggerFromPick,
		bulletCollectDemo,
		targetShootRoundDemo,
		fsSuperWildExpandDemo,
	} from './data/catmafia_events';
	import { getDrumRotationDeg } from '../game/revolverDrumLayout';

	setContext();

	const asEvent = (raw: unknown) => raw as BookEvent;

	const padBoard = (visibleBoard: { name: string }[][], gameType: GameType): RawSymbol[][] => {
		const paddingReels = config.paddingReels[gameType];
		return visibleBoard.map((reel, reelIndex) => {
			const pad = paddingReels[reelIndex];
			return [pad[0], ...reel, pad[1]] as RawSymbol[];
		});
	};

	const reveal = (visibleBoard: { name: string }[][], gameType: GameType = 'basegame') =>
		asEvent({
			type: 'reveal',
			board: padBoard(visibleBoard, gameType),
			paddingPositions: [10, 20, 5, 15, 8],
			gameType,
			anticipation: [0, 0, 0, 0, 0],
		});
</script>

{#snippet template(args: TemplateArgs<any>)}
	<StoryGameTemplate
		skipLoadingScreen={args.skipLoadingScreen}
		action={async () => {
			await args.action?.(args.data);
		}}
	>
		<StoryLocale lang="en">
			<Game />
		</StoryLocale>
	</StoryGameTemplate>
{/snippet}

<Story
	name="pawCoinResolve"
	args={templateArgs({
		skipLoadingScreen: true,
		action: async () => {
			stateBetDerived.setBetAmount(10);
			stateBet.wageredBetAmount = 10;
			stateBet.winBookEventAmount = 0;
			await playBookEvents([
				reveal([...PAW_DEMO_VISIBLE_BOARD].map((r) => [...r])),
				asEvent(pawCoinResolveDemo),
				asEvent({ type: 'setTotalWin', amount: pawCoinResolveDemo.totalCoinWin }),
			]);
		},
	})}
	{template}
/>

<Story
	name="superWildExpand"
	args={templateArgs({
		skipLoadingScreen: true,
		action: async () => {
			const lineWin = 300;
			const postExpandWin = 600;
			stateBet.winBookEventAmount = 0;
			const phase1Win = {
				type: 'winInfo' as const,
				totalWin: lineWin,
				wins: [
					{
						symbol: 'H2',
						kind: 5,
						win: lineWin,
						positions: [
							{ reel: 0, row: 1 },
							{ reel: 1, row: 1 },
							{ reel: 2, row: 1 },
							{ reel: 3, row: 1 },
							{ reel: 4, row: 1 },
						],
						meta: {
							lineIndex: 1,
							multiplier: 1,
							winWithoutMult: lineWin,
							globalMult: 1,
							lineMultiplier: 1,
						},
					},
				],
			};
			await playBookEvents([
				reveal(
					[...SW_DEMO_VISIBLE_BOARD].map((reel) => reel.map((s) => ({ ...s }))) as {
						name: string;
					}[][],
				),
				asEvent(phase1Win),
				asEvent(superWildExpandDemo),
				// Phase 2: post-curtain re-eval (math order after expand).
				asEvent({
					...phase1Win,
					totalWin: postExpandWin,
					wins: phase1Win.wins.map((w) => ({ ...w, win: postExpandWin })),
				}),
			]);
		},
	})}
	{template}
/>

<Story
	name="freeSpinTargetPick"
	args={templateArgs({
		skipLoadingScreen: true,
		action: async () => {
			const board = [...FS_TRIGGER_VISIBLE_BOARD].map((r) => [...r]);
			await playBookEvents([
				reveal(board),
				asEvent(freeSpinTargetPickDemo),
				asEvent(freeSpinTriggerFromPick),
			]);
		},
	})}
	{template}
/>

<Story
	name="bulletCollect"
	args={templateArgs({
		skipLoadingScreen: true,
		action: async () => {
			stateGame.bonusMode = 'normal';
			stateGame.fsExtraPhase = false;
			stateGame.drumCount = 0;
			stateGame.drumRotationDeg = 0;
			stateGame.gameType = 'freegame';
			await playBookEvents([
				reveal(
					[...FS_BULLET_VISIBLE_BOARD].map((r) => [...r]),
					'freegame',
				),
				asEvent(bulletCollectDemo(1)),
			]);
		},
	})}
	{template}
/>

<Story
	name="fsSuperWildNormal"
	args={templateArgs({
		skipLoadingScreen: true,
		action: async () => {
			// Lying SW in Normal bonus: phase-1 lines → curtain → phase-2 lines.
			const lineWin = 200;
			const postExpandWin = 800;
			stateGame.bonusMode = 'normal';
			stateGame.gameType = 'freegame';
			stateGame.stickySwByReel = {};
			stateGame.stickySwOpened = false;
			stateBet.winBookEventAmount = 0;
			const phase1Win = {
				type: 'winInfo' as const,
				totalWin: lineWin,
				wins: [
					{
						symbol: 'H2',
						kind: 3,
						win: lineWin,
						positions: [
							{ reel: 0, row: 1 },
							{ reel: 1, row: 1 },
							{ reel: 2, row: 1 },
						],
						meta: {
							lineIndex: 1,
							multiplier: 1,
							winWithoutMult: lineWin,
							globalMult: 1,
							lineMultiplier: 1,
						},
					},
				],
			};
			await playBookEvents([
				reveal(
					[...FS_SW_VISIBLE_BOARD].map((reel) => reel.map((s) => ({ ...s }))) as {
						name: string;
					}[][],
					'freegame',
				),
				asEvent(phase1Win),
				asEvent(fsSuperWildExpandDemo),
				asEvent({
					...phase1Win,
					totalWin: postExpandWin,
					wins: phase1Win.wins.map((w) => ({ ...w, win: postExpandWin })),
				}),
			]);
		},
	})}
	{template}
/>

<Story
	name="targetShootRound"
	args={templateArgs({
		skipLoadingScreen: true,
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.drumCount = 3;
			stateGame.drumRotationDeg = getDrumRotationDeg(3);
			stateGame.fsExtraPhase = false;
			await playBookEvent(asEvent(targetShootRoundDemo), { bookEvents: [] });
		},
	})}
	{template}
/>
