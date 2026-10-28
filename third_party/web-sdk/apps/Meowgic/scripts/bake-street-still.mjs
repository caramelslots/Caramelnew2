/**
 * Bake the basegame street (bg_only + bg_platform + bg_table, purple skin)
 * into static/assets/sprites/background/day.webp for the loader still.
 *
 * Usage (from apps/Meowgic):
 *   node scripts/bake-street-still.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const STATIC_ROOT = path.join(APP_ROOT, 'static');
const OUT_WEBP = path.join(STATIC_ROOT, 'assets/sprites/background/day.webp');
const OUT_PNG = path.join(tmpdir(), `meowgic-street-still-${Date.now()}.png`);

const CHROME =
	process.env.CHROME_PATH ||
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const SPINE_PLAYER_DIR = path.resolve(
	APP_ROOT,
	'../../node_modules/.pnpm/@esotericsoftware+spine-player@4.3.13/node_modules/@esotericsoftware/spine-player/dist',
);

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.atlas': 'text/plain; charset=utf-8',
	'.webp': 'image/webp',
	'.png': 'image/png',
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const runCwebp = (pngPath, webpPath) =>
	new Promise((resolve, reject) => {
		const child = spawn('cwebp', ['-q', '85', '-m', '6', pngPath, '-o', webpPath], {
			stdio: 'inherit',
		});
		child.on('exit', (code) =>
			code === 0 ? resolve() : reject(new Error(`cwebp exited ${code}`)),
		);
	});

const run = async () => {
	if (!fs.existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}`);
	if (!fs.existsSync(path.join(SPINE_PLAYER_DIR, 'iife/spine-player.js'))) {
		throw new Error(`spine-player not found at ${SPINE_PLAYER_DIR}`);
	}

	/** @type {{ resolve: (v: any) => void, reject: (e: Error) => void } | null} */
	let bakeWait = null;
	const bakePromise = new Promise((resolve, reject) => {
		bakeWait = { resolve, reject };
	});

	const server = http.createServer((req, res) => {
		const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

		if (urlPath === '/__bake_result__' && req.method === 'POST') {
			const chunks = [];
			req.on('data', (c) => chunks.push(c));
			req.on('end', () => {
				try {
					const dataUrl = Buffer.concat(chunks).toString('utf8');
					const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
					if (!m) throw new Error('expected png data URL');
					fs.writeFileSync(OUT_PNG, Buffer.from(m[1], 'base64'));
					res.writeHead(200);
					res.end('ok');
					bakeWait?.resolve({ ok: true });
				} catch (err) {
					res.writeHead(500);
					res.end(String(err));
					bakeWait?.reject(err instanceof Error ? err : new Error(String(err)));
				}
			});
			return;
		}

		if (urlPath === '/__bake_error__' && req.method === 'POST') {
			const chunks = [];
			req.on('data', (c) => chunks.push(c));
			req.on('end', () => {
				const msg = Buffer.concat(chunks).toString('utf8');
				res.writeHead(200);
				res.end('ok');
				bakeWait?.reject(new Error(msg));
			});
			return;
		}

		let filePath;
		if (urlPath === '/' || urlPath === '/bake.html') {
			filePath = path.join(__dirname, 'bake-street-still.html');
		} else if (urlPath === '/vendor/spine-player.js') {
			filePath = path.join(SPINE_PLAYER_DIR, 'iife/spine-player.js');
		} else if (urlPath === '/vendor/spine-player.css') {
			filePath = path.join(SPINE_PLAYER_DIR, 'spine-player.css');
		} else if (urlPath.startsWith('/assets/')) {
			filePath = path.join(STATIC_ROOT, urlPath.slice(1));
		} else {
			res.writeHead(404);
			res.end('not found');
			return;
		}

		if (!fs.existsSync(filePath)) {
			res.writeHead(404);
			res.end(`missing ${urlPath}`);
			return;
		}

		const ext = path.extname(filePath);
		res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
		fs.createReadStream(filePath).pipe(res);
	});

	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address();
	const bakeUrl = `http://127.0.0.1:${port}/bake.html`;
	const userDataDir = fs.mkdtempSync(path.join(tmpdir(), 'meowgic-bake-chrome-'));

	console.log(`Baking via ${bakeUrl}`);

	const chrome = spawn(
		CHROME,
		[
			'--headless=new',
			'--enable-webgl',
			'--ignore-gpu-blocklist',
			'--use-angle=swiftshader',
			'--enable-unsafe-swiftshader',
			'--hide-scrollbars',
			'--no-first-run',
			'--no-default-browser-check',
			`--user-data-dir=${userDataDir}`,
			'--window-size=1920,940',
			bakeUrl,
		],
		{ stdio: ['ignore', 'pipe', 'pipe'] },
	);

	let stderr = '';
	chrome.stderr.on('data', (d) => {
		stderr += String(d);
	});
	chrome.stdout.on('data', (d) => {
		stderr += String(d);
	});

	try {
		const result = await Promise.race([
			bakePromise,
			wait(30000).then(() => {
				throw new Error(`timeout\n${stderr.slice(-800)}`);
			}),
		]);
		if (!result?.ok) throw new Error('bake failed');

		await runCwebp(OUT_PNG, OUT_WEBP);
		const stat = fs.statSync(OUT_WEBP);
		console.log(`Wrote ${OUT_WEBP} (${Math.round(stat.size / 1024)} KB)`);
	} finally {
		chrome.kill('SIGKILL');
		server.close();
		fs.rmSync(userDataDir, { recursive: true, force: true });
		fs.rmSync(OUT_PNG, { force: true });
	}
};

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
