<script lang="ts">
	// https://lingui.dev/installation#vite
	// https://lingui.dev/tutorials/javascript
	// https://lingui.dev/ref/vite-plugin

	import { stateI18nDerived } from 'state-shared';

	import { onMount, type Snippet } from 'svelte';

	import { stateUrlDerived, type Language } from 'state-shared';
	import type { MessagesMap } from 'utils-shared/i18n';

	type Props = {
		debug?: boolean;
		children: Snippet;
		messagesMap: MessagesMap;
	};

	const props: Props = $props();

	let loaded = $state(false);

	const loadMessages = (lang: Language) => {
		const messages = props.messagesMap[lang];
		if (props.debug) console.log({ messages });
		return messages;
	};

	const resolveLangAndMessages = () => {
		const requested = stateUrlDerived.lang();
		const messages = loadMessages(requested);
		if (messages) return { lang: requested, messages };

		console.warn(`Unsupported or missing locale messages for "${requested}", falling back to "en"`);
		return { lang: 'en' as Language, messages: loadMessages('en') };
	};

	onMount(() => {
		try {
			const { lang, messages } = resolveLangAndMessages();
			stateI18nDerived.init(lang, messages);
		} catch (error) {
			console.error("Loading fallback locale 'en' because of error", error);
			try {
				const messages = loadMessages('en');
				stateI18nDerived.init('en', messages);
			} catch (error) {
				console.error("Loading fallback locale 'en' without any messages because of error", error);
				stateI18nDerived.init('en', {});
			}
		}
		loaded = true;
	});
</script>

{#if loaded}
	{@render props.children()}
{/if}
