type JsonMap = Record<string, any>;

const LEGACY_CONSTRAINT_KEYS = ['ik', 'transform', 'path', 'physics'] as const;

const isLegacyVersion = (version: unknown) => {
	if (typeof version !== 'string') return false;
	const [major, minor] = version.split('.').map(Number);
	return major < 4 || (major === 4 && minor < 3);
};

const TRANSFORM_PROPERTIES = ['rotate', 'x', 'y', 'scaleX', 'scaleY', 'shearY'] as const;

/** 4.2 transform constraints copy each property onto itself; 4.3 expresses that as an explicit from→to map. */
const upgradeTransformConstraint = (constraint: JsonMap) => {
	constraint.source = constraint.target;
	delete constraint.target;

	const local = constraint.local ?? false;
	constraint.localSource = local;
	constraint.localTarget = local;
	constraint.additive = constraint.relative ?? false;
	delete constraint.local;
	delete constraint.relative;

	constraint.mixRotate ??= 1;
	constraint.mixX ??= 1;
	constraint.mixY ??= constraint.mixX;
	constraint.mixScaleX ??= 1;
	constraint.mixScaleY ??= constraint.mixScaleX;
	constraint.mixShearY ??= 1;

	constraint.properties = Object.fromEntries(
		TRANSFORM_PROPERTIES.map((property) => [property, { to: { [property]: {} } }]),
	);
};

/**
 * Spine 4.3 SkeletonJson reads constraints from a single typed `constraints` array and
 * linked meshes from `source`; pre-4.3 exports use per-type arrays (`ik`, `path`, ...) with
 * an `order` field and linked meshes with `parent`. Without this, 4.2 exports fail to parse
 * or silently lose their constraints.
 */
export const upgradeLegacySpineJson = <T>(json: T): T => {
	const root = json as JsonMap;
	if (!root || typeof root !== 'object' || !isLegacyVersion(root.skeleton?.spine)) return json;

	const upgraded: JsonMap = structuredClone(root);

	const constraints: JsonMap[] = [];
	for (const type of LEGACY_CONSTRAINT_KEYS) {
		const list = upgraded[type];
		delete upgraded[type];
		if (!Array.isArray(list)) continue;
		for (const entry of list) {
			const constraint: JsonMap = { ...entry, type };
			if (type === 'path' && constraint.slot === undefined) {
				constraint.slot = constraint.target;
				delete constraint.target;
			}
			if (type === 'transform' && constraint.properties === undefined) {
				upgradeTransformConstraint(constraint);
			}
			constraints.push(constraint);
		}
	}
	if (constraints.length > 0) {
		constraints.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
		for (const constraint of constraints) delete constraint.order;
		upgraded.constraints = constraints;
	}

	for (const skin of upgraded.skins ?? []) {
		for (const slotName in skin.attachments ?? {}) {
			const slotMap = skin.attachments[slotName];
			for (const name in slotMap) {
				const attachment = slotMap[name];
				if (attachment?.type === 'linkedmesh' && attachment.source === undefined) {
					attachment.source = attachment.parent;
					delete attachment.parent;
				}
			}
		}
	}

	return upgraded as T;
};
