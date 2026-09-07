#!/usr/bin/env node
/**
 * Audit static/assets for files not referenced by daloniil_test source code.
 * Run: node scripts/auditUnusedAssets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const STATIC_ASSETS = path.join(APP_ROOT, 'static/assets');
const SRC_ROOT = path.join(APP_ROOT, 'src');

const SKIP_FILES = new Set(['.DS_Store', 'index.ts']);

function walkFiles(dir, acc = []) {
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, ent.name);
		if (ent.isDirectory()) walkFiles(p, acc);
		else if (!SKIP_FILES.has(ent.name)) acc.push(p);
	}
	return acc;
}

function walkSrcFiles(dir, acc = []) {
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		if (ent.name === 'node_modules') continue;
		const p = path.join(dir, ent.name);
		if (ent.isDirectory()) walkSrcFiles(p, acc);
		else if (/\.(ts|svelte|js|mjs)$/.test(ent.name)) acc.push(p);
	}
	return acc;
}

const assetFiles = walkFiles(STATIC_ASSETS).map((f) =>
	path.relative(STATIC_ASSETS, f).replace(/\\/g, '/'),
);

const srcFiles = walkSrcFiles(SRC_ROOT);
const srcText = srcFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

// --- Parse assets.ts ---
const assetsTsPath = path.join(APP_ROOT, 'src/game/assets.ts');
const assetsTs = fs.readFileSync(assetsTsPath, 'utf8');

const assetKeys = [...assetsTs.matchAll(/^\t([A-Za-z0-9_]+):\s*\{/gm)].map((m) => m[1]);

const referencedPaths = new Set();

function addRef(p) {
	if (!p) return;
	referencedPaths.add(p.replace(/\\/g, '/'));
}

// assetUrl('assets/...') and similar
for (const m of assetsTs.matchAll(/assetUrl\(['"]([^'"]+)['"]\)/g)) addRef(m[1].replace(/^assets\//, ''));
for (const m of assetsTs.matchAll(/new URL\(['"]([^'"]+)['"],/g)) {
	const rel = m[1].replace(/^\.\.\/\.\.\/assets\//, '');
	addRef(rel);
}

// uiHtmlAssetManifest + loaderCardAssets
for (const rel of ['src/game/uiHtmlAssetManifest.ts', 'src/game/loaderCardAssets.ts']) {
	const text = fs.readFileSync(path.join(APP_ROOT, rel), 'utf8');
	for (const m of text.matchAll(/uiHtmlAssetUrl\(['"]([^'"]+)['"]\)/g)) {
		addRef(`sprites/ui/${m[1]}`);
	}
	for (const m of text.matchAll(/BASE_URL\}assets\/([^'"]+)/g)) addRef(m[1]);
	for (const m of text.matchAll(/assetBase}\/([^'"]+)/g)) addRef(`sprites/ui/loader/${m[1]}`);
}

// BootstrapLoader
const bootstrap = fs.readFileSync(path.join(APP_ROOT, 'src/components/BootstrapLoader.svelte'), 'utf8');
for (const m of bootstrap.matchAll(/resolveStaticUrl\(['"]([^'"]+)['"]\)/g)) {
	addRef(m[1].replace(/^assets\//, ''));
}

// Direct src references to assets/ paths
for (const m of srcText.matchAll(/assets\/([a-zA-Z0-9_./-]+)/g)) addRef(m[1]);

// Sprite keys in LoadingScreen etc.
for (const m of srcText.matchAll(/key="([^"]+\.(?:png|webp))"/g)) {
	// These are spritesheet frame names — handled via parent json
}

// Expand atlas / json / fnt dependencies
function expandDependencies() {
	let changed = true;
	while (changed) {
		changed = false;
		for (const rel of [...referencedPaths]) {
			const abs = path.join(STATIC_ASSETS, rel);
			if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
			const ext = path.extname(rel).toLowerCase();
			const dir = path.dirname(rel);
			const text = fs.readFileSync(abs, 'utf8');

			if (ext === '.atlas') {
				for (const line of text.split('\n')) {
					const t = line.trim();
					if (!t || t.endsWith('.atlas') || t.startsWith('size:') || t.startsWith('filter:') || t.startsWith('repeat:') || t.includes(':')) continue;
					if (/\.(png|webp|jpg)$/i.test(t)) {
						const before = referencedPaths.size;
						addRef(path.join(dir, t).replace(/\\/g, '/'));
						if (referencedPaths.size > before) changed = true;
					}
				}
			}

			if (ext === '.json' && !rel.includes('sounds.json')) {
				try {
					const json = JSON.parse(text);
					// Pixi spritesheet
					if (json.meta?.image) {
						const before = referencedPaths.size;
						addRef(path.join(dir, json.meta.image).replace(/\\/g, '/'));
						if (referencedPaths.size > before) changed = true;
					}
					// BMFont json
					if (json.atlasName) {
						const before = referencedPaths.size;
						addRef(path.join(dir, json.atlasName).replace(/\\/g, '/'));
						if (referencedPaths.size > before) changed = true;
					}
				} catch {
					/* noop */
				}
			}

			if (ext === '.xml') {
				for (const m of text.matchAll(/file="([^"]+)"/g)) {
					const before = referencedPaths.size;
					addRef(path.join(dir, m[1]).replace(/\\/g, '/'));
					if (referencedPaths.size > before) changed = true;
				}
			}

			if (ext === '.fnt') {
				for (const line of text.split('\n')) {
					const m = line.match(/^page id=\d+ file="([^"]+)"/);
					if (m) {
						const before = referencedPaths.size;
						addRef(path.join(dir, m[1]).replace(/\\/g, '/'));
						if (referencedPaths.size > before) changed = true;
					}
				}
			}

			// sounds.json references audio files
			if (rel === 'audio/sounds.json') {
				try {
					const json = JSON.parse(text);
					const urls = JSON.stringify(json);
					for (const fmt of ['sounds.ogg', 'sounds.mp3', 'sounds.m4a', 'sounds.ac3']) {
						if (urls.includes(fmt) || true) {
							const before = referencedPaths.size;
							addRef(`audio/${fmt}`);
							if (referencedPaths.size > before) changed = true;
						}
					}
				} catch {
					/* noop */
				}
			}

			// Spine skeleton json may reference atlas implicitly via same dir — already added via assets.ts
			// Add companion png/webp if atlas referenced
			if (ext === '.atlas') {
				const base = rel.replace(/\.atlas$/, '');
				for (const img of ['.png', '.webp']) {
					const candidate = base + img;
					if (fs.existsSync(path.join(STATIC_ASSETS, candidate))) {
						const before = referencedPaths.size;
						addRef(candidate);
						if (referencedPaths.size > before) changed = true;
					}
				}
			}
		}
	}
}

