<!--
	Storybook stories для MysteryReelUnlockOverlay (REDESIGN_PLAN §2.5.2).
	Триггерит emitter event mysteryReelUnlock — overlay показывается с
	celebration-анимацией на ~2.4 сек.
-->
<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'COMPONENTS/<MysteryReelUnlockOverlay>',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { eventEmitter } from '../game/eventEmitter';
	import { stateGame } from '../game/stateGame.svelte';

	setContext();
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
	name="single reel unlock (tier 1)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.bonusCollected = 4;
			stateGame.ladderTier = 1;
			stateGame.mysteryReels = [2];
			await eventEmitter.broadcastAsync({
				type: 'mysteryReelUnlock',
				reels: [2],
				tierAfter: 1,
				rewardSpins: 3,
			});
		},
	})}
	{template}
/>

<Story
	name="multi reel unlock (rare 2-tier)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.bonusCollected = 8;
			stateGame.ladderTier = 2;
			stateGame.mysteryReels = [1, 3];
			await eventEmitter.broadcastAsync({
				type: 'mysteryReelUnlock',
				reels: [1, 3],
				tierAfter: 2,
				rewardSpins: 6,
			});
		},
	})}
	{template}
/>

<Story
	name="max tier reached (final unlock)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.bonusCollected = 20;
			stateGame.ladderTier = 5;
			stateGame.mysteryReels = [0, 1, 2, 3, 4];
			await eventEmitter.broadcastAsync({
				type: 'mysteryReelUnlock',
				reels: [4],
				tierAfter: 5,
				rewardSpins: 3,
			});
		},
	})}
	{template}
/>
