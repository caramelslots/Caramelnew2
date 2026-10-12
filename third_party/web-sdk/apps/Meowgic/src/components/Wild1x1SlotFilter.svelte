<script lang="ts">
	/**
	 * wild_render is a combined curtain + 1×1 skeleton. For board tiles
	 * (`static` / `land`) keep only the parchment tile and its idle/bounce
	 * glows.
	 *
	 * The black column is the `clip` slot: setup pose is the full curtain
	 * quad, and spine-pixi adds it as a Graphics child that Pixi then draws.
	 * Skip those Graphics *after* addRenderable (which creates them).
	 */
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	const KEEP = new Set([
		'background_1x1',
		'background_1x2',
		'pattern_1_1x1',
		'pattern_1_1x2',
		'pattern_2_1x1',
		'pattern_2_1x2',
		'paw_1x1',
		'paw_1x2',
		'glow_green',
		'glow_green2',
		'glow_green3',
		'glow_green4',
		'glow_green5',
		'glow_green6',
		'glow_green7',
		'glow_green8',
		'WILD',
		'WILD2',
		'WILD_glow',
		'WILD_glow copy',
		'WILD_glow copy 2',
		'WILD_glow copy 3',
	]);

	type PixiChild = {
		renderPipeId?: string;
		label?: string;
		renderable?: boolean;
		visible?: boolean;
		includeInBuild?: boolean;
		parent?: { removeChild: (c: unknown) => void };
		collectRenderables?: (...args: unknown[]) => void;
	};

	type ClipMaskRec = { mask?: PixiChild; maskComputed?: boolean };

	type SpineWithClipMasks = {
		clippingSlotToPixiMasks?: Record<string, ClipMaskRec>;
		currentClippingSlot?: unknown;
		_slotsObject?: Record<string, { container?: { mask: unknown } }>;
		children: PixiChild[];
		addChild: (...args: unknown[]) => unknown;
		removeChild: (child: unknown) => void;
		updateAndSetPixiMask?: (slot: unknown, last: boolean) => void;
		transformAttachments?: (...args: unknown[]) => void;
		_validateAndTransformAttachments?: (...args: unknown[]) => void;
		collectRenderablesSimple: (...args: unknown[]) => void;
		renderPipeId: string;
		groupBlendMode: unknown;
		didViewUpdate: boolean;
		skeleton: { slots: Array<{ data: { name: string }; attachment: unknown }> };
		state: { apply: (skeleton: unknown) => void };
		beforeUpdateWorldTransforms: (...args: unknown[]) => void;
		afterUpdateWorldTransforms: (...args: unknown[]) => void;
		update: (dt: number) => void;
		spineAttachmentsDirty: boolean;
	};

	const spine = getContextSpine() as unknown as SpineWithClipMasks;

	const isClipGraphics = (child: PixiChild | undefined) =>
		child?.renderPipeId === 'graphics' || child?.label === 'Graphics';

	const hideSlots = () => {
		for (const slot of spine.skeleton.slots) {
			if (KEEP.has(slot.data.name)) continue;
			slot.attachment = null;
		}
	};

	const silenceGraphics = (child: PixiChild | undefined) => {
		if (!child || !isClipGraphics(child)) return false;
		child.renderable = false;
		child.visible = false;
		child.includeInBuild = false;
		return true;
	};

	const stripClipMasks = () => {
		spine.currentClippingSlot = undefined;
		const map = spine.clippingSlotToPixiMasks;
		if (map) {
			for (const rec of Object.values(map)) {
				const mask = rec.mask;
				if (!mask) continue;
				silenceGraphics(mask);
				mask.parent?.removeChild(mask);
				rec.mask = undefined;
				rec.maskComputed = false;
			}
		}
		const slotsObj = spine._slotsObject;
		if (slotsObj) {
			for (const obj of Object.values(slotsObj)) {
				if (obj?.container) obj.container.mask = null;
			}
		}
		const children = spine.children;
		for (let i = children.length - 1; i >= 0; i--) {
			const child = children[i];
			if (!silenceGraphics(child)) continue;
			spine.removeChild(child);
		}
	};

	const previousBefore = spine.beforeUpdateWorldTransforms;
	const previousAfter = spine.afterUpdateWorldTransforms;
	const previousApply = spine.state.apply.bind(spine.state);
	const previousMask = spine.updateAndSetPixiMask?.bind(spine);
	const previousTransform = spine.transformAttachments?.bind(spine);
	const previousValidate = spine._validateAndTransformAttachments?.bind(spine);
	const previousAddChild = spine.addChild.bind(spine);
	const previousCollect = spine.collectRenderablesSimple.bind(spine);

	spine.state.apply = (skeleton) => {
		previousApply(skeleton);
		hideSlots();
	};

	spine.updateAndSetPixiMask = (_slot, last) => {
		hideSlots();
		if (last) spine.currentClippingSlot = undefined;
		void _slot;
		void previousMask;
	};

	if (previousTransform) {
		spine.transformAttachments = (...args) => {
			hideSlots();
			previousTransform(...args);
			hideSlots();
			stripClipMasks();
		};
	}

	if (previousValidate) {
		spine._validateAndTransformAttachments = (...args) => {
			hideSlots();
			previousValidate(...args);
			stripClipMasks();
		};
	}

	spine.addChild = (...args: unknown[]) => {
		const kept = args.filter((child) => !silenceGraphics(child as PixiChild));
		if (!kept.length) return args[args.length - 1];
		return previousAddChild(...kept);
	};

	spine.collectRenderablesSimple = (instructionSet, renderer, currentLayer) => {
		hideSlots();
		const pipes = (
			renderer as {
				renderPipes: Record<
					string,
					{ addRenderable?: (s: unknown, i: unknown) => void; setBlendMode?: Function }
				>;
				renderableGC: { addRenderable: (s: unknown) => void };
			}
		).renderPipes;
		const gc = (
			renderer as { renderableGC: { addRenderable: (s: unknown) => void } }
		).renderableGC;
		pipes.blendMode?.setBlendMode?.(spine, spine.groupBlendMode, instructionSet);
		pipes[spine.renderPipeId]?.addRenderable?.(spine, instructionSet);
		gc.addRenderable(spine);
		spine.didViewUpdate = false;
		const children = spine.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (silenceGraphics(child)) continue;
			child.collectRenderables?.(instructionSet, renderer, currentLayer);
		}
		stripClipMasks();
	};

	spine.beforeUpdateWorldTransforms = (...args) => {
		previousBefore?.(...args);
		hideSlots();
	};
	spine.afterUpdateWorldTransforms = (...args) => {
		previousAfter?.(...args);
		hideSlots();
		stripClipMasks();
	};

	hideSlots();
	stripClipMasks();
	spine.update(0);
	spine.spineAttachmentsDirty = true;
	hideSlots();
	stripClipMasks();

	onDestroy(() => {
		spine.state.apply = previousApply;
		if (previousMask) spine.updateAndSetPixiMask = previousMask;
		if (previousTransform) spine.transformAttachments = previousTransform;
		if (previousValidate) spine._validateAndTransformAttachments = previousValidate;
		spine.addChild = previousAddChild;
		spine.collectRenderablesSimple = previousCollect;
		spine.beforeUpdateWorldTransforms = previousBefore;
		spine.afterUpdateWorldTransforms = previousAfter ?? (() => {});
	});
</script>
