/** Optional prop for HUD buttons — scale is baked into sprite size, not Container.scale. */
export type UiSizeScaleProps = {
	sizeScale?: number;
};

export const uiScaledSize = (base: number, sizeScale = 1) => {
	const size = base * sizeScale;
	return { width: size, height: size, size };
};

/** Reduces shimmer on heavily downscaled UI ring textures. */
export const UI_SPRITE_RENDER = { roundPixels: true } as const;
