<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import Lantern from './Lantern.svelte';

	const context = getContext();

	// Source artwork dimensions (designer_assets/d1.jpg, n1.jpg). Both are
	// 1920×940, so cover-fit math is shared.
	const BG_RATIO = 1920 / 940;

	// Vertical offset (fraction of canvas height) applied on top of the
	// centred cover-fit. New artwork is composed around the centre, so no
	// vertical shift is needed.
	const BG_Y_OFFSET = 0;

	// Lantern composition (fractions of the canvas size). Both lanterns are
	// suspended from the top edge and sized as a fraction of canvas height,
	// so they scale with the layout instead of being absolute pixels.
	const LANTERN_HEIGHT_RATIO = 0.42;
	const LANTERN_TOP_RATIO = -0.04;
	const LANTERN_LEFT_RATIO = 0.11;
	const LANTERN_RIGHT_RATIO = 0.92;

	const cover = (ratio: number) => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		const canvasRatio = canvas.width / canvas.height;
		if (canvasRatio > ratio) {
			return { width: canvas.width, height: canvas.width / ratio };
		}
		return { width: canvas.height * ratio, height: canvas.height };
	};

	const spriteProps = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		return {
			x: canvas.width / 2,
			y: canvas.height * (0.5 - BG_Y_OFFSET),
			anchor: 0.5,
			...cover(BG_RATIO),
		};
	});

	const lanternLayout = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		const height = canvas.height * LANTERN_HEIGHT_RATIO;
		const y = canvas.height * LANTERN_TOP_RATIO;
		return {
			height,
			y,
			leftX: canvas.width * LANTERN_LEFT_RATIO,
			rightX: canvas.width * LANTERN_RIGHT_RATIO,
		};
	});

	const showBaseBackground = $derived(context.stateGame.gameType === 'basegame');
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} zIndex={-3} />

<FadeContainer show={showBaseBackground} duration={SECOND} zIndex={-2}>
	<Sprite key="mainBackground" {...spriteProps} />
	<Lantern
		assetKey="lanternDay"
		x={lanternLayout.leftX}
		y={lanternLayout.y}
		height={lanternLayout.height}
	/>
	<Lantern
		assetKey="lanternDay"
		x={lanternLayout.rightX}
		y={lanternLayout.y}
		height={lanternLayout.height}
		phase={Math.PI}
	/>
</FadeContainer>

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<Sprite key="featureBackground" {...spriteProps} />
	<Lantern
		assetKey="lanternNight"
		x={lanternLayout.leftX}
		y={lanternLayout.y}
		height={lanternLayout.height}
	/>
	<Lantern
		assetKey="lanternNight"
		x={lanternLayout.rightX}
		y={lanternLayout.y}
		height={lanternLayout.height}
		phase={Math.PI}
	/>
</FadeContainer>
