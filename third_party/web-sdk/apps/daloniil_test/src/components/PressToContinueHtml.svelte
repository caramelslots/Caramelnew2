<script lang="ts">
	import * as PIXI from 'pixi.js';

	import {
		BITMAP_FONT_SCALE,
		FONT_PROSTOI_WHITE,
		PRESS_TO_CONTINUE_BOTTOM_OFFSET,
		PRESS_TO_CONTINUE_FONT_SIZE,
	} from '../game/constants';
	import { getContext } from '../game/context';

	let imgEl = $state<HTMLImageElement | undefined>();

	const context = getContext();
	const text = $derived(context.i18nDerived.pressToContinue());

	const positionStyle = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const bottom = PRESS_TO_CONTINUE_BOTTOM_OFFSET * ml.scale;
		return `left:${ml.x}px;bottom:${bottom}px;max-width:${ml.width * ml.scale * 0.95}px;`;
	});

	$effect(() => {
		const renderer = context.stateApp.pixiApplication?.renderer;
		if (!renderer || !imgEl) return;

		const ml = context.stateLayoutDerived.mainLayout();
		const fontSize = PRESS_TO_CONTINUE_FONT_SIZE * BITMAP_FONT_SCALE;
		const maxWidth = ml.width * 0.95;

		const container = new PIXI.Container();
		const bitmapText = new PIXI.BitmapText({
			text,
			style: {
				fontFamily: FONT_PROSTOI_WHITE,
				fontSize,
				align: 'center',
				letterSpacing: 2,
			},
		});

		const scale = Math.min(maxWidth / (bitmapText.width || 1), 1);
		bitmapText.scale.set(scale);
		bitmapText.anchor.set(0.5, 1);

		const w = Math.max(1, Math.ceil(bitmapText.width));
		const h = Math.max(1, Math.ceil(bitmapText.height));
		bitmapText.position.set(w / 2, h);
		container.addChild(bitmapText);

		const rt = PIXI.RenderTexture.create({ width: w, height: h });
		renderer.render({ container, target: rt });

		const canvas = renderer.extract.canvas(rt);
		imgEl.src = canvas.toDataURL('image/png');
		imgEl.style.width = `${w * ml.scale}px`;
		imgEl.style.height = `${h * ml.scale}px`;

		return () => {
			rt.destroy(true);
			container.destroy({ children: true });
		};
	});
</script>

<img bind:this={imgEl} class="press-label" style={positionStyle} alt="" />

<style lang="scss">
	.press-label {
		position: fixed;
		transform: translateX(-50%);
		pointer-events: none;
		user-select: none;
	}
</style>
