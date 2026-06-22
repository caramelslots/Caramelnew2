import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const pixiRoot = join(root, '../../packages/components-ui-pixi/src/i18n/messagesMap');
const htmlRoot = join(root, '../../packages/components-ui-html/src/i18n/messagesMap');
const gameRoot = join(root, 'src/i18n/messagesMap');

const STAKE_LOCALES = [
	'ar', 'de', 'en', 'es', 'fi', 'fr', 'hi', 'id', 'ja', 'ko', 'pl', 'pt', 'ru', 'tr', 'vi', 'zh',
];

const quote = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const toTsObject = (entries) => {
	const lines = Object.entries(entries).map(([key, value]) => {
		const k = /^[A-Z_][A-Z0-9_]*$/.test(key) ? key : `'${key}'`;
		return `\t${k}: ${quote(value)},`;
	});
	return `export default {\n${lines.join('\n')}\n};\n`;
};

const writeLocaleFile = (dir, locale, entries) => {
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `${locale}.ts`), toTsObject(entries), 'utf8');
};

const loadDir = async (subdir) => {
	const dir = join(__dirname, 'data', subdir);
	const out = {};
	for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
		const locale = file.replace(/\.mjs$/, '');
		out[locale] = (await import(pathToFileURL(join(dir, file)).href)).default;
	}
	return out;
};

const gameLocales = await loadDir('game');
const { uiPixi, uiHtml } = await import(pathToFileURL(join(__dirname, 'data/ui-translations.mjs')).href);
const uiPixiLocales = uiPixi;
const uiHtmlLocales = uiHtml;

for (const locale of STAKE_LOCALES) {
	if (gameLocales[locale]) writeLocaleFile(gameRoot, locale, gameLocales[locale]);
	if (uiPixiLocales[locale]) writeLocaleFile(pixiRoot, locale, uiPixiLocales[locale]);
	if (uiHtmlLocales[locale]) writeLocaleFile(htmlRoot, locale, uiHtmlLocales[locale]);
}

const gameImports = STAKE_LOCALES.map((l) => `import ${l} from './${l}';`).join('\n');
const gameBody = STAKE_LOCALES.map((l) => `\t${l},`).join('\n');
const gameIndex = `import { mergeMessagesMaps } from 'utils-shared/i18n';
import { messagesMap as messagesMapUiPixi } from 'components-ui-pixi';
import { messagesMap as messagesMapUiHtml } from 'components-ui-html';

${gameImports}

const messagesMapGame = {
${gameBody}
};

const messagesMap = mergeMessagesMaps([messagesMapGame, messagesMapUiPixi, messagesMapUiHtml]);

export default messagesMap;
`;
writeFileSync(join(gameRoot, 'index.ts'), gameIndex, 'utf8');

const pixiImports = STAKE_LOCALES.map((l) => `import ${l} from './${l}';`).join('\n');
const pixiBody = STAKE_LOCALES.map((l) => `\t${l},`).join('\n');
writeFileSync(
	join(pixiRoot, 'index.ts'),
	`${pixiImports}\n\nconst messagesMap = {\n${pixiBody}\n};\n\nexport default messagesMap;\n`,
);

const htmlImports = STAKE_LOCALES.map((l) => `import ${l} from './${l}';`).join('\n');
const htmlBody = STAKE_LOCALES.map((l) => `\t${l},`).join('\n');
writeFileSync(
	join(htmlRoot, 'index.ts'),
	`${htmlImports}\n\nconst messagesMap = {\n${htmlBody}\n};\n\nexport default messagesMap;\n`,
);

console.log('Generated locales:', STAKE_LOCALES.join(', '));