expandDependencies();

// Also mark files whose basename appears in src (conservative secondary check)
for (const rel of assetFiles) {
	const base = path.basename(rel);
	const noExt = base.replace(/\.[^.]+$/, '');
	if (srcText.includes(base) || srcText.includes(noExt)) referencedPaths.add(rel);
}

const unreferenced = assetFiles.filter((f) => !referencedPaths.has(f));

// Unused asset keys — keys in assets.ts not used as SpineProvider/Sprite key or assets.X in src (excluding assets.ts)
const srcWithoutAssetsDef = srcFiles
	.filter((f) => f !== assetsTsPath)
	.map((f) => fs.readFileSync(f, 'utf8'))
	.join('\n');

function keyUsed(k) {
	const patterns = [
		new RegExp(`\\bkey="${k}"`),
		new RegExp(`\\bkey='${k}'`),
		new RegExp(`\\bkey=\\{["']${k}["']\\}`),
		new RegExp(`assets\\.${k}\\b`),
		new RegExp(`['"]${k}['"]`),
		new RegExp(`assetKey:\\s*['"]${k}['"]`),
	];
	// H1Img etc. used via symbolInfo
	if (/Img$/.test(k)) {
		const sym = k.replace(/Img$/, '');
		if (new RegExp(`name:\\s*['"]${sym}['"]`).test(srcWithoutAssetsDef)) return true;
	}
	if (k === 'WWin' && srcWithoutAssetsDef.includes('WWin')) return true;
	if (k === 'BWin' && srcWithoutAssetsDef.includes('BWin')) return true;
	return patterns.some((p) => p.test(srcWithoutAssetsDef));
}

const unusedKeys = assetKeys.filter((k) => !keyUsed(k));

// Group unreferenced by category
function category(rel) {
	if (rel.startsWith('fonts/')) return 'fonts';
	if (rel.startsWith('spines/')) return 'spines';
	if (rel.startsWith('sprites/ui/')) return 'sprites/ui';
	if (rel.startsWith('sprites/')) return 'sprites';
	if (rel.startsWith('audio/')) return 'audio';
	return 'other';
}

const grouped = {};
for (const f of unreferenced) {
	const cat = category(f);
	(grouped[cat] ??= []).push(f);
}

// Duplicate assets/ folder (dev copies)
const devAssetsRoot = path.join(APP_ROOT, 'assets');
let devOnlyFiles = [];
if (fs.existsSync(devAssetsRoot)) {
	devOnlyFiles = walkFiles(devAssetsRoot).map((f) => path.relative(devAssetsRoot, f).replace(/\\/g, '/'));
}

const report = {
	generatedAt: new Date().toISOString(),
	totalAssetFiles: assetFiles.length,
	referencedCount: assetFiles.length - unreferenced.length,
	unreferencedCount: unreferenced.length,
	unusedAssetKeys: unusedKeys,
	groupedUnreferenced: grouped,
	allUnreferenced: unreferenced.sort(),
	devAssetsFolder: devOnlyFiles,
};

console.log(JSON.stringify(report, null, 2));
