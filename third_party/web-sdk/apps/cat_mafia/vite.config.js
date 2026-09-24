// @ts-ignore
import config from 'config-vite';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Run Cat Mafia math-sdk `eval_dev_board.py` for Dev-menu curtain QA. */
function catMafiaMathEvalPlugin() {
	const gameDir = path.resolve(__dirname, '../../../math-sdk/games/0_0_cat_mafia');
	const script = path.join(gameDir, 'tools/eval_dev_board.py');
	const pyCandidates = [
		process.env.CSMATH_PYTHON,
		'/tmp/csmath_venv/bin/python',
		'python3',
	].filter(Boolean);

	const resolvePython = () => {
		for (const candidate of pyCandidates) {
			if (candidate === 'python3') return candidate;
			if (fs.existsSync(candidate)) return candidate;
		}
		return 'python3';
	};

	return {
		name: 'cat-mafia-math-eval',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const url = (req.url || '').split('?')[0];
				if (url !== '/__math/eval-board') return next();
				if (req.method !== 'POST') {
					res.statusCode = 405;
					res.end(JSON.stringify({ error: 'POST only' }));
					return;
				}
				const chunks = [];
				req.on('data', (c) => chunks.push(c));
				req.on('end', () => {
					try {
						if (!fs.existsSync(script)) {
							res.statusCode = 500;
							res.setHeader('content-type', 'application/json');
							res.end(JSON.stringify({ error: `missing ${script}` }));
							return;
						}
						const body = Buffer.concat(chunks);
						const py = resolvePython();
						const out = execFileSync(py, [script], {
							cwd: gameDir,
							input: body,
							encoding: 'utf8',
							timeout: 20_000,
							env: {
								...process.env,
								PYTHONPATH: `../..:.${process.env.PYTHONPATH ? `:${process.env.PYTHONPATH}` : ''}`,
								PATH: process.env.PATH,
							},
						});
						res.statusCode = 200;
						res.setHeader('content-type', 'application/json');
						res.end(out);
					} catch (err) {
						const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr) : '';
						let message = err instanceof Error ? err.message : String(err);
						if (stderr) {
							try {
								const parsed = JSON.parse(stderr);
								if (parsed?.error) message = parsed.error;
							} catch {
								message = stderr.trim() || message;
							}
						}
						res.statusCode = 500;
						res.setHeader('content-type', 'application/json');
						res.end(JSON.stringify({ error: message }));
					}
				});
			});
		},
	};
}

/** Drop accidental `*.bak` copies under build output (never ship rollbacks). */
function omitBakFromBuild() {
	return {
		name: 'omit-bak-from-build',
		apply: 'build',
		closeBundle() {
			for (const root of ['build', path.join('.svelte-kit', 'output')]) {
				stripBakFiles(root);
			}
		},
	};
}

function stripBakFiles(dir) {
	if (!fs.existsSync(dir)) return;
	for (const name of fs.readdirSync(dir)) {
		const full = path.join(dir, name);
		let st;
		try {
			st = fs.statSync(full);
		} catch {
			continue;
		}
		if (st.isDirectory()) stripBakFiles(full);
		else if (name.endsWith('.bak')) fs.unlinkSync(full);
	}
}

export default () => {
	const cfg = config();
	return {
		...cfg,
		plugins: [...(cfg.plugins ?? []), catMafiaMathEvalPlugin(), omitBakFromBuild()],
	};
};
