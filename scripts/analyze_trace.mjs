// Анализатор Chrome Performance trace (.json).
// Агрегирует: длинные задачи, время по категориям событий, и (главное)
// self-time по функциям из CPU-профиля (ProfileChunk/Profile).
import fs from 'node:fs';

const path = process.argv[2];
if (!path) {
	console.error('usage: node analyze_trace.mjs <trace.json>');
	process.exit(1);
}

console.error('reading', path);
const raw = fs.readFileSync(path, 'utf8');
console.error('parsing', (raw.length / 1e6).toFixed(1), 'MB');
const data = JSON.parse(raw);
const events = Array.isArray(data) ? data : data.traceEvents;
console.error('events:', events.length);

// ---- 1. Complete events ('X') aggregated by name (total dur) ----
const byName = new Map();
let tracingStart = Infinity;
let tracingEnd = -Infinity;
const longTasks = [];

for (const e of events) {
	if (e.ts != null) {
		if (e.ts < tracingStart) tracingStart = e.ts;
		if (e.ts + (e.dur || 0) > tracingEnd) tracingEnd = e.ts + (e.dur || 0);
	}
	if (e.ph === 'X' && e.dur != null) {
		const n = e.name;
		const cur = byName.get(n) || { total: 0, count: 0, max: 0 };
		cur.total += e.dur;
		cur.count += 1;
		if (e.dur > cur.max) cur.max = e.dur;
		byName.set(n, cur);
	}
	if (e.name === 'RunTask' && e.dur != null && e.dur > 50000) {
		longTasks.push(e.dur);
	}
}

const durationMs = (tracingEnd - tracingStart) / 1000;
console.log('\n=== TRACE SPAN ===');
console.log('duration:', durationMs.toFixed(0), 'ms');

console.log('\n=== TOP EVENT TYPES BY TOTAL DURATION (X events, includes children) ===');
[...byName.entries()]
	.sort((a, b) => b[1].total - a[1].total)
	.slice(0, 25)
	.forEach(([n, v]) =>
		console.log(
			`${(v.total / 1000).toFixed(0).padStart(8)} ms  x${String(v.count).padStart(6)}  max ${(v.max / 1000).toFixed(1).padStart(7)} ms  ${n}`,
		),
	);

console.log('\n=== LONG RunTask (>50ms) ===');
longTasks.sort((a, b) => b - a);
console.log('count:', longTasks.length);
longTasks.slice(0, 20).forEach((d) => console.log(`  ${(d / 1000).toFixed(1)} ms`));

// ---- 2. CPU profile self-time by function ----
// Chrome trace embeds CPU profile via 'Profile' (with .data.startTime) and
// 'ProfileChunk' events whose .data.cpuProfile has { nodes, samples, timeDeltas }.
const nodeById = new Map(); // id -> { callFrame, parent }
const selfByNode = new Map(); // id -> total self time (us)
let lastTs = null;
let pendingSamples = [];
let pendingDeltas = [];

const callFrameKey = (cf) => {
	const fn = cf.functionName || '(anonymous)';
	let url = cf.url || '';
	url = url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');
	return `${fn}  ${url}:${cf.lineNumber ?? ''}`;
};

for (const e of events) {
	if (e.name === 'ProfileChunk' || e.name === 'Profile') {
		const d = e.args?.data;
		if (!d) continue;
		const cp = d.cpuProfile || d;
		// nodes/samples live in cpuProfile; timeDeltas live at data level.
		if (cp.nodes) {
			for (const node of cp.nodes) nodeById.set(node.id, node);
		}
		if (cp.samples) pendingSamples.push(...cp.samples);
		const deltas = d.timeDeltas || cp.timeDeltas;
		if (deltas) pendingDeltas.push(...deltas);
	}
}

// Accumulate self time per node id using samples + timeDeltas.
const selfUsByKey = new Map();
const totalSamples = Math.min(pendingSamples.length, pendingDeltas.length);
for (let i = 0; i < totalSamples; i++) {
	const id = pendingSamples[i];
	const dt = pendingDeltas[i] || 0;
	const node = nodeById.get(id);
	if (!node) continue;
	const key = callFrameKey(node.callFrame);
	selfUsByKey.set(key, (selfUsByKey.get(key) || 0) + dt);
}

console.log('\n=== CPU PROFILE: SELF TIME BY FUNCTION (top 40) ===');
console.log('samples:', totalSamples, 'nodes:', nodeById.size);
let totalSelf = 0;
for (const v of selfUsByKey.values()) totalSelf += v;
[...selfUsByKey.entries()]
	.sort((a, b) => b[1] - a[1])
	.slice(0, 40)
	.forEach(([k, us]) =>
		console.log(`${(us / 1000).toFixed(0).padStart(8)} ms  ${((us / totalSelf) * 100).toFixed(1).padStart(5)}%  ${k}`),
	);

