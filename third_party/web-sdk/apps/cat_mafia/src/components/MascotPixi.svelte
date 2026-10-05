<!--
	Pixi mascots — cat (always) + dog (duel flanking only when stateDuel.active).
	Both share one alpha so they reveal together after the cat skin swap under steam.
	Dog faces the same way as before (no CSS/Pixi mirror — spine art already oriented).
-->
<script lang="ts">
	import { Circle, Polygon } from 'pixi.js';
	import { Container, Rectangle, SpineProvider, getContextApp } from 'pixi-svelte';

	import { CAT_MEOW_SOUNDS, DOG_BARK_SOUNDS } from '../game/sound';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { isBuyBonusFlowOpen } from '../game/isAnyMenuOpen';
	import {
		isPopoutViewport,
		GAME_ENTRANCE_MS,
		MASCOT_ENTRANCE_DELAY_MS,
		MASCOT_TRANSITION_FADE_MS,
	} from '../game/constants';
	import {
		portraitBuyPanelCanvasTop,
		portraitBuyPanelLayoutHeightCanvas,
	} from '../game/portraitHudLayout';
	import { devPreview } from '../game/devPreview.svelte';
	import { stateDuel } from '../game/stateDuel.svelte';
	import {
		computeDuelScreenLayout,
		getDuelCatMascotBox,
		getDuelDogMascotBox,
	} from '../game/duelLayout';
	import {
		getMascotPortraitScreenBox,
		getMascotScreenBox,
		getMascotPixiTransform,
		MASCOT_CAT_PRESS_POLY,
		MASCOT_DOG_PRESS,
		MASCOT_DOG_SPINE_VIEWPORT,
		MASCOT_SPINE_VIEWPORT,
		spinePressPolyToLocal,
		spinePressToLocal,
		type MascotPose,
		type MascotScreenBox,
	} from '../game/mascotHtmlSpine';
	import MascotDogSpineController from './MascotDogSpineController.svelte';
	import MascotGunMuzzleTracker from './MascotGunMuzzleTracker.svelte';
	import MascotSpineController from './MascotSpineController.svelte';
	import BulletFlySpineLayer from './BulletFlySpineLayer.svelte';

	type Props = {
		zIndex?: number;
	};

	const props: Props = $props();

	const pixiApp = getContextApp();
	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const isPortrait = $derived(layoutType === 'portrait');
	const landscapeSlot = $derived(
		layoutType === 'desktop' ||
			layoutType === 'tablet' ||
			layoutType === 'landscape' ||
			isPopout,
	);

	/**
	 * Dog + duel cat seat — only when duel is live (same beat as white-cat skin swap).
	 * Do NOT key off transitionActive alone — that moved the cat too early.
	 * Prebuild mounts the dog off-alpha so the steam clip does not construct it.
	 */
	const duelFlanking = $derived(stateDuel.active && !isPortrait && landscapeSlot);
	const duelDogWarm = $derived(
		(stateDuel.active || stateDuel.prebuild) && !isPortrait && landscapeSlot,
	);

	const showCatLayout = $derived(
		(landscapeSlot || isPortrait) && !(stateDuel.active && isPortrait),
	);

	const forceCatAnim = $derived(devPreview.mascotAnimation);
	const forceDogAnim = $derived(devPreview.mascotDogAnimation);
	const previewDogOnPrimary = $derived(forceDogAnim !== null && !duelFlanking);

	const catSpineKey = $derived(context.stateGame.mascotCatSpineKey);
	const primarySpineKey = $derived(previewDogOnPrimary ? 'mascotDog' : catSpineKey);
	const catAssetsReady = $derived(Boolean(pixiApp.stateApp.loadedAssets?.[primarySpineKey]));
	const dogAssetsReady = $derived(Boolean(pixiApp.stateApp.loadedAssets?.mascotDog));

	const mascotAnimToken = $derived(context.stateGame.mascotAnimToken);
	const mounted = $derived(gameEntrance.preloadContent && (showCatLayout || forceCatAnim !== null));

	const pose = $derived((context.stateGame.mascotPose || 'idle') as MascotPose);
	const spineTimeScale = 1;
	const idlePaused = $derived(isBuyBonusFlowOpen());
	const mascotAutoUpdate = $derived(!idlePaused);
	const mascotTimeScale = $derived(idlePaused ? 0 : spineTimeScale);

	const duelLayoutBoxes = $derived.by(() => {
		if (!duelDogWarm) return null;
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
		return {
			cat: getDuelCatMascotBox(duel),
			dog: getDuelDogMascotBox(duel),
		};
	});

	const catBox = $derived.by((): MascotScreenBox | null => {
		if (!mounted || !showCatLayout) {
			if (!forceCatAnim && !previewDogOnPrimary) return null;
		}
		if (duelFlanking && duelLayoutBoxes) return duelLayoutBoxes.cat;

		const ml = context.stateLayoutDerived.mainLayout();
		const board = context.stateGameDerived.boardLayout();
		const centerX = ml.x + (board.x - ml.width * 0.5) * ml.scale;
		const centerY = ml.y + (board.y - ml.height * 0.5) * ml.scale;
		const halfW = (board.visualWidth / 2) * ml.scale;
		const halfH = (board.visualHeight / 2) * ml.scale;

		if (isPortrait) {
			return getMascotPortraitScreenBox({
				canvasWidth: canvasSizes.width,
				boardCenterY: centerY,
				halfH,
				buyPanelTop: portraitBuyPanelCanvasTop(context.stateLayoutDerived),
				buyPanelHeight: portraitBuyPanelLayoutHeightCanvas(context.stateLayoutDerived),
			});
		}
		return getMascotScreenBox({ centerX, centerY, halfW, halfH });
	});

	const dogBox = $derived.by((): MascotScreenBox | null => {
		if (!duelDogWarm || !dogAssetsReady) return null;
		return duelLayoutBoxes?.dog ?? null;
	});

	const catTransform = $derived(
		catBox
			? getMascotPixiTransform(
					catBox,
					previewDogOnPrimary ? MASCOT_DOG_SPINE_VIEWPORT : MASCOT_SPINE_VIEWPORT,
				)
			: null,
	);
	const dogTransform = $derived(
		dogBox ? getMascotPixiTransform(dogBox, MASCOT_DOG_SPINE_VIEWPORT) : null,
	);

	/** In duel, hide both until dog + white cat are drawable — then one shared fade. */
	const duelPairReady = $derived(
		!duelFlanking ||
			(Boolean(catAssetsReady) &&
				Boolean(dogAssetsReady) &&
				catTransform != null &&
				dogTransform != null),
	);

	const PRESS_COOLDOWN_MS = 1000;

	const catPressHit = $derived.by(() => {
		if (!catBox || previewDogOnPrimary) return null;
		const poly = spinePressPolyToLocal(catBox, MASCOT_SPINE_VIEWPORT, MASCOT_CAT_PRESS_POLY);
		return {
			x: poly.x,
			y: poly.y,
			width: poly.width,
			height: poly.height,
			borderRadius: 0,
			hitArea: new Polygon(poly.hitFlat),
		};
	});

	const dogPressHit = $derived.by(() => {
		if (!duelFlanking || !dogBox) return null;
		const circle = spinePressToLocal(dogBox, MASCOT_DOG_SPINE_VIEWPORT, MASCOT_DOG_PRESS);
		return {
			x: circle.x,
			y: circle.y,
			width: circle.width,
			height: circle.height,
			borderRadius: circle.radius,
			hitArea: new Circle(circle.radius, circle.radius, circle.radius),
		};
	});

	const previewDogPressHit = $derived.by(() => {
		if (!catBox || !previewDogOnPrimary) return null;
		const circle = spinePressToLocal(catBox, MASCOT_DOG_SPINE_VIEWPORT, MASCOT_DOG_PRESS);
		return {
			x: circle.x,
			y: circle.y,
			width: circle.width,
			height: circle.height,
			borderRadius: circle.radius,
			hitArea: new Circle(circle.radius, circle.radius, circle.radius),
		};
	});

	let vocalIndex = 0;
	let vocalLockedUntil = 0;

	const onVocalPress = (dog: boolean) => {
		const now = performance.now();
		if (now < vocalLockedUntil) return;
		vocalLockedUntil = now + PRESS_COOLDOWN_MS;
		const bank = dog ? DOG_BARK_SOUNDS : CAT_MEOW_SOUNDS;
		const name = bank[vocalIndex % bank.length];
		vocalIndex += 1;
		context.eventEmitter.broadcast({ type: 'soundOnce', name, forcePlay: true });
	};

	let entranceDone = $state(false);
	let alpha = $state(0);
	let fadeRaf = 0;
	let fadeStart = 0;
	let fadeFrom = 0;
	let fadeTo = 0;
	let fadeDur = 0;
	let fadeDelay = 0;

	const cancelFade = () => {
		if (fadeRaf) cancelAnimationFrame(fadeRaf);
		fadeRaf = 0;
	};

	const runFade = (to: number, durationMs: number, delayMs = 0) => {
		cancelFade();
		fadeFrom = alpha;
		fadeTo = to;
		fadeDur = Math.max(1, durationMs);
		fadeDelay = delayMs;
		fadeStart = performance.now();
		const tick = (now: number) => {
			const elapsed = now - fadeStart - fadeDelay;
			if (elapsed < 0) {
				fadeRaf = requestAnimationFrame(tick);
				return;
			}
			const t = Math.min(1, elapsed / fadeDur);
			const eased =
				fadeTo < fadeFrom
					? t * t
					: 1 - Math.pow(1 - t, 3);
			alpha = fadeFrom + (fadeTo - fadeFrom) * eased;
			if (t < 1) fadeRaf = requestAnimationFrame(tick);
			else fadeRaf = 0;
		};
		fadeRaf = requestAnimationFrame(tick);
	};

	const revealed = $derived(Boolean(catTransform) && show && showCatLayout);
	const hiding = $derived(context.stateGame.transitionActive);
	const shown = $derived(revealed && !hiding && duelPairReady);

	$effect(() => {
		if (revealed) entranceDone = true;
	});

	$effect(() => {
		stateDuel.dogMascotReady = Boolean(duelFlanking && dogAssetsReady && dogTransform);
		return () => {
			stateDuel.dogMascotReady = false;
		};
	});

	$effect(() => {
		if (shown) {
			runFade(1, GAME_ENTRANCE_MS, entranceDone ? 0 : MASCOT_ENTRANCE_DELAY_MS);
		} else {
			runFade(0, hiding ? MASCOT_TRANSITION_FADE_MS : GAME_ENTRANCE_MS);
		}
		return () => cancelFade();
	});
