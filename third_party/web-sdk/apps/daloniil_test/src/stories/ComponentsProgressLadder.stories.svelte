<!--
	Storybook stories для ProgressLadder (Mystery Reel Meter).
	REDESIGN_PLAN §2.5.1: top-right HUD, фокус на mystery reels.
	Manipulate stateGame для разных snapshot-ов прогресса.
-->
<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'COMPONENTS/<ProgressLadder>',
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
	name="0/4 (FS just started)"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.bonusCollected = 0;
			stateGame.ladderTier = 0;
			stateGame.mysteryReels = [];
		},
	})}
	{template}
/>

<Story
	name="1/4 progress"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.bonusCollected = 1;
			stateGame.ladderTier = 0;
			stateGame.mysteryReels = [];
		},
	})}
	{template}
/>

<Story
	name="3/4 progress"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.bonusCollected = 7;
			stateGame.ladderTier = 1;
			stateGame.mysteryReels = [2];
		},
	})}
	{template}
/>

<Story
	name="pulse on collect"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.bonusCollected = 12;
			stateGame.ladderTier = 3;
			stateGame.mysteryReels = [0, 2, 4];
			eventEmitter.broadcast({ type: 'ladderPulse' });
		},
	})}
	{template}
/>

<Story
	name="max reached"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'freegame';
			stateGame.bonusCollected = 22;
			stateGame.ladderTier = 5;
			stateGame.mysteryReels = [0, 1, 2, 3, 4];
		},
	})}
	{template}
/>

<Story
	name="hidden in basegame"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			stateGame.gameType = 'basegame';
			stateGame.bonusCollected = 2;
			stateGame.ladderTier = 0;
			stateGame.mysteryReels = [];
		},
	})}
	{template}
/>
