import { readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
	REMOVE_GAME_INFO_KEYS,
	gameInfo,
	socialGameInfo,
	loaderCards,
} from './data/cat-mafia-game-info.mjs';
import {
	targetPick,
	gameInfoFixes,
	loaderCardsFixes,
	socialGameInfoFixes,
} from './data/cat-mafia-locale-fixes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gameDir = join(__dirname, 'data/game');
const socialKeysPath = join(__dirname, 'data/social-keys.mjs');

const quote = (value) =>
	`'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;

const toMjsObject = (entries) => {
	const lines = Object.entries(entries).map(([key, value]) => {
		const k = /^[A-Z_][A-Z0-9_]*$/.test(key) ? key : `'${key}'`;
		return `\t${k}: ${quote(value)},`;
	});
	return `export default {\n${lines.join('\n')}\n};\n`;
};

const serializeLocaleConst = (name, entries) => {
	const lines = Object.entries(entries).map(([key, value]) => {
		const k = /^[A-Z_][A-Z0-9_]*$/.test(key) ? key : `'${key}'`;
		return `\t${k}: ${quote(value)},`;
	});
	return `const ${name} = {\n${lines.join('\n')}\n};`;
};

const serializeSocialKeys = (locales) => {
	const localeNames = Object.keys(locales);
	const blocks = localeNames.map((name) => serializeLocaleConst(name, locales[name]));
	const exportBlock = `export default {\n${localeNames.map((name) => `\t${name},`).join('\n')}\n};\n`;
	return `/** Social-mode (_SOCIAL) and related keys merged into each locale at generate time. */\n\n${blocks.join('\n\n')}\n\n${exportBlock}`;
};

for (const file of readdirSync(gameDir)
	.filter((f) => f.endsWith('.mjs'))
	.sort()) {
	const locale = file.replace(/\.mjs$/, '');
	const { default: current } = await import(pathToFileURL(join(gameDir, file)).href);
	const updated = { ...current };

	for (const key of REMOVE_GAME_INFO_KEYS) {
		delete updated[key];
	}

	if (gameInfo[locale]) {
		Object.assign(updated, gameInfo[locale]);
	}
	if (gameInfoFixes[locale]) {
		Object.assign(updated, gameInfoFixes[locale]);
	}
	if (targetPick[locale]) {
		Object.assign(updated, targetPick[locale]);
	}

	if (loaderCards[locale]) {
		Object.assign(updated, loaderCards[locale]);
	}
	if (loaderCardsFixes[locale]) {
		Object.assign(updated, loaderCardsFixes[locale]);
	}

	writeFileSync(join(gameDir, file), toMjsObject(updated), 'utf8');
	console.log(`Updated game/${file}`);
}

const { default: currentSocial } = await import(pathToFileURL(socialKeysPath).href);
const mergedSocial = {};

for (const locale of Object.keys(currentSocial)) {
	mergedSocial[locale] = {
		...currentSocial[locale],
		...(socialGameInfo[locale] ?? {}),
		...(socialGameInfoFixes[locale] ?? {}),
	};
}

writeFileSync(socialKeysPath, serializeSocialKeys(mergedSocial), 'utf8');
console.log('Updated data/social-keys.mjs');

console.log(
	'Applied Cat Mafia i18n for locales:',
	Object.keys(gameInfo).join(', '),
);
