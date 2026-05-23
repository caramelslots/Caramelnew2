<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';

	const context = getContext();

	// Source artwork dimensions (designer_assets/d1.jpg, n1.jpg). Both are
	// 1920×940, so cover-fit math is shared.
	const BG_RATIO = 1920 / 940;

	// Vertical offset (fraction of canvas height) applied on top of the
	// centred cover-fit. New artwork is composed around the centre, so no
	// vertical shift is needed.
	const BG_Y_OFFSET = 0;

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

	const showBaseBackground = $derived(context.stateGame.gameType === 'basegame');
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} zIndex={-3} />

<FadeContainer show={showBaseBackground} duration={SECOND} zIndex={-2}>
	<Sprite key="mainBackground" {...spriteProps} />
</FadeContainer>

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<Sprite key="featureBackground" {...spriteProps} />
</FadeContainer>
