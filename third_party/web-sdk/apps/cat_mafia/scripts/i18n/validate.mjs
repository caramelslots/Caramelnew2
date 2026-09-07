import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

const extractKeys = (file) => {
	const content = readFileSync(file, 'utf8');
	return [...content.matchAll(/^\s*([A-Z_][A-Z0-9_]*|'[^']+'):/gm)].map((m) =>
		m[1].replace(/^'|'$/g, ''),
	);
};

const dirs = [
	['game', join(root, 'src/i18n/messagesMap')],
	['ui-pixi', join(root, '../../packages/components-ui-pixi/src/i18n/messagesMap')],
	['ui-html', join(root, '../../packages/components-ui-html/src/i18n/messagesMap')],
];

let ok = true;

for (const [label, dir] of dirs) {
	const enKeys = extractKeys(join(dir, 'en.ts'));
	const locales = readdirSync(dir)
		.filter((f) => f.endsWith('.ts') && f !== 'index.ts')
		.map((f) => f.replace(/\.ts$/, ''));

	for (const loc of locales) {
		const keys = extractKeys(join(dir, `${loc}.ts`));
		const missing = enKeys.filter((k) => !keys.includes(k));
		const extra = keys.filter((k) => !enKeys.includes(k));
		if (missing.length || extra.length) {
			ok = false;
			console.error(`[${label}/${loc}] missing:`, missing, 'extra:', extra);
		}
	}
	console.log(`[${label}] ${locales.length} locales OK`);
}

if (!ok) process.exit(1);
console.log('All i18n keys match en.ts across all locales.');
