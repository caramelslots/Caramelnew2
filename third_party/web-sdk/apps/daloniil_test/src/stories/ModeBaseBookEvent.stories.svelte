<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_BASE/bookEvent',
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
	import { playBookEvent, playBookEvents } from '../game/utils';
	import events from './data/base_events';

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
	name="reveal"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.reveal,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="setTotalWin"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.setTotalWin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="freeSpinTrigger"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.freeSpinTrigger,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="updateFreeSpin"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.updateFreeSpin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="winInfo"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.winInfo,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="setWin"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.setWin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="freeSpinEnd"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.freeSpinEnd,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="finalWin"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.finalWin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<!-- === Cash Stacks specific stories === -->

<Story
	name="revealLineWin"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.revealLineWin,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="winInfoVShape"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.winInfoVShape,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="bonusCollect"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.bonusCollect,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="ladderTierUp"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.ladderTierUp,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="mysteryReelActivate"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.mysteryReelActivate,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="mysteryReelActivateX4"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.mysteryReelActivateX4,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="mysteryReveal"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.mysteryReveal,
		action: async (data) => await playBookEvent(data, { bookEvents: [] }),
	})}
	{template}
/>

<Story
	name="mysteryRevealTriple"
	args={templateArgs({
		skipLoadingScreen: true,
		data: events.mysteryRevealTriple[0],
		action: async () => await playBookEvents(events.mysteryRevealTriple),
	})}
	{template}
/>
