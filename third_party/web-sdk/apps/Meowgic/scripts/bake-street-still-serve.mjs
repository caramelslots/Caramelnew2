/**
 * Serve the bake page so it can be opened in a normal browser.
 * When the page posts the PNG, writes day.webp and exits.
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
const PORT = Number(process.env.BAKE_PORT || 5199);

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

const runCwebp = (pngPath, webpPath) =>
	new Promise((resolve, reject) => {
		const child = spawn('cwebp', ['-q', '85', '-m', '6', pngPath, '-o', webpPath], {
			stdio: 'inherit',
		});
		child.on('exit', (code) =>
			code === 0 ? resolve() : reject(new Error(`cwebp exited ${code}`)),
		);
	});

const server = http.createServer((req, res) => {
	const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
	console.log(req.method, urlPath);

	if (urlPath === '/__bake_result__' && req.method === 'POST') {
		const chunks = [];
		req.on('data', (c) => chunks.push(c));
		req.on('end', async () => {
			try {
				const dataUrl = Buffer.concat(chunks).toString('utf8');
				const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
				if (!m) throw new Error('expected png data URL');
				fs.writeFileSync(OUT_PNG, Buffer.from(m[1], 'base64'));
				await runCwebp(OUT_PNG, OUT_WEBP);
				fs.rmSync(OUT_PNG, { force: true });
				const stat = fs.statSync(OUT_WEBP);
				console.log(`Wrote ${OUT_WEBP} (${Math.round(stat.size / 1024)} KB)`);
				res.writeHead(200);
				res.end('ok');
				server.close();
				process.exit(0);
			} catch (err) {
				console.error(err);
				res.writeHead(500);
				res.end(String(err));
				process.exit(1);
			}
		});
		return;
	}

	if (urlPath === '/__bake_error__' && req.method === 'POST') {
		const chunks = [];
		req.on('data', (c) => chunks.push(c));
		req.on('end', () => {
			console.error('BAKE ERROR:', Buffer.concat(chunks).toString('utf8'));
			res.writeHead(200);
			res.end('ok');
			process.exit(1);
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

server.listen(PORT, '127.0.0.1', () => {
	console.log(`Open http://127.0.0.1:${PORT}/bake.html`);
});
