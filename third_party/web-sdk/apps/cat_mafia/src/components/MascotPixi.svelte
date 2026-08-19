<!--
	Pixi mascot — same screen box / viewport framing as the former HTML SpinePlayer.
	Hat-catch coin fly stays HTML (PawCoinOverlay) using the same box math.
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
		type MascotPose,
		type MascotScreenBox,
	} from '../game/mascotHtmlSpine';
	import { gameSpeedMultFor } from '../game/gameSpeed';
	import MascotSpineController from './MascotSpineController.svelte';

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

	const forceAnim = $derived(isDuelDog ? null : devPreview.mascotAnimation);
	const mounted = $derived(
		gameEntrance.preloadContent &&
			(isDuelDog
				? layoutType === 'desktop' ||
					layoutType === 'tablet' ||
					layoutType === 'landscape' ||
					isPopout
				: showMascotLayout || forceAnim !== null),
	);

	const pose = $derived(
		(context.stateGame.bulletFly ? 'load' : context.stateGame.mascotPose || 'idle') as MascotPose,
	);
	const spineTimeScale = $derived(gameSpeedMultFor(context.stateGame.gameSpeed));

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

	const transform = $derived(box ? getMascotPixiTransform(box) : null);

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
		scale={{ x: isDuelDog ? -1 : 1, y: 1 }}
		alpha={alpha}
		zIndex={props.zIndex ?? 5}
		sortableChildren
	>
		<SpineProvider
			key="mascotCat"
			x={transform.spineX}
			y={transform.spineY}
			scale={transform.scale}
			zIndex={0}
		>
			<MascotSpineController pose={pose} forceAnim={forceAnim} timeScale={spineTimeScale} />
		</SpineProvider>
	</Container>
{/if}
