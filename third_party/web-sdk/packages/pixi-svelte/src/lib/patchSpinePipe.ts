/**
 * spine-pixi-v8 still throws when Pixi validates a slot that was never batched:
 *
 *   Cannot read properties of undefined (reading 'checkAndUpdateTexture')
 *
 * Draw order and attachments can change in the same frame as a rebuild.
 * `updateRenderable` in 4.3 already skips a missing batch slot. This only
 * guards `validateRenderable`, and it reads the 4.3 applied pose.
 */
import { RendererType } from 'pixi.js';
import {
	MeshAttachment,
	RegionAttachment,
	SpinePipe,
	type Spine,
} from '@esotericsoftware/spine-pixi-v8';

type BatchableSpineSlot = {
	texture?: unknown;
	_batcher?: {
		checkAndUpdateTexture: (slot: BatchableSpineSlot, texture: unknown) => boolean;
	};
};

type GpuSpineData = {
	slotBatches: Record<string, BatchableSpineSlot | undefined>;
};

type CachedAttachment = {
	id: string;
	texture?: unknown;
};

type SpineInternal = Spine & {
	_validateAndTransformAttachments: () => void;
	_getCachedData: (slot: unknown, attachment: unknown) => CachedAttachment;
	spineAttachmentsDirty: boolean;
	spineTexturesDirty: boolean;
};

type SpinePipeInternal = {
	renderer: { type: number };
	gpuSpineData: Record<number, GpuSpineData | null | undefined>;
	validateRenderable: (spine: Spine) => boolean;
};

let patched = false;

export const patchSpinePipe = () => {
	if (patched) return;
	patched = true;

	const proto = SpinePipe.prototype as unknown as SpinePipeInternal;

	proto.validateRenderable = function (spine: Spine) {
		if (this.renderer.type === RendererType.CANVAS) return true;

		const internal = spine as SpineInternal;
		internal._validateAndTransformAttachments();
		if (internal.spineAttachmentsDirty) return true;
		if (!internal.spineTexturesDirty) return false;

		const gpuSpine = this.gpuSpineData[spine.uid];
		if (!gpuSpine) return false;

		const drawOrder = internal.skeleton.drawOrder.appliedPose;
		for (let i = 0, n = drawOrder.length; i < n; i++) {
			const slot = drawOrder[i];
			if (!slot.bone.active) continue;
			const attachment = slot.appliedPose.attachment;
			if (!(attachment instanceof RegionAttachment || attachment instanceof MeshAttachment)) continue;

			const cacheData = internal._getCachedData(slot, attachment);
			const batchableSpineSlot = gpuSpine.slotBatches[cacheData.id];
			const texture = cacheData.texture;
			if (texture === batchableSpineSlot?.texture) continue;
			const batcher = batchableSpineSlot?._batcher;
			if (!batchableSpineSlot || !batcher?.checkAndUpdateTexture(batchableSpineSlot, texture)) {
				return true;
			}
		}

		return false;
	};
};

patchSpinePipe();
