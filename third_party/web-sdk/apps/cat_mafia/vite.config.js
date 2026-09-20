// @ts-ignore
import config from 'config-vite';
import fs from 'node:fs';
import path from 'node:path';

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
		plugins: [...(cfg.plugins ?? []), omitBakFromBuild()],
	};
};
