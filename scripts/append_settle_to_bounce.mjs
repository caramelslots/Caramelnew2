// Canonicalises the bounce animation in every per-symbol spine and appends
// a final "settle" keyframe so the spine's last frame exactly matches the
// `static` sprite's visible size — the land → static transition becomes
// seamless.
//
// Timeline matches the designer's source (`designer_assets/Export/symbols.json`,
// the `<Symbol>/bounce` clips) keyframe-for-keyframe — single source of truth.
// The only thing this script adds is a final SETTLE keyframe so the spine's
// last visible frame matches the static-sprite size (otherwise there is a
// visible "snap" when the land state hands off to the static state):
//   0.0000  (1.00, 1.00)   setup pose, bounce starts at full natural size
//   0.0667  (1.15, 0.85)   squash 1
//   0.1333  (1.00, 1.00)
//   0.2000  (0.85, 1.15)   counter-stretch
//   0.2667  (1.00, 1.00)
//   0.3333  (1.10, 0.90)   squash 2
//   0.4000  (0.95, 1.05)
//   0.4667  (1.00, 1.00)   bounce naturally ends here
//   0.6167  (SETTLE, SETTLE)  smooth ease down to static-sprite visual size
//
// SETTLE_SCALE = visible-artwork ratio between the static sprite (220 px
// source with padding) and the spine attachment at scale 1 (196 px, less
// padding). Tweak this until the snap between land and static is invisible.
//
// Usage:  node scripts/append_settle_to_bounce.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(
	__dirname,
	'../third_party/web-sdk/apps/daloniil_test/static/assets/spines/symbolsBounce',
);

const SETTLE_SCALE = 0.78;
const SETTLE_DURATION = 0.15;

const CANONICAL_BOUNCE = [
	{},
	{ time: 0.0667, x: 1.15, y: 0.85 },
	{ time: 0.1333 },
	{ time: 0.2, x: 0.85, y: 1.15 },
	{ time: 0.2667 },
	{ time: 0.3333, x: 1.1, y: 0.9 },
	{ time: 0.4, x: 0.95, y: 1.05 },
	{ time: 0.4667 },
];

const FILES = [
	'High_1.json',
	'High_2.json',
	'High_3.json',
	'High_4.json',
	'Low_1.json',
	'Low_2.json',
	'Low_3.json',
	'Low_4.json',
];

const lastTime = CANONICAL_BOUNCE[CANONICAL_BOUNCE.length - 1].time ?? 0;
const settleTime = +(lastTime + SETTLE_DURATION).toFixed(4);
const timeline = [...CANONICAL_BOUNCE, { time: settleTime, x: SETTLE_SCALE, y: SETTLE_SCALE }];

// Move the scale bone + its attachment so they both pivot around the
// origin (0, 0). In the designer's source the bone sits at y:-90 and the
// attachment at y:90, which is fine at scale 1 (their sum is 0) but the
// scale bone's vertical scale then shifts the attachment as
// `final_y = -90 + 90 * sy`. Any sy < 1 lifts the symbol upward — that's
// exactly the "jump" we see when land → static fires.
// Putting both at y:0 makes the attachment scale around its own centre,
// keeping the symbol's screen position constant regardless of the
// settle/bounce scale.
const centreBone = (bone) => {
	if (bone.name === 'scale') return { ...bone, y: 0 };
	return bone;
};
const centreAttachments = (skin) => {
	const next = { name: skin.name, attachments: {} };
	for (const [slot, atts] of Object.entries(skin.attachments)) {
		next.attachments[slot] = {};
		for (const [attName, att] of Object.entries(atts)) {
			next.attachments[slot][attName] = { ...att, y: 0 };
		}
	}
	return next;
};

for (const file of FILES) {
	const path = join(DIR, file);
	const json = JSON.parse(readFileSync(path, 'utf8'));
	const bounce = json.animations?.bounce;
	if (!bounce?.bones?.scale) {
		console.warn(`Skip ${file} (no bounce.bones.scale)`);
		continue;
	}
	json.bones = (json.bones || []).map(centreBone);
	json.skins = (json.skins || []).map(centreAttachments);
	bounce.bones.scale.scale = timeline;
	writeFileSync(path, JSON.stringify(json));
	const peak = CANONICAL_BOUNCE.reduce(
		(m, kf) => Math.max(m, Math.abs((kf.x ?? 1) - 1), Math.abs((kf.y ?? 1) - 1)),
		0,
	);
	console.log(
		`Wrote ${file} — peak ±${peak.toFixed(2)}, settle ${SETTLE_SCALE} at ${settleTime}s, pivot centred`,
	);
}
