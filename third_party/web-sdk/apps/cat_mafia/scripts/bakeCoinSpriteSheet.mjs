/**
 * Bake designer Spine coin clips into TexturePacker sprite sheets.
 *
 *   node scripts/bakeCoinSpriteSheet.mjs
 *
 * Writes:
 *   static/assets/sprites/coin/coins.json + coins.webp
 *   static/assets/sprites/coin/coins_paw.json + coins_paw.webp
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'scripts/bake-coins.html');
const playerJs = path.join(
	root,
	'node_modules/@esotericsoftware/spine-player/dist/iife/spine-player.js',
);
const spineDir = path.join(root, 'static/assets/spines/coins');
const outDir = path.join(root, 'static/assets/sprites/coin');
const srcCopyDir = path.join(root, 'assets/sprites/coin');
const chrome =
	process.env.CHROME_PATH ||
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json',
	'.atlas': 'text/plain; charset=utf-8',
	'.webp': 'image/webp',
	'.png': 'image/png',
};

const readBody = (req) =>
	new Promise((resolve, reject) => {
		const chunks = [];
		req.on('data', (chunk) => chunks.push(chunk));
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});

const startServer = () =>
	new Promise((resolve) => {
		const server = createServer(async (req, res) => {
			try {
				const url = new URL(req.url ?? '/', 'http://127.0.0.1');
				if (req.method === 'POST' && url.pathname === '/save') {
					const payload = JSON.parse((await readBody(req)).toString('utf8'));
					await mkdir(outDir, { recursive: true });
					await mkdir(srcCopyDir, { recursive: true });
					for (const output of payload.outputs ?? []) {
						const jsonPath = path.join(outDir, output.jsonName);
						const imgPath = path.join(outDir, output.imageName);
						await writeFile(jsonPath, `${JSON.stringify(output.json, null, '\t')}\n`);
						await writeFile(imgPath, Buffer.from(output.webp, 'base64'));
						await copyFile(jsonPath, path.join(srcCopyDir, output.jsonName));
						await copyFile(imgPath, path.join(srcCopyDir, output.imageName));
					}
					server.saved = true;
					res.writeHead(200, { 'content-type': 'application/json' });
					res.end('{"ok":true}');
					return;
				}

				let filePath = null;
				if (url.pathname === '/' || url.pathname === '/bake-coins.html') filePath = htmlPath;
				else if (url.pathname === '/vendor/spine-player.js') filePath = playerJs;
				else if (url.pathname.startsWith('/assets/spines/coins/')) {
					filePath = path.join(spineDir, path.basename(url.pathname));
				}
				if (!filePath) {
					res.writeHead(404);
					res.end('not found');
					return;
				}
				const body = await readFile(filePath);
				res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
				res.end(body);
			} catch (error) {
				res.writeHead(500);
				res.end(String(error));
			}
		});
		server.listen(0, '127.0.0.1', () => {
			resolve({ server, port: server.address().port });
		});
	});

const waitForSave = (server, timeoutMs) =>
	new Promise((resolve, reject) => {
		const started = Date.now();
		const tick = () => {
			if (server.saved) {
				resolve();
				return;
			}
			if (Date.now() - started > timeoutMs) {
				reject(new Error('bake timed out'));
				return;
			}
			setTimeout(tick, 250);
		};
		tick();
	});

const { server, port } = await startServer();
const url = `http://127.0.0.1:${port}/bake-coins.html`;
console.log(`Baking coins via ${url}`);

const chromeArgs = [
	'--headless=new',
	'--disable-gpu',
	'--hide-scrollbars',
	'--no-first-run',
	'--no-default-browser-check',
	'--disable-background-networking',
	'--use-angle=metal',
	'--enable-webgl',
	'--ignore-gpu-blocklist',
	`--user-data-dir=${path.join(root, '.tmp-chrome-bake')}`,
	url,
];

const child = spawn(chrome, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', (chunk) => {
	stderr += chunk.toString();
});

if (process.env.BAKE_KEEP) {
	console.log('Server kept for debugging. Open', url);
	await new Promise(() => {});
}

try {
	await waitForSave(server, 90000);
	console.log('Wrote sprite sheets to', outDir);
} catch (error) {
	console.error(error);
	if (stderr) console.error(stderr.slice(-2000));
	process.exitCode = 1;
} finally {
	if (!process.env.BAKE_KEEP) {
		child.kill('SIGKILL');
		server.close();
	}
}
