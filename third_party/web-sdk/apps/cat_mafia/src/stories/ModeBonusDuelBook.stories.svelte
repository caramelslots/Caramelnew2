<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_BONUS_DUEL/book',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';
	import { randomInteger } from 'utils-shared/random';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { playBet } from '../game/utils';
	import books from './data/books_bonus_duel';

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
	name="random"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const index = randomInteger({ min: 0, max: books.length - 1 });
			const data = books[index];
			console.log('Running a duel book at index', index, 'payout', data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="catWins"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const wins = books.filter((b) => (b.payoutMultiplier ?? 0) > 0);
			const data = wins[randomInteger({ min: 0, max: Math.max(0, wins.length - 1) })] ?? books[0];
			console.log('Duel cat-win book', data.id, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<Story
	name="dogWins"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const loses = books.filter((b) => (b.payoutMultiplier ?? 0) === 0);
			const data = loses[randomInteger({ min: 0, max: Math.max(0, loses.length - 1) })] ?? books[0];
			console.log('Duel dog-win book', data.id, data.payoutMultiplier);
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>
