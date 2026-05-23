// Scales every keyframe of the `bounce` animation in each per-symbol JSON
// under `static/assets/spines/symbolsBounce/` by BASE_SCALE.
//
// Why: the source `bounce` animation rests at scale (1,1) at start/end,
// but our static webp sprites visually render the symbol artwork at
// ~BASE_SCALE of the spine's native size (different padding ratios in the
// two exports). Lifting the spine baseline to BASE_SCALE makes the
// transition spin→land and land→static seamless — no visual size jump.
//
// Tune BASE_SCALE (try 0.80–0.90) until both ends look continuous.
//
// Usage: node third_party/web-sdk/apps/daloniil_test/scripts/tuneBounceScale.mjs [base_scale]
// Default base_scale = 0.82

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPINES_DIR = resolve(__dirname, '../static/assets/spines/symbolsBounce');

const BASE_SCALE = Number(process.argv[2] ?? 0.82);
if (!Number.isFinite(BASE_SCALE) || BASE_SCALE <= 0) {
	console.error(`Invalid BASE_SCALE: ${process.argv[2]}`);
	process.exit(1);
}

const round = (n) => Math.round(n * 10000) / 10000;

/**
 * Returns a re-scaled scale-channel timeline where every keyframe is
 * anchored to BASE_SCALE. Empty/default keyframes (which would otherwise
 * fall back to setup pose 1,1) are filled in explicitly.
 */
function rescaleTimeline(timeline) {
	if (!Array.isArray(timeline)) return timeline;
	return timeline.map((kf) => {
		const next = { ...kf };
		const hasX = typeof next.x === 'number';
		const hasY = typeof next.y === 'number';
		const baseX = hasX ? next.x : 1;
		const baseY = hasY ? next.y : 1;
		next.x = round(baseX * BASE_SCALE);
		next.y = round(baseY * BASE_SCALE);
		return next;
	});
}

const files = readdirSync(SPINES_DIR).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
	console.error(`No JSON files found in ${SPINES_DIR}`);
	process.exit(1);
}

for (const file of files) {
	const path = join(SPINES_DIR, file);
	const json = JSON.parse(readFileSync(path, 'utf8'));
	const anim = json.animations?.bounce;
	if (!anim?.bones?.scale?.scale) {
		console.warn(`Skipping ${file} (no bounce/scale timeline)`);
		continue;
	}
	anim.bones.scale.scale = rescaleTimeline(anim.bones.scale.scale);
	writeFileSync(path, JSON.stringify(json));
	console.log(`Updated ${file} (BASE_SCALE=${BASE_SCALE})`);
}

console.log(`\nDone. Reload the browser to pick up the new bounce baseline.`);
