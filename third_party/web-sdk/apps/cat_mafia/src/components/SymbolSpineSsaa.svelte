<script lang="ts">
	import { onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import * as SPINE_PIXI from '@esotericsoftware/spine-pixi-v8';
	import { getContextApp, getContextParent, type SpineTrackProps } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { SYMBOL_SPINE_SSAA, SYMBOL_SPINE_SSAA_PAD_FRAC } from '../game/symbolSpineSsaa';

	type Props = {
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		x?: number;
		y?: number;
		listener: SpineTrackProps['listener'];
		loop?: boolean;
	};

	const props: Props = $props();
	const appContext = getContextApp();
	const parentContext = getContextParent();

	const animationName = $derived(props.symbolInfo.animationName);
	const isLivingIdle = $derived(animationName === 'idle');
	const needsTicker = $derived.by(() => {
		const name = animationName;
		if (!name) return true;
		if (name === 'idle') return true;
		return !name.endsWith('/idle');
	});
	const loop = $derived.by(() => {
		if (props.loop !== undefined) return props.loop;
		if ('loop' in props.symbolInfo && typeof props.symbolInfo.loop === 'boolean') {
			return props.symbolInfo.loop;
		}
		return isLivingIdle;
	});
	const reverseAnimation = $derived(
		'reverseAnimation' in props.symbolInfo && props.symbolInfo.reverseAnimation === true,
	);
	const animationEnd = $derived(
		'animationEnd' in props.symbolInfo ? (props.symbolInfo.animationEnd as number) : undefined,
	);
	const offsetY = $derived(
		'offsetY' in props.symbolInfo && typeof props.symbolInfo.offsetY === 'number'
			? props.symbolInfo.offsetY
			: 0,
	);

	const displayHeight = SYMBOL_SIZE * props.symbolInfo.sizeRatios.height;
	const fitBox = displayHeight * (1 + SYMBOL_SPINE_SSAA_PAD_FRAC);
	const rtSize = Math.max(1, Math.ceil(fitBox * SYMBOL_SPINE_SSAA));

	const spineData = appContext.stateApp.loadedAssets?.[props.symbolInfo.assetKey] as
		| SPINE_PIXI.SkeletonData
		| undefined;

	if (!spineData) {
		console.error(`SymbolSpineSsaa: key "${props.symbolInfo.assetKey}" not in loadedAssets`);
	}

	const bakeRoot = new PIXI.Container();
	const spine = spineData ? new SPINE_PIXI.Spine(spineData) : null;
	const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
	sprite.anchor.set(0.5);

	let rt: PIXI.RenderTexture | null = null;
	let track: SPINE_PIXI.TrackEntry | null = null;
	let tickFn: (() => void) | null = null;
	let disposed = false;
	let tickerAttached = false;

	const syncSpriteTransform = () => {
		sprite.position.set(props.x ?? 0, (props.y ?? 0) + offsetY);
		sprite.scale.set(1 / SYMBOL_SPINE_SSAA);
	};

	const applyTrack = () => {
		if (!spine || !animationName) return;
		try {
			track = spine.state.setAnimation(0, animationName, loop);
			if (track) {
				track.timeScale = stateBetDerived.timeScale();
				if (reverseAnimation) track.reverse = true;
				if (animationEnd !== undefined) track.animationEnd = animationEnd;
				if (props.listener) track.listener = props.listener;
			}
			spine.update(0);
		} catch (error) {
			console.error(error);
		}
	};

	const bakeFrame = () => {
		const app = appContext.stateApp.pixiApplication;
		if (!app || !spine || !rt || disposed) return;
		if (needsTicker) {
			spine.update(app.ticker.deltaMS / 1000);
			if (track) track.timeScale = stateBetDerived.timeScale();
		}
		app.renderer.render({
			container: bakeRoot,
			target: rt,
			clear: true,
			clearColor: [0, 0, 0, 0],
		});
	};

	const syncTicker = () => {
		const app = appContext.stateApp.pixiApplication;
		if (!app || !spine) return;
		if (needsTicker && !tickerAttached) {
			tickFn = bakeFrame;
			app.ticker.add(tickFn);
			tickerAttached = true;
		} else if (!needsTicker && tickerAttached && tickFn) {
			app.ticker.remove(tickFn);
			tickFn = null;
			tickerAttached = false;
		}
	};

	if (spine && spineData) {
		const scale = displayHeight / spineData.height;
		spine.scale.set(scale);
		spine.autoUpdate = false;
		bakeRoot.addChild(spine);
		bakeRoot.scale.set(SYMBOL_SPINE_SSAA);
		bakeRoot.position.set(rtSize / 2, rtSize / 2);

		rt = PIXI.RenderTexture.create({
			width: rtSize,
			height: rtSize,
			antialias: true,
		});
		if (rt.source?.style) {
			rt.source.style.scaleMode = 'linear';
		}
		sprite.texture = rt;
		syncSpriteTransform();
		parentContext.addToParent(sprite);
	}

	$effect(() => {
		void props.x;
		void props.y;
		void offsetY;
		syncSpriteTransform();
	});

	$effect(() => {
		void animationName;
		void loop;
		void reverseAnimation;
		void animationEnd;
		void needsTicker;
		applyTrack();
		syncTicker();
		bakeFrame();
	});

	onDestroy(() => {
		disposed = true;
		const app = appContext.stateApp.pixiApplication;
		if (app && tickFn) app.ticker.remove(tickFn);
		tickFn = null;
		tickerAttached = false;
		sprite.texture = PIXI.Texture.EMPTY;
		if (spine) spine.destroy();
		bakeRoot.destroy({ children: false });
		if (rt) {
			rt.destroy(true);
			rt = null;
		}
	});
</script>
