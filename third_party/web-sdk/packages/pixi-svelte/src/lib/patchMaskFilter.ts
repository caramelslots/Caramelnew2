/**
 * Guard MaskFilter.inverse when a BindGroup slot was cleared after a texture
 * destroy (bonus board-mask resize). Avoids cascading null crashes in AlphaMaskPipe.
 */
import { MaskFilter } from 'pixi.js';

type MaskFilterInternal = {
	resources: {
		filterUniforms?: { uniforms?: { uInverse?: number } } | null;
	} | null;
	inverse: boolean;
};

let patched = false;

export const patchMaskFilter = () => {
	if (patched) return;
	patched = true;

	const proto = MaskFilter.prototype as unknown as MaskFilterInternal;

	Object.defineProperty(proto, 'inverse', {
		configurable: true,
		get() {
			return this.resources?.filterUniforms?.uniforms?.uInverse === 1;
		},
		set(value: boolean) {
			const uniforms = this.resources?.filterUniforms?.uniforms;
			if (!uniforms) return;
			uniforms.uInverse = value ? 1 : 0;
		},
	});
};

patchMaskFilter();
