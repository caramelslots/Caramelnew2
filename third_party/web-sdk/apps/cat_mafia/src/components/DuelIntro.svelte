<script lang="ts" module>
	export type EmitterEventDuelIntro =
		| { type: 'duelIntroShow' }
		| { type: 'duelIntroHide' }
		| {
				type: 'duelIntroUpdate';
				totalSpinsPerSide: number;
				playerSide?: 'cat' | 'dog';
		  };
</script>

<script lang="ts">
	import { fade } from 'svelte/transition';
	import { OnHotkey } from 'components-shared';
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { isPopoutSmallViewport } from '../game/constants';
	import { BUY_BONUS_ASSETS } from '../game/uiHtmlAssetManifest';
	import DuelPickMascot from './DuelPickMascot.svelte';
	import PressToContinueHtml from './PressToContinueHtml.svelte';

	const context = getContext();

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPortrait = $derived(layoutType === 'portrait');
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));

	let show = $state(false);
	let totalSpinsPerSide = $state(10);
	let playerSide = $state<'cat' | 'dog' | undefined>(undefined);
	let oncomplete = $state(() => {});

	const rule1 = $derived(
		playerSide
			? context.i18nDerived.duelIntroYourSide(
					playerSide === 'cat'
						? context.i18nDerived.duelSideCat()
						: context.i18nDerived.duelSideDog(),
				)
			: context.i18nDerived.duelIntroRule1(),
	);
	const rule2 = $derived(context.i18nDerived.duelIntroRule2(totalSpinsPerSide));
	const rule3 = $derived(context.i18nDerived.duelIntroRule3());
	const title = $derived(context.i18nDerived.duelBonus());

	const dismiss = () => oncomplete();

	context.eventEmitter.subscribeOnMount({
		duelIntroShow: () => {
			context.eventEmitter.broadcast({ type: 'duelPickWarm' });
			show = true;
			stateGame.duelIntroActive = true;
		},
		duelIntroHide: () => {
			show = false;
			stateGame.duelIntroActive = false;
		},
		duelIntroUpdate: async (event) => {
			totalSpinsPerSide = event.totalSpinsPerSide;
			playerSide = event.playerSide;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

{#if show}
	<div
		class="overlay"
		class:portrait={isPortrait}
		class:popout-s={isPopoutSmall}
		data-test="duel-intro-overlay"
		transition:fade={{ duration: 200 }}
		onclick={dismiss}
		onkeydown={(e) => e.key === 'Enter' && dismiss()}
		role="button"
		tabindex="0"
	>
		<div class="content">
			<h1 class="title">{title}</h1>

			<div class="rules">
				<article class="rule">
					<div class="visual pick-visual" aria-hidden="true">
						<span class="mascot-wrap dog">
							<DuelPickMascot species="dog" mirror playing={show} />
						</span>
						<span class="vs-mini">VS</span>
						<span class="mascot-wrap cat">
							<DuelPickMascot playing={show} />
						</span>
					</div>
					<p class="copy">{rule1}</p>
				</article>

				<article class="rule">
					<div class="visual boards-visual" aria-hidden="true">
						<img src={BUY_BONUS_ASSETS.deskL} alt="" draggable="false" class="desk" />
						<span class="vs-mini">VS</span>
						<img src={BUY_BONUS_ASSETS.deskR} alt="" draggable="false" class="desk" />
					</div>
					<p class="copy">{rule2}</p>
				</article>

				<article class="rule">
					<div class="visual win-visual" aria-hidden="true">
						<span class="bank dog-bank">DOG</span>
						<span class="plus">+</span>
						<span class="bank cat-bank">CAT</span>
						<span class="arrow">→</span>
						<span class="trophy">WIN</span>
					</div>
					<p class="copy">{rule3}</p>
				</article>
			</div>
		</div>

		<PressToContinueHtml />
	</div>
{/if}

<OnHotkey hotkey="Space" disabled={!show} onpress={dismiss} />

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		cursor: pointer;
		background: rgba(0, 0, 0, 0.62);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(0.75rem, 2vh, 1.5rem);
	}

	.content {
		width: min(1120px, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1rem, 2.8vh, 2rem);
		pointer-events: none;
	}

	.title {
		margin: 0;
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		font-size: clamp(2rem, 5.5vw, 3.4rem);
		letter-spacing: 0.18em;
		color: #f6e8c8;
		text-shadow:
			0 0 0 #2a1208,
			0 3px 0 #5a3010,
			0 6px 18px rgba(0, 0, 0, 0.55);
		text-transform: uppercase;
	}

	.rules {
		width: 100%;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: clamp(0.75rem, 2vw, 1.35rem);
	}

	.rule {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		padding: clamp(0.65rem, 1.6vw, 1rem);
		border-radius: 14px;
		background: linear-gradient(180deg, rgba(22, 12, 34, 0.72) 0%, rgba(10, 6, 18, 0.55) 100%);
		border: 1px solid rgba(255, 220, 140, 0.22);
		box-shadow: inset 0 1px 0 rgba(255, 240, 200, 0.08);
	}

	.visual {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: clamp(72px, 14vh, 110px);
		width: 100%;
	}

	.copy {
		margin: 0;
		text-align: center;
		font-family: 'Philosopher', Georgia, serif;
		font-size: clamp(0.82rem, 1.55vw, 1rem);
		font-weight: 700;
		line-height: 1.35;
		letter-spacing: 0.04em;
		color: #ffe9a8;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.65);
		text-transform: uppercase;
	}

	.pick-visual {
		gap: 0.35rem;
	}

	.mascot-wrap {
		width: clamp(52px, 9vw, 78px);
		height: clamp(52px, 9vw, 78px);
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid rgba(255, 214, 120, 0.75);
		background: rgba(18, 10, 28, 0.9);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
	}

	.mascot-wrap.dog {
		transform: scaleX(-1);
	}

	.vs-mini {
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		font-size: clamp(0.65rem, 1.2vw, 0.85rem);
		letter-spacing: 0.08em;
		color: #f6e8c8;
		padding: 0.2rem 0.45rem;
		border-radius: 999px;
		background: rgba(20, 12, 30, 0.88);
		border: 1px solid rgba(255, 220, 140, 0.35);
	}

	.boards-visual {
		gap: 0.45rem;
	}

	.desk {
		width: clamp(56px, 10vw, 88px);
		height: auto;
		object-fit: contain;
		filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
		user-select: none;
		pointer-events: none;
	}

	.win-visual {
		gap: 0.28rem;
		flex-wrap: wrap;
		padding-inline: 0.25rem;
	}

	.bank,
	.trophy {
		font-family: 'Reggae One', 'Philosopher', Georgia, serif;
		font-size: clamp(0.62rem, 1.1vw, 0.78rem);
		letter-spacing: 0.06em;
		padding: 0.22rem 0.45rem;
		border-radius: 8px;
		color: #f6e8c8;
		border: 1px solid rgba(255, 220, 140, 0.4);
		background: rgba(20, 12, 30, 0.88);
	}

	.trophy {
		color: #ffe07a;
		border-color: rgba(255, 210, 90, 0.75);
		box-shadow: 0 0 12px rgba(255, 190, 60, 0.25);
	}

	.plus,
	.arrow {
		font-weight: 800;
		color: #ffe9a8;
		font-size: clamp(0.85rem, 1.4vw, 1rem);
	}

	.overlay.portrait .rules {
		grid-template-columns: 1fr;
		max-width: 420px;
		margin-inline: auto;
	}

	.overlay.portrait .title {
		font-size: clamp(1.85rem, 8vw, 2.6rem);
	}

	.overlay.popout-s .title {
		font-size: 1.15rem;
		letter-spacing: 0.12em;
	}

	.overlay.popout-s .copy {
		font-size: 0.55rem;
		line-height: 1.25;
	}

	.overlay.popout-s .visual {
		min-height: 48px;
	}

	.overlay.popout-s .mascot-wrap {
		width: 40px;
		height: 40px;
	}

	.overlay.popout-s .desk {
		width: 42px;
	}
</style>
