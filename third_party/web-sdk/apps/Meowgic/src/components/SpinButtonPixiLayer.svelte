<!--
	HUD spin on main Pixi. Mount only when HUD chrome is actually visible —
	otherwise HTML hides its fallback (pixiReady) while Pixi is still invisible.
-->
<script lang="ts">
	import { Container, SpineProvider, getContextApp } from 'pixi-svelte';
	import { stateUi } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import { isLockedBonusHud } from '../game/activeFeature';
	import { isPopoutSmallViewport } from '../game/constants';
	import { getContext } from '../game/context';
	import { computeDesktopHudLayout, resolveDesktopHudConfig } from '../game/desktopHudLayout';
	import { entranceReveal } from '../game/entranceReveal.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { computePortraitHudCanvas } from '../game/portraitHudLayout';
	import { spinButtonDimmed, spinButtonSpineActive } from '../game/spinButtonPixi.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import SpinButtonSpineController from './SpinButtonSpineController.svelte';

	type Props = {
		zIndex?: number;
	};

	const props: Props = $props();
	const pixiApp = getContextApp();
	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	let uiVisible = $state(true);
	context.eventEmitter.subscribeOnMount({
		uiShow: () => {
			uiVisible = true;
		},
		uiHide: () => {
			uiVisible = false;
		},
	});

	const assetsReady = $derived(Boolean(pixiApp.stateApp.loadedAssets?.spinButton));
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const isPopoutSmall = $derived(isPopoutSmallViewport(stateLayoutDerived.canvasSizes()));
	const isReplay = $derived(stateUi.config.mode === 'replay');
	const hudLocked = $derived(isLockedBonusHud());
	/** Idle: hide Pixi (HTML art on top). Active: full or single 0.45 dim — never stack. */
	const layerAlpha = $derived(
		!spinButtonSpineActive.value ? 0 : spinButtonDimmed.value ? 0.45 : 1,
	);

	/** Same reveal window as CashStacks*HudOverlay spin control. */
	const hudChromeVisible = $derived(
		gameEntrance.showContent &&
			gameEntrance.liftComplete &&
			uiVisible &&
			!stateGame.fsOutroActive &&
			!(entranceReveal.driving && !entranceReveal.menuPhase),
	);

	const show = $derived(assetsReady && hudChromeVisible && !hudLocked && !isReplay);

	const spinPos = $derived.by(() => {
		if (isPortrait) {
			const hud = computePortraitHudCanvas(stateLayoutDerived, {
				hideAutoplay: hudLocked || isReplay,
			});
			return {
				x: hud.spin.centerX,
				y: hud.spin.centerY + hud.spin.raiseY,
				size: hud.spin.size,
			};
		}
		const pos = computeDesktopHudLayout(
			stateLayoutDerived,
			resolveDesktopHudConfig(isPopoutSmall),
			{ hideAutoplay: hudLocked || isReplay },
		);
		return { x: pos.spin.x, y: pos.spin.y, size: pos.spin.size };
	});

	const layerZ = $derived(props.zIndex ?? 7);
</script>

{#if show}
	<Container
		x={spinPos.x}
		y={spinPos.y}
		zIndex={layerZ}
		alpha={layerAlpha}
		sortableChildren={false}
	>
		<SpineProvider key="spinButton" height={spinPos.size} x={0} y={0}>
			<SpinButtonSpineController />
		</SpineProvider>
	</Container>
{/if}
