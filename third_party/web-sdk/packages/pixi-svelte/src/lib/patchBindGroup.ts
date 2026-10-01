/**
 * Pixi 8.8 BindGroup safety for cat_mafia.
 *
 * Stock 8.8 nulls a destroyed TextureSource slot in a shared BindGroup; the next
 * `_updateKey` then throws `null._resourceId`. Upstream #11876 destroys the whole
 * group instead — but that sets `resources = null` and AlphaMask's pooled
 * MaskFilter then throws `null[0]` on `getResource` (#11994 / #12131).
 *
 * We keep the group alive and skip dead slots — safe for batch AND AlphaMask.
 */
import { BindGroup } from 'pixi.js';

type BindResource = {
	destroyed?: boolean;
	_resourceId?: number;
	_touched?: number;
	off?: (event: string, fn: (...args: unknown[]) => void, context?: unknown) => void;
	on?: (event: string, fn: (...args: unknown[]) => void, context?: unknown) => void;
};

type BindGroupInternal = {
	_dirty: boolean;
	_key: string;
	resources: Record<string, BindResource | null> | null;
	_updateKey: () => void;
	getResource: (index: number) => BindResource | null;
	_touch: (tick: number) => void;
	onResourceChange: (resource: BindResource) => void;
};

let patched = false;

export const patchBindGroup = () => {
	if (patched) return;
	patched = true;

	const proto = BindGroup.prototype as unknown as BindGroupInternal;

	proto._updateKey = function () {
		if (!this._dirty) return;
		this._dirty = false;
		const resources = this.resources;
		if (!resources) {
			this._key = '';
			return;
		}
		const keyParts: Array<string | number> = [];
		let index = 0;
		for (const i in resources) {
			const resource = resources[i];
			if (!resource) continue;
			keyParts[index++] = resource._resourceId ?? '';
		}
		this._key = keyParts.join('|');
	};

	proto.getResource = function (index) {
		return this.resources?.[index] ?? null;
	};

	proto._touch = function (tick) {
		const resources = this.resources;
		if (!resources) return;
		for (const i in resources) {
			const resource = resources[i];
			if (resource) resource._touched = tick;
		}
	};

	proto.onResourceChange = function (resource) {
		this._dirty = true;
		if (resource.destroyed) {
			const resources = this.resources;
			if (!resources) return;
			for (const i in resources) {
				if (resources[i] === resource) {
					resource.off?.('change', this.onResourceChange as never, this);
					resources[i] = null;
				}
			}
			this._updateKey();
			return;
		}
		this._updateKey();
	};
};

patchBindGroup();
