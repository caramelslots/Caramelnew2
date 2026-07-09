import {
	MeshAttachment,
	RegionAttachment,
	type Attachment,
	type Spine,
} from '@esotericsoftware/spine-pixi-v8';

import type { NeonElementTuning } from './neonBackgroundTuning';

/**
 * SkeletonData — общий объект для всех инстансов с одним key="neonBackground".
 * Модификации bone.data / attachment.vertices применяются к нему только ОДИН раз,
 * иначе при каждом монтировании нового инстанса (day→night, base→FS) смещения
 * накапливаются и позиционирование уезжает.
 */
const tunedBoneData = new WeakSet<object>();
const tunedSlotData = new WeakSet<object>();

const hasTuning = (tuning: NeonElementTuning) =>
	Boolean(tuning.x || tuning.y || (tuning.scaleX && tuning.scaleX !== 1) || (tuning.scaleY && tuning.scaleY !== 1));

const applyAttachmentTuning = (attachment: Attachment, tuning: NeonElementTuning) => {
	if (attachment instanceof RegionAttachment) {
		if (tuning.x) attachment.x += tuning.x;
		if (tuning.y) attachment.y += tuning.y;
		if (tuning.scaleX) attachment.scaleX *= tuning.scaleX;
		if (tuning.scaleY) attachment.scaleY *= tuning.scaleY;
		return;
	}

	if (attachment instanceof MeshAttachment) {
		const dx = tuning.x ?? 0;
		const dy = tuning.y ?? 0;
		if (dx || dy) {
			const vertices = attachment.vertices;
			for (let i = 0; i < vertices.length; i += 2) {
				vertices[i] += dx;
				vertices[i + 1] += dy;
			}
		}
		if (tuning.scaleX && tuning.scaleX !== 1) attachment.scaleX *= tuning.scaleX;
		if (tuning.scaleY && tuning.scaleY !== 1) attachment.scaleY *= tuning.scaleY;
	}
};

export const applyNeonBoneTuning = (
	spine: Spine,
	boneTuning: Record<string, NeonElementTuning>,
) => {
	const skeletonData = spine.skeleton.data;
	if (tunedBoneData.has(skeletonData)) return;
	tunedBoneData.add(skeletonData);

	for (const [boneName, tuning] of Object.entries(boneTuning)) {
		if (!hasTuning(tuning)) continue;

		const bone = spine.skeleton.findBone(boneName);
		if (!bone) continue;

		if (tuning.x) bone.data.x += tuning.x;
		if (tuning.y) bone.data.y += tuning.y;
		if (tuning.scaleX) bone.data.scaleX *= tuning.scaleX;
		if (tuning.scaleY) bone.data.scaleY *= tuning.scaleY;
	}
};

export const applyNeonSlotTuning = (
	spine: Spine,
	slotTuning: Record<string, NeonElementTuning>,
) => {
	const skeletonData = spine.skeleton.data;
	if (tunedSlotData.has(skeletonData)) return;
	tunedSlotData.add(skeletonData);

	for (const [slotName, tuning] of Object.entries(slotTuning)) {
		if (!hasTuning(tuning)) continue;

		const slot = spine.skeleton.findSlot(slotName);
		const attachment = slot?.getAttachment();
		if (!attachment) continue;

		applyAttachmentTuning(attachment, tuning);
	}
};
