/**
 * Measure a Spine symbol’s visible idle silhouette and derive a sizeRatio so
 * the body fills `targetCellFill` of the reel cell — independent of how large
 * the designer packed the glyph inside the skeleton frame.
 *
 * SpineProvider scales with `height / skeletonData.height`. We inflate
 * sizeRatio when the art is a fraction of that skeleton AABB (typical for
 * letter/prop exports with FX pads).
 */

import {
	AnimationState,
	AnimationStateData,
	MeshAttachment,
	Physics,
	RegionAttachment,
	Skeleton,
	type SkeletonData,
} from '@esotericsoftware/spine-pixi-v8';

/** FX / pad slots — never part of the on-cell silhouette. */
const FX_SLOT_RE =
	/(Circle_rays|Layer\s*1|Outer\s*Glow|_glow|shadow_|light_\d+|LightSweep)/i;

export type SilhouetteBounds = {
	width: number;
	height: number;
	/** Side length used for equalizing (max edge — contain-fit). */
	span: number;
};

export type SilhouetteFitOptions = {
	/** Fraction of the 100px cell the silhouette should fill. */
	targetCellFill: number;
	/** Pose to sample; falls back to setup if missing. */
	animationName?: string;
};

const isBodySlot = (slotName: string, alpha: number) => {
	if (alpha < 0.05) return false;
	if (FX_SLOT_RE.test(slotName)) return false;
	return true;
};

/**
 * World AABB of body attachments after applying `animationName` at t=0.
 */
export const measureIdleSilhouette = (
	skeletonData: SkeletonData,
	animationName = 'idle',
): SilhouetteBounds | null => {
	const skeleton = new Skeleton(skeletonData);
	skeleton.setToSetupPose();

	if (skeletonData.findAnimation(animationName)) {
		const state = new AnimationState(new AnimationStateData(skeletonData));
		state.setAnimation(0, animationName, false);
		state.update(0);
		state.apply(skeleton);
	}

	skeleton.updateWorldTransform(Physics.update);

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const verts: number[] = [];

	for (const slot of skeleton.slots) {
		const attachment = slot.getAttachment();
		if (!attachment) continue;
		const a = slot.color.a * skeleton.color.a;
		if (!isBodySlot(slot.data.name, a)) continue;

		if (attachment instanceof RegionAttachment) {
			verts.length = 8;
			attachment.computeWorldVertices(slot, verts, 0, 2);
			for (let i = 0; i < 8; i += 2) {
				minX = Math.min(minX, verts[i]);
				maxX = Math.max(maxX, verts[i]);
				minY = Math.min(minY, verts[i + 1]);
				maxY = Math.max(maxY, verts[i + 1]);
			}
			continue;
		}

		if (attachment instanceof MeshAttachment) {
			const count = attachment.worldVerticesLength;
			if (count < 2) continue;
			if (verts.length < count) verts.length = count;
			attachment.computeWorldVertices(slot, 0, count, verts, 0, 2);
			for (let i = 0; i < count; i += 2) {
				minX = Math.min(minX, verts[i]);
				maxX = Math.max(maxX, verts[i]);
				minY = Math.min(minY, verts[i + 1]);
				maxY = Math.max(maxY, verts[i + 1]);
			}
		}
	}

	if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;

	const width = Math.max(1, maxX - minX);
	const height = Math.max(1, maxY - minY);
	return { width, height, span: Math.max(width, height) };
};

/**
 * sizeRatios.height/width for SpineProvider so the silhouette fills the cell.
 * `skeletonData.height` is the AABB SpineProvider divides by.
 */
export const sizeRatioForSilhouette = (
	skeletonData: SkeletonData,
	opts: SilhouetteFitOptions,
): number | null => {
	const skeletonH = skeletonData.height;
	if (!skeletonH || skeletonH <= 0) return null;

	const anim =
		opts.animationName && skeletonData.findAnimation(opts.animationName)
			? opts.animationName
			: skeletonData.animations[0]?.name;

	const bounds = measureIdleSilhouette(skeletonData, anim ?? 'idle');
	if (!bounds) return null;

	return (opts.targetCellFill * skeletonH) / bounds.span;
};