// ---- 3. Aggregate self time by URL (file) ----
const selfByUrl = new Map();
for (let i = 0; i < totalSamples; i++) {
	const id = pendingSamples[i];
	const dt = pendingDeltas[i] || 0;
	const node = nodeById.get(id);
	if (!node) continue;
	let url = node.callFrame.url || '(no url)';
	url = url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');
	selfByUrl.set(url, (selfByUrl.get(url) || 0) + dt);
}
console.log('\n=== CPU PROFILE: SELF TIME BY FILE (top 25) ===');
[...selfByUrl.entries()]
	.sort((a, b) => b[1] - a[1])
	.slice(0, 25)
	.forEach(([k, us]) =>
		console.log(`${(us / 1000).toFixed(0).padStart(8)} ms  ${((us / totalSelf) * 100).toFixed(1).padStart(5)}%  ${k}`),
	);

// ---- 4. Breakdown WITHIN the longest RunTasks (jank windows) ----
// Reconstruct sample timestamps from the profile start + cumulative timeDeltas,
// then for each long task window attribute self-time by function.
const profileStart = (() => {
	for (const e of events) {
		if (e.name === 'Profile' && e.args?.data?.startTime != null) return e.args.data.startTime;
	}
	// Fallback: first ProfileChunk ts.
	for (const e of events) if (e.name === 'ProfileChunk') return e.ts;
	return 0;
})();

// Build absolute sample timestamps (us).
const sampleTs = new Array(totalSamples);
let acc = profileStart;
for (let i = 0; i < totalSamples; i++) {
	acc += pendingDeltas[i] || 0;
	sampleTs[i] = acc;
}

// Longest task windows (ph 'X' RunTask).
const taskWindows = events
	.filter((e) => e.name === 'RunTask' && e.ph === 'X' && e.dur != null)
	.sort((a, b) => b.dur - a.dur)
	.slice(0, 6);

const keyForNode = (id) => {
	const n = nodeById.get(id);
	return n ? callFrameKey(n.callFrame) : '(unknown)';
};

// ---- 5. Time-bucketed self-time for specific functions (leak/growth check) ----
// Splits the whole sample timeline into N equal windows and reports, per window,
// the self-time of functions whose name matches a watch list. If a per-frame
// listener is leaking, its self-time grows window over window.
{
	const WATCH = ['_tick', 'requestAnimationFrame', 'updateParticle', '(garbage collector)'];
	const N = 10;
	const firstTs = sampleTs[0] ?? 0;
	const lastTs = sampleTs[totalSamples - 1] ?? 0;
	const span = lastTs - firstTs || 1;
	const bucketUs = span / N;
	const buckets = Array.from({ length: N }, () => new Map());
	for (let i = 0; i < totalSamples; i++) {
		let bi = Math.floor((sampleTs[i] - firstTs) / bucketUs);
		if (bi < 0) bi = 0;
		if (bi >= N) bi = N - 1;
		const name = (nodeById.get(pendingSamples[i])?.callFrame?.functionName) || '';
		for (const w of WATCH) {
			if (name === w) {
				const m = buckets[bi];
				m.set(w, (m.get(w) || 0) + (pendingDeltas[i] || 0));
			}
		}
	}
	console.log(`\n=== SELF-TIME OVER TIME (${N} windows, ~${(bucketUs / 1000).toFixed(0)}ms each) ===`);
	console.log('window  ' + WATCH.map((w) => w.padStart(14)).join(''));
	for (let b = 0; b < N; b++) {
		const row = WATCH.map((w) => `${((buckets[b].get(w) || 0) / 1000).toFixed(0)}ms`.padStart(14)).join('');
		console.log(`  #${String(b + 1).padStart(2)}  ${row}`);
	}
}

console.log('\n=== SELF TIME INSIDE THE 6 LONGEST RunTasks (jank windows) ===');
for (const t of taskWindows) {
	const start = t.ts;
	const end = t.ts + t.dur;
	const m = new Map();
	for (let i = 0; i < totalSamples; i++) {
		if (sampleTs[i] >= start && sampleTs[i] <= end) {
			const k = keyForNode(pendingSamples[i]);
			m.set(k, (m.get(k) || 0) + (pendingDeltas[i] || 0));
		}
	}
	console.log(`\n-- RunTask ${(t.dur / 1000).toFixed(0)} ms --`);
	[...m.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.forEach(([k, us]) => console.log(`   ${(us / 1000).toFixed(0).padStart(6)} ms  ${k}`));
}
