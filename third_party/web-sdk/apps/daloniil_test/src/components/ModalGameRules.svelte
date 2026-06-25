<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from 'components-ui-html/src/components/BaseContent.svelte';
	import BaseScrollable from 'components-ui-html/src/components/BaseScrollable.svelte';
	import BaseTitle from 'components-ui-html/src/components/BaseTitle.svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	const gameInfoTitle = $derived(context.i18nDerived.gameInfoTitle());
	const gameInfoSections = $derived(context.i18nDerived.gameInfoSections());
</script>

{#if stateModal.modal?.name === 'gameRules'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="100%">
			<BaseTitle>{gameInfoTitle}</BaseTitle>
			<BaseScrollable type="column">
				<div class="rules" data-test="game-info-scroll">
					{#each gameInfoSections as section (section.title)}
						<section class="section">
							<h3>{section.title}</h3>
							{#each section.body.split('\n') as line, index (section.title + index)}
								<p>{line}</p>
							{/each}
						</section>
					{/each}
				</div>
			</BaseScrollable>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.rules {
		max-width: min(640px, 92vw);
		max-height: 70vh;
		overflow-y: auto;
		text-align: left;
		padding: 0 1rem 1rem;
	}

	.section + .section {
		margin-top: 1.25rem;
	}

	h3 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #ffd51a;
	}

	p {
		margin: 0 0 0.35rem;
		font-size: 0.9rem;
		line-height: 1.5;
		color: #fff;
	}

	p:last-child {
		margin-bottom: 0;
	}
</style>