</script>

{#if mounted && catTransform && (showCatLayout || forceCatAnim) && catAssetsReady && duelPairReady}
	<Container
		x={catTransform.x}
		y={catTransform.y}
		alpha={alpha}
		zIndex={props.zIndex ?? 5}
		sortableChildren
	>
		{#if catPressHit}
			<Rectangle
				x={catPressHit.x}
				y={catPressHit.y}
				width={catPressHit.width}
				height={catPressHit.height}
				borderRadius={catPressHit.borderRadius}
				backgroundAlpha={0.001}
				hitArea={catPressHit.hitArea}
				eventMode="static"
				cursor="pointer"
				zIndex={2}
				onpointertap={() => onVocalPress(false)}
			/>
		{:else if previewDogPressHit}
			<Rectangle
				x={previewDogPressHit.x}
				y={previewDogPressHit.y}
				width={previewDogPressHit.width}
				height={previewDogPressHit.height}
				borderRadius={previewDogPressHit.borderRadius}
				backgroundAlpha={0.001}
				hitArea={previewDogPressHit.hitArea}
				eventMode="static"
				cursor="pointer"
				zIndex={2}
				onpointertap={() => onVocalPress(true)}
			/>
		{/if}
		<SpineProvider
			key={primarySpineKey}
			x={catTransform.spineX}
			y={catTransform.spineY}
			scale={catTransform.scale}
			zIndex={0}
			autoUpdate={mascotAutoUpdate}
		>
			{#if previewDogOnPrimary}
				<MascotDogSpineController
					pose="idle"
					forceAnim={forceDogAnim}
					timeScale={mascotTimeScale}
					paused={idlePaused}
				/>
			{:else}
				<MascotSpineController
					pose={pose}
					forceAnim={forceCatAnim}
					timeScale={mascotTimeScale}
					animToken={mascotAnimToken}
					paused={idlePaused}
				/>
				{#if catBox}
					<MascotGunMuzzleTracker box={catBox} />
				{/if}
				<BulletFlySpineLayer />
			{/if}
		</SpineProvider>
	</Container>
{/if}

{#if mounted && dogTransform && dogAssetsReady && (duelFlanking ? duelPairReady : stateDuel.prebuild)}
	<!-- Same alpha as cat once the duel is live; invisible while prebuilding.
	     No mirror — matches prior Pixi orientation. -->
	<Container
		x={dogTransform.x + (duelFlanking ? 0 : -40000)}
		y={dogTransform.y}
		alpha={duelFlanking ? alpha : 0}
		zIndex={props.zIndex ?? 5}
		sortableChildren
	>
		{#if dogPressHit}
			<Rectangle
				x={dogPressHit.x}
				y={dogPressHit.y}
				width={dogPressHit.width}
				height={dogPressHit.height}
				borderRadius={dogPressHit.borderRadius}
				backgroundAlpha={0.001}
				hitArea={dogPressHit.hitArea}
				eventMode="static"
				cursor="pointer"
				zIndex={2}
				onpointertap={() => onVocalPress(true)}
			/>
		{/if}
		<SpineProvider
			key="mascotDog"
			x={dogTransform.spineX}
			y={dogTransform.spineY}
			scale={dogTransform.scale}
			zIndex={0}
			autoUpdate={mascotAutoUpdate}
		>
			<MascotDogSpineController
				pose="idle"
				forceAnim={null}
				timeScale={mascotTimeScale}
				paused={idlePaused}
			/>
		</SpineProvider>
	</Container>
{/if}
