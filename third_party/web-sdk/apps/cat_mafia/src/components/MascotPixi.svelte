<!--
	Pixi mascot — same screen box / viewport framing as the former HTML SpinePlayer.
	Hat-catch coin fly stays HTML (PawCoinOverlay) using the same box math.
	`duelDog` uses the dog skeleton on the left desk (faces right toward the boards).
-->
<script lang="ts">
	import { Container, SpineProvider } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		isPopoutViewport,
		GAME_ENTRANCE_MS,
		MASCOT_ENTRANCE_DELAY_MS,
		MASCOT_TRANSITION_FADE_MS,
	} from '../game/constants';
	import {
		portraitBuyPanelCanvasTop,
		portraitBuyPanelHeightCanvas,
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
		MASCOT_DOG_SPINE_VIEWPORT,
		MASCOT_SPINE_VIEWPORT,
		type MascotPose,
		type MascotScreenBox,
	} from '../game/mascotHtmlSpine';
	import MascotDogSpineController from './MascotDogSpineController.svelte';
	import MascotGunMuzzleTracker from './MascotGunMuzzleTracker.svelte';
	import MascotSpineController from './MascotSpineController.svelte';
	import BulletFlySpineLayer from './BulletFlySpineLayer.svelte';

	type Props = {
		variant?: 'primary' | 'duelDog';
		zIndex?: number;
	};

	const props: Props = $props();
	const variant = $derived(props.variant ?? 'primary');
	const isDuelDog = $derived(variant === 'duelDog');

	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const isPortrait = $derived(layoutType === 'portrait');

	const showMascotLayout = $derived(
		isDuelDog
			? stateDuel.active &&
					!isPortrait &&
					(layoutType === 'desktop' ||
						layoutType === 'tablet' ||
						layoutType === 'landscape' ||
						isPopout)
			: (layoutType === 'desktop' ||
					layoutType === 'tablet' ||
					layoutType === 'landscape' ||
					isPopout ||
					isPortrait) &&
					!(stateDuel.active && isPortrait),
	);

	const forceCatAnim = $derived(isDuelDog ? null : devPreview.mascotAnimation);
	/** DEV: preview dog clips on the primary (cat) slot — replaces the cat. */
	const forceDogAnim = $derived(isDuelDog ? null : devPreview.mascotDogAnimation);
	const previewDogOnPrimary = $derived(!isDuelDog && forceDogAnim !== null);
	const useDogSpine = $derived(isDuelDog || previewDogOnPrimary);
	/** Gray = basegame; white = freegame / duel — key owned by EnableMascotCatSkinMemory. */
	const catSpineKey = $derived(context.stateGame.mascotCatSpineKey);
	const forceAnim = $derived(forceCatAnim ?? forceDogAnim);
	const mascotAnimToken = $derived(context.stateGame.mascotAnimToken);
	const mounted = $derived(
		gameEntrance.preloadContent &&
			(isDuelDog
				? stateDuel.active &&
					(layoutType === 'desktop' ||
						layoutType === 'tablet' ||
						layoutType === 'landscape' ||
						isPopout)
				: showMascotLayout || forceAnim !== null),
	);

	const pose = $derived.by((): MascotPose => {
		// Duel dog stays on idle flavour (incl. angry_final as a random beat).
		if (isDuelDog) return 'idle';
		return (context.stateGame.mascotPose || 'idle') as MascotPose;
	});
	/** Always 1× — turbo must not speed up mascot clips. */
	const spineTimeScale = 1;

	const box = $derived.by((): MascotScreenBox | null => {
		if (!mounted || !showMascotLayout) {
			if (isDuelDog) return null;
			if (!forceAnim) return null;
		}
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
			return isDuelDog ? getDuelDogMascotBox(duel) : getDuelCatMascotBox(duel);
		}
		if (isDuelDog) return null;

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
				buyPanelTop: portraitBuyPanelCanvasTop(context.stateLayoutDerived),
				buyPanelHeight: portraitBuyPanelHeightCanvas(context.stateLayoutDerived),
			});
		}
		return getMascotScreenBox({ centerX, centerY, halfW, halfH });
	});

	const transform = $derived(
		box
			? getMascotPixiTransform(box, useDogSpine ? MASCOT_DOG_SPINE_VIEWPORT : MASCOT_SPINE_VIEWPORT)
			: null,
	);

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
					? t * t // ease-in out
					: 1 - Math.pow(1 - t, 3); // cubic-out in
			alpha = fadeFrom + (fadeTo - fadeFrom) * eased;
			if (t < 1) fadeRaf = requestAnimationFrame(tick);
			else fadeRaf = 0;
		};
		fadeRaf = requestAnimationFrame(tick);
	};

	const revealed = $derived(
		Boolean(transform) && show && (!isDuelDog || showMascotLayout),
	);
	const hiding = $derived(context.stateGame.transitionActive);
	const shown = $derived(revealed && !hiding);

	$effect(() => {
		if (revealed) entranceDone = true;
	});

	$effect(() => {
		if (shown) {
			runFade(1, GAME_ENTRANCE_MS, entranceDone ? 0 : MASCOT_ENTRANCE_DELAY_MS);
		} else if (hiding || !revealed) {
			runFade(0, hiding ? MASCOT_TRANSITION_FADE_MS : GAME_ENTRANCE_MS);
		}
		return () => cancelFade();
	});
</script>

{#if mounted && transform && (showMascotLayout || forceAnim)}
	<Container
		x={transform.x}
		y={transform.y}
		alpha={alpha}
		zIndex={props.zIndex ?? 5}
		sortableChildren
	>
		<SpineProvider
			key={useDogSpine ? 'mascotDog' : catSpineKey}
			x={transform.spineX}
			y={transform.spineY}
			scale={transform.scale}
			zIndex={0}
		>
			{#if useDogSpine}
				<MascotDogSpineController
					pose={pose}
					forceAnim={forceDogAnim}
					timeScale={spineTimeScale}
				/>
			{:else}
				<MascotSpineController
					pose={pose}
					forceAnim={forceCatAnim}
					timeScale={spineTimeScale}
					animToken={mascotAnimToken}
				/>
				{#if box}
					<MascotGunMuzzleTracker {box} />
				{/if}
				<!-- Mid draw-order: above body, under catching hand. -->
				<BulletFlySpineLayer />
			{/if}
		</SpineProvider>
	</Container>
{/if}
