<!--
	HTML tap targets for mascot meow/bark. Pixi hits sit under the HUD stacking
	context (z44+); on phones those taps never reach the canvas. Same idea as
	duel portrait `.board-face` buttons.
-->
<script lang="ts">
	import { isPopoutViewport } from '../game/constants';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { isBuyBonusFlowOpen } from '../game/isAnyMenuOpen';
	import {
		computeDuelScreenLayout,
		getDuelCatMascotBox,
		getDuelDogMascotBox,
	} from '../game/duelLayout';
	import {
		getMascotPortraitScreenBox,
		getMascotScreenBox,
		getMascotPixiTransform,
		MASCOT_CAT_PRESS,
		MASCOT_DOG_PRESS,
		MASCOT_DOG_SPINE_VIEWPORT,
		MASCOT_SPINE_VIEWPORT,
		spinePressToLocal,
		type MascotScreenBox,
	} from '../game/mascotHtmlSpine';
	import {
		portraitBuyPanelCanvasTop,
		portraitBuyPanelLayoutHeightCanvas,
	} from '../game/portraitHudLayout';
	import { CAT_MEOW_SOUNDS, DOG_BARK_SOUNDS } from '../game/sound';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { getContextLayout } from 'utils-layout';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const isPortrait = $derived(layoutType === 'portrait');
	const menusOpen = $derived(isBuyBonusFlowOpen());

	const showPrimary = $derived(
		gameEntrance.showContent &&
			!menusOpen &&
			(layoutType === 'desktop' ||
				layoutType === 'tablet' ||
				layoutType === 'landscape' ||
				isPopout ||
				isPortrait) &&
			!(stateDuel.active && isPortrait),
	);

	const showDuelDog = $derived(
		gameEntrance.showContent &&
			!menusOpen &&
			stateDuel.active &&
			!isPortrait &&
			(layoutType === 'desktop' ||
				layoutType === 'tablet' ||
				layoutType === 'landscape' ||
				isPopout),
	);

	const primaryBox = $derived.by((): MascotScreenBox | null => {
		if (!showPrimary) return null;
		const canvas = canvasSizes;
		if (stateDuel.active && !isPortrait) {
			const ml = context.stateLayoutDerived.mainLayout();
			const board = context.stateGameDerived.baseBoardLayout();
			const duel = computeDuelScreenLayout({
				canvasWidth: canvas.width,
				canvasHeight: canvas.height,
				layoutType,
				mainLayout: ml,
				boardLayout: board,
			});
			return getDuelCatMascotBox(duel);
		}
		const ml = context.stateLayoutDerived.mainLayout();
		const board = context.stateGameDerived.boardLayout();
		const centerX = ml.x + (board.x - ml.width * 0.5) * ml.scale;
		const centerY = ml.y + (board.y - ml.height * 0.5) * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;
		if (isPortrait) {
			return getMascotPortraitScreenBox({
				canvasWidth: canvas.width,
				boardCenterY: centerY,
				halfH,
				buyPanelTop: portraitBuyPanelCanvasTop(stateLayoutDerived),
				buyPanelHeight: portraitBuyPanelLayoutHeightCanvas(stateLayoutDerived),
			});
		}
		return getMascotScreenBox({ centerX, centerY, halfW, halfH });
	});

	const dogBox = $derived.by((): MascotScreenBox | null => {
		if (!showDuelDog) return null;
		const canvas = canvasSizes;
		const ml = context.stateLayoutDerived.mainLayout();
		const board = context.stateGameDerived.baseBoardLayout();
		const duel = computeDuelScreenLayout({
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			layoutType,
			mainLayout: ml,
			boardLayout: board,
		});
		return getDuelDogMascotBox(duel);
	});

	const pressStyle = (
		box: MascotScreenBox,
		dog: boolean,
	): string => {
		const viewport = dog ? MASCOT_DOG_SPINE_VIEWPORT : MASCOT_SPINE_VIEWPORT;
		const press = dog ? MASCOT_DOG_PRESS : MASCOT_CAT_PRESS;
		const local = spinePressToLocal(box, viewport, press);
		const t = getMascotPixiTransform(box, viewport);
		const cx = t.x + local.x + local.radius;
		const cy = t.y + local.y + local.radius;
		const d = local.radius * 2;
		return `left:${cx}px;top:${cy}px;width:${d}px;height:${d}px`;
	};

	const primaryStyle = $derived(primaryBox ? pressStyle(primaryBox, false) : '');
	const dogStyle = $derived(dogBox ? pressStyle(dogBox, true) : '');

	const PRESS_COOLDOWN_MS = 1000;
	let catVocalIndex = 0;
	let dogVocalIndex = 0;
	let vocalLockedUntil = 0;

	const playVocal = (dog: boolean) => {
		const now = performance.now();
		if (now < vocalLockedUntil) return;
		vocalLockedUntil = now + PRESS_COOLDOWN_MS;
		const bank = dog ? DOG_BARK_SOUNDS : CAT_MEOW_SOUNDS;
		const index = dog ? dogVocalIndex : catVocalIndex;
		const name = bank[index % bank.length];
		if (dog) dogVocalIndex += 1;
		else catVocalIndex += 1;
		context.eventEmitter.broadcast({ type: 'soundOnce', name, forcePlay: true });
	};
</script>

{#if showPrimary || showDuelDog}
	<div
		class="mascot-press-overlay"
		class:in-lift={!gameEntrance.liftComplete}
		aria-hidden="true"
	>
		{#if showPrimary && primaryBox}
			<button
				type="button"
				class="mascot-press-hit"
				style={primaryStyle}
				tabindex="-1"
				aria-label="mascot meow"
				data-test="mascot-press-cat"
				onclick={() => playVocal(false)}
			></button>
		{/if}
		{#if showDuelDog && dogBox}
			<button
				type="button"
				class="mascot-press-hit"
				style={dogStyle}
				tabindex="-1"
				aria-label="mascot bark"
				data-test="mascot-press-dog"
				onclick={() => playVocal(true)}
			></button>
		{/if}
	</div>
{/if}

<style lang="scss">
	.mascot-press-overlay {
		position: fixed;
		inset: 0;
		/* Above HUD (44) / Buy Bonus (45); only the circle captures taps. */
		z-index: 46;
		pointer-events: none;

		&.in-lift {
			position: absolute;
		}
	}

	.mascot-press-hit {
		position: absolute;
		transform: translate(-50%, -50%);
		border: 0;
		padding: 0;
		margin: 0;
		border-radius: 50%;
		background: transparent;
		cursor: pointer;
		pointer-events: auto;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		appearance: none;
		-webkit-appearance: none;
	}
</style>
