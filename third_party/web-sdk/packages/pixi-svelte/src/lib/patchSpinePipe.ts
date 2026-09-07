/**
 * spine-pixi-v8 4.2.74 crashes when Pixi calls SpinePipe.updateRenderable
 * (or validateRenderable) for a slot that was never batched:
 *
 *   Cannot read properties of undefined (reading '_batcher')
 *
 * That happens when attachments / draw order change in the same frame as a
 * rebuild — common when Svelte remounts SpineProvider/SpineTrack. Upstream
 * fix: EsotericSoftware/spine-runtimes#2991 (released in 4.2.96).
 */
import {
	MeshAttachment,
	RegionAttachment,
	SpinePipe,
	type Spine,
} from '@esotericsoftware/spine-pixi-v8';

type BatchableSpineSlot = {
	texture?: unknown;
	_batcher?: {
		updateElement: (slot: BatchableSpineSlot) => void;
		checkAndUpdateTexture: (slot: BatchableSpineSlot, texture: unknown) => boolean;
	};
};

type GpuSpineData = {
	slotBatches: Record<string, BatchableSpineSlot | undefined>;
};

type CachedAttachment = {
	id: string;
	skipRender?: boolean;
	texture?: unknown;
};

type SpineInternal = Spine & {
	_validateAndTransformAttachments: () => void;
	_getCachedData: (slot: unknown, attachment: unknown) => CachedAttachment;
	spineAttachmentsDirty: boolean;
	spineTexturesDirty: boolean;
};

type SpinePipeInternal = {
	gpuSpineData: Record<number, GpuSpineData | null | undefined>;
	validateRenderable: (spine: Spine) => boolean;
	updateRenderable: (spine: Spine) => void;
};

let patched = false;

export const patchSpinePipe = () => {
	if (patched) return;
	patched = true;

	const proto = SpinePipe.prototype as unknown as SpinePipeInternal;

	proto.validateRenderable = function (spine: Spine) {
		const internal = spine as SpineInternal;
		internal._validateAndTransformAttachments();

		if (internal.spineAttachmentsDirty) return true;

		if (internal.spineTexturesDirty) {
			const gpuSpine = this.gpuSpineData[spine.uid];
			if (!gpuSpine) return true;

			const drawOrder = internal.skeleton.drawOrder;
			for (let i = 0, n = drawOrder.length; i < n; i++) {
				const slot = drawOrder[i];
				const attachment = slot.getAttachment();
				if (!(attachment instanceof RegionAttachment || attachment instanceof MeshAttachment)) {
					continue;
				}

				const cacheData = internal._getCachedData(slot, attachment);
				const batchableSpineSlot = gpuSpine.slotBatches[cacheData.id];
				if (!batchableSpineSlot) return true;

				const texture = cacheData.texture;
				if (texture !== batchableSpineSlot.texture) {
					if (!batchableSpineSlot._batcher?.checkAndUpdateTexture(batchableSpineSlot, texture)) {
						return true;
					}
				}
			}
		}

		return false;
	};

	proto.updateRenderable = function (spine: Spine) {
		const gpuSpine = this.gpuSpineData[spine.uid];
		if (!gpuSpine) return;

		const internal = spine as SpineInternal;
		internal._validateAndTransformAttachments();
		internal.spineAttachmentsDirty = false;
		internal.spineTexturesDirty = false;

		const drawOrder = internal.skeleton.drawOrder;
		for (let i = 0, n = drawOrder.length; i < n; i++) {
			const slot = drawOrder[i];
			const attachment = slot.getAttachment();
			if (!(attachment instanceof RegionAttachment || attachment instanceof MeshAttachment)) {
				continue;
			}

			const cacheData = internal._getCachedData(slot, attachment);
			if (cacheData.skipRender) continue;

			const batchableSpineSlot = gpuSpine.slotBatches[cacheData.id];
			// Slot can be missing when draw order changed before addRenderable (#2991).
			batchableSpineSlot?._batcher?.updateElement(batchableSpineSlot);
		}
	};
};

patchSpinePipe();
