<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from 'components-ui-html/src/components/BaseContent.svelte';
	import BaseScrollable from 'components-ui-html/src/components/BaseScrollable.svelte';
	import BaseTitle from 'components-ui-html/src/components/BaseTitle.svelte';

	import { getContext } from '../game/context';
	import { HUD_BALANCE_BET_FONT_FAMILY } from '../game/constants';
	import { AUTOSPIN_ASSETS } from '../game/uiHtmlAssetManifest';
	import {
		GAME_INFO_MYSTERY_BG_IMAGE,
		GAME_INFO_PAYING_SYMBOL_IDS,
		GAME_INFO_SYMBOL_IMAGES,
		getSymbolPayRows,
		type GameInfoSymbolId,
	} from '../game/gameInfoSymbols';
	import {
		getGameInfoControlRows,
		type GameInfoControlOverlay,
	} from '../game/gameInfoControls';
	import GameInfoPaylinesGrid from './GameInfoPaylinesGrid.svelte';

	const context = getContext();

	const fontFamily = HUD_BALANCE_BET_FONT_FAMILY;
	const closeIconUrl = AUTOSPIN_ASSETS.close;

	const gameInfoTitle = $derived(context.i18nDerived.gameInfoTitle());
	const gameInfoSections = $derived(context.i18nDerived.gameInfoSections());
	const specialSymbolsTitle = $derived(context.i18nDerived.gameInfoSpecialSymbolsTitle());
	const paylinesTitle = $derived(context.i18nDerived.gameInfoPaylinesTitle());
	const paylinesNote = $derived(context.i18nDerived.gameInfoPaylinesNote());
	const paytableTitle = $derived(context.i18nDerived.gameInfoPaytableTitle());
	const paytableNote = $derived(context.i18nDerived.gameInfoPaytableNote());
	const progressLadderTitle = $derived(context.i18nDerived.gameInfoProgressLadderTitle());
	const progressLadderBody = $derived(context.i18nDerived.gameInfoProgressLadderBody());
	const controlsTitle = $derived(context.i18nDerived.gameInfoControlsTitle());
	const controlOverlayLabels = $derived({
		buyBonus: context.i18nDerived.buyBonusPanelButton(),
		bonusBoost: context.i18nDerived.bonusBoost(),
		autoplay: context.i18nDerived.autoplayTitle(),
	} satisfies Record<GameInfoControlOverlay, string>);
	const controlRowsByTitle = $derived.by(() => {
		const controlsSection = gameInfoSections.find((section) => section.title === controlsTitle);
		return controlsSection ? getGameInfoControlRows(controlsSection.body) : [];
	});

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
	<Popup zIndex={zIndex.modal} {closeIconUrl} onclose={() => (stateModal.modal = null)}>
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
								<h3>{paylinesTitle}</h3>
								<p class="paytable-note">{paylinesNote}</p>
								<GameInfoPaylinesGrid />
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
								<h3>{progressLadderTitle}</h3>
								{#each progressLadderBody.split('\n') as line, index ('progress-ladder' + index)}
									<p>{line}</p>
								{/each}
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
						{:else if section.title === controlsTitle}
							<section class="section">
								<h3>{section.title}</h3>
								<div class="controls-list">
									{#each controlRowsByTitle as row (row.id)}
										<article class="control-row">
											<div
												class="control-icons"
												class:control-icons-wide={row.wide}
												aria-hidden={row.icons.length > 0 ? 'true' : undefined}
											>
												{#each row.icons as icon, iconIndex (row.id + iconIndex)}
													{#if row.overlay && iconIndex === 0}
														<div
															class="control-icon-badge"
															class:control-icon-badge-wide={row.wide}
															style:background-image="url('{icon}')"
														>
															<span class="control-icon-text">
																{controlOverlayLabels[row.overlay]}
															</span>
														</div>
													{:else}
														<img
															class="control-icon"
															class:control-icon-wide={row.wide}
															src={icon}
															alt=""
															loading="lazy"
															decoding="async"
														/>
													{/if}
												{/each}
												{#if row.showLabel && row.label}
													<span class="control-label">{row.label}</span>
												{/if}
											</div>
											<p>{row.description}</p>
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
	@import url('https://fonts.googleapis.com/css2?family=Philosopher:wght@700&family=Reggae+One&display=swap');

	:global(.pop-up-wrap) {
		font-family: v-bind(fontFamily);
	}

	:global(.ui-modal-title-wrap) {
		font-family: v-bind(fontFamily);
		font-size: 1.15rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #ffd54a;
		text-shadow:
			0 0 8px rgba(255, 196, 48, 0.45),
			0 1px 0 rgba(92, 58, 8, 0.75),
			0 2px 6px rgba(0, 0, 0, 0.7);
	}

	.rules {
		max-width: min(860px, 94vw);
		max-height: 70vh;
		overflow-y: auto;
		text-align: left;
		padding: 0 1rem 1rem;
		font-family: v-bind(fontFamily);
	}

	.section + .section {
		margin-top: 1.25rem;
	}

	h3 {
		margin: 0 0 0.5rem;
		font-size: 0.95rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #ffd54a;
		text-shadow:
			0 0 8px rgba(255, 196, 48, 0.45),
			0 1px 0 rgba(92, 58, 8, 0.75),
			0 2px 6px rgba(0, 0, 0, 0.7);
	}

	h4 {
		margin: 0 0 0.35rem;
		font-size: 0.85rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #ffd54a;
		text-shadow:
			0 0 8px rgba(255, 196, 48, 0.45),
			0 1px 0 rgba(92, 58, 8, 0.75),
			0 2px 6px rgba(0, 0, 0, 0.7);
	}

	p {
		margin: 0 0 0.35rem;
		font-size: 0.9rem;
		line-height: 1.5;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: #fff8ec;
		text-shadow:
			0 0 8px rgba(255, 196, 96, 0.28),
			0 1px 5px rgba(0, 0, 0, 0.85);
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

	.controls-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.control-row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.65rem 0.75rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.06);
	}

	.control-row p {
		flex: 1;
		min-width: 0;
		margin: 0;
	}

	.control-icons {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		flex-shrink: 0;
		min-width: 52px;
		min-height: 44px;
	}

	.control-icons-wide {
		min-width: 96px;
	}

	.control-icon {
		width: 44px;
		height: 44px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.control-icons:has(.control-icon + .control-icon) .control-icon:not(.control-icon-wide) {
		width: 36px;
		height: 36px;
	}

	.control-icon-wide {
		width: 96px;
		height: 44px;
	}

	.control-icon-badge {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 96px;
		height: 40px;
		flex-shrink: 0;
		background-position: center;
		background-repeat: no-repeat;
		background-size: 100% 100%;
	}

	.control-icon-badge-wide {
		width: 108px;
		height: 44px;
	}

	.control-icon-text {
		padding: 0 0.35rem;
		color: #fff;
		font-family: 'proxima-nova', Arial, sans-serif;
		font-size: 0.62rem;
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: 0.02em;
		text-align: center;
		text-transform: uppercase;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
		pointer-events: none;
		user-select: none;
	}

	.control-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		min-width: 7.5rem;
		min-height: 2.25rem;
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		border: 1px solid rgba(255, 213, 74, 0.45);
		background: rgba(0, 0, 0, 0.35);
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #ffd54a;
		text-shadow:
			0 0 8px rgba(255, 196, 48, 0.45),
			0 1px 0 rgba(92, 58, 8, 0.75);
		white-space: nowrap;
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
		font-weight: 700;
		color: #fff8ec;
		text-shadow:
			0 0 8px rgba(255, 196, 96, 0.28),
			0 1px 5px rgba(0, 0, 0, 0.85);
	}

	.pay-count {
		min-width: 0.75rem;
		text-align: right;
		font-weight: 800;
	}

	.pay-separator {
		opacity: 0.45;
	}

	.pay-value {
		min-width: 2.5rem;
		text-align: left;
		font-weight: 800;
		color: #ffd54a;
		text-shadow:
			0 0 8px rgba(255, 196, 48, 0.45),
			0 1px 0 rgba(92, 58, 8, 0.75),
			0 2px 6px rgba(0, 0, 0, 0.7);
	}

	@media (max-width: 560px) {
		:global(.ui-modal-title-wrap) {
			font-size: 1.35rem;
		}

		h3 {
			font-size: 1.05rem;
		}

		h4 {
			font-size: 0.95rem;
		}

		p {
			font-size: 1rem;
		}

		.paytable-note {
			font-size: 1rem;
		}

		.symbol-image {
			width: 84px;
			height: 84px;
		}

		.mystery-symbol {
			width: 84px;
			height: 84px;
		}

		.pay-symbol-image {
			width: 80px;
			height: 80px;
		}

		.pay-card:last-child:nth-child(odd) .pay-symbol-image {
			width: 96px;
			height: 96px;
		}

		.pay-rows li {
			font-size: 1.05rem;
			line-height: 1.45;
		}

		.paytable-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.pay-card:last-child:nth-child(odd) {
			grid-column: 1 / -1;
		}

		.special-card {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.control-row {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.control-icon {
			width: 52px;
			height: 52px;
		}

		.control-icon-wide {
			width: 112px;
			height: 52px;
		}

		.control-icon-badge,
		.control-icon-badge-wide {
			width: 120px;
			height: 50px;
		}

		.control-icon-text {
			font-size: 0.72rem;
		}

		.control-label {
			min-width: 9.5rem;
			min-height: 2.75rem;
			padding: 0.5rem 1rem;
			font-size: 1.05rem;
			letter-spacing: 0.08em;
		}
	}
</style>
