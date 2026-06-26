<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from 'components-ui-html/src/components/BaseContent.svelte';
	import BaseScrollable from 'components-ui-html/src/components/BaseScrollable.svelte';
	import BaseTitle from 'components-ui-html/src/components/BaseTitle.svelte';

	import { getContext } from '../game/context';
	import {
		GAME_INFO_MYSTERY_BG_IMAGE,
		GAME_INFO_PAYING_SYMBOL_IDS,
		GAME_INFO_SYMBOL_IMAGES,
		getSymbolPayRows,
		type GameInfoSymbolId,
	} from '../game/gameInfoSymbols';

	const context = getContext();

	const gameInfoTitle = $derived(context.i18nDerived.gameInfoTitle());
	const gameInfoSections = $derived(context.i18nDerived.gameInfoSections());
	const specialSymbolsTitle = $derived(context.i18nDerived.gameInfoSpecialSymbolsTitle());
	const paytableTitle = $derived(context.i18nDerived.gameInfoPaytableTitle());
	const paytableNote = $derived(context.i18nDerived.gameInfoPaytableNote());

	const specialSymbolCopy: Record<
		Extract<GameInfoSymbolId, 'B' | 'W' | 'M'>,
		{ title: () => string; body: () => string }
	> = {
		B: {
			title: () => context.i18nDerived.gameInfoBonusSymbolTitle(),
			body: () => context.i18nDerived.gameInfoFsBody(),
		},
		W: {
			title: () => context.i18nDerived.gameInfoWildTitle(),
			body: () => context.i18nDerived.gameInfoWildBody(),
		},
		M: {
			title: () => context.i18nDerived.gameInfoMysteryTitle(),
			body: () => context.i18nDerived.gameInfoMysteryBody(),
		},
	};

	const specialSymbols = $derived(
		(['B', 'W', 'M'] as const).map((id) => ({
			id,
			image: GAME_INFO_SYMBOL_IMAGES[id],
			title: specialSymbolCopy[id].title(),
			body: specialSymbolCopy[id].body(),
		})),
	);

	const payingSymbols = $derived(
		GAME_INFO_PAYING_SYMBOL_IDS.map((id) => ({
			id,
			image: GAME_INFO_SYMBOL_IMAGES[id],
			payRows: getSymbolPayRows(id),
		})),
	);

	const formatMultiplier = (value: number) => String(value);
</script>

{#if stateModal.modal?.name === 'gameRules'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="100%">
			<BaseTitle>{gameInfoTitle}</BaseTitle>
			<BaseScrollable type="column">
				<div class="rules" data-test="game-info-scroll">
					{#each gameInfoSections as section, sectionIndex (section.title)}
						{#if sectionIndex === 0}
							<section class="section">
								<h3>{section.title}</h3>
								{#each section.body.split('\n') as line, index (section.title + index)}
									<p>{line}</p>
								{/each}
							</section>

							<section class="section">
								<h3>{specialSymbolsTitle}</h3>
								<div class="special-symbols">
									{#each specialSymbols as symbol (symbol.id)}
										<article class="special-card">
											{#if symbol.id === 'M'}
												<div class="mystery-symbol" aria-hidden="true">
													<img
														class="symbol-image mystery-bg"
														src={GAME_INFO_MYSTERY_BG_IMAGE}
														alt=""
														loading="lazy"
														decoding="async"
													/>
													<img
														class="symbol-image mystery-sign"
														src={symbol.image}
														alt={symbol.title}
														loading="lazy"
														decoding="async"
													/>
												</div>
											{:else}
												<img
													class="symbol-image"
													src={symbol.image}
													alt={symbol.title}
													loading="lazy"
													decoding="async"
												/>
											{/if}
											<div class="special-copy">
												<h4>{symbol.title}</h4>
												{#each symbol.body.split('\n') as line, index (symbol.id + index)}
													<p>{line}</p>
												{/each}
											</div>
										</article>
									{/each}
								</div>
							</section>

							<section class="section">
								<h3>{paytableTitle}</h3>
								<p class="paytable-note">{paytableNote}</p>
								<div class="paytable-grid">
									{#each payingSymbols as symbol (symbol.id)}
										<article class="pay-card">
											<img
												class="symbol-image pay-symbol-image"
												src={symbol.image}
												alt={symbol.id}
												loading="lazy"
												decoding="async"
											/>
											{#if symbol.payRows.length > 0}
												<ul class="pay-rows">
													{#each symbol.payRows as row (symbol.id + row.count)}
														<li>
															<span class="pay-count">{row.count}</span>
															<span class="pay-separator">|</span>
															<span class="pay-value">{formatMultiplier(row.multiplier)}×</span>
														</li>
													{/each}
												</ul>
											{/if}
										</article>
									{/each}
								</div>
							</section>
						{:else}
							<section class="section">
								<h3>{section.title}</h3>
								{#each section.body.split('\n') as line, index (section.title + index)}
									<p>{line}</p>
								{/each}
							</section>
						{/if}
					{/each}
				</div>
			</BaseScrollable>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.rules {
		max-width: min(720px, 92vw);
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

	h4 {
		margin: 0 0 0.35rem;
		font-size: 0.85rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.03em;
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

	.paytable-note {
		margin-bottom: 0.75rem;
		opacity: 0.85;
		font-size: 0.82rem;
	}

	.special-symbols {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.special-card {
		display: flex;
		align-items: flex-start;
		gap: 0.85rem;
		padding: 0.75rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.06);
	}

	.special-copy {
		flex: 1;
		min-width: 0;
	}

	.paytable-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.pay-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		padding: 0.65rem 0.45rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.06);
	}

	.symbol-image {
		width: 72px;
		height: 72px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.mystery-symbol {
		position: relative;
		width: 72px;
		height: 72px;
		flex-shrink: 0;
	}

	.mystery-bg,
	.mystery-sign {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.mystery-sign {
		z-index: 1;
	}

	.pay-symbol-image {
		width: 64px;
		height: 64px;
	}

	.pay-rows {
		list-style: none;
		margin: 0;
		padding: 0;
		width: 100%;
	}

	.pay-rows li {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		font-size: 0.82rem;
		line-height: 1.35;
		color: #fff;
	}

	.pay-count {
		min-width: 0.75rem;
		text-align: right;
		font-weight: 700;
	}

	.pay-separator {
		opacity: 0.45;
	}

	.pay-value {
		min-width: 2.5rem;
		text-align: left;
		font-weight: 700;
		color: #ffd51a;
	}

	@media (max-width: 560px) {
		.paytable-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.special-card {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
	}
</style>
