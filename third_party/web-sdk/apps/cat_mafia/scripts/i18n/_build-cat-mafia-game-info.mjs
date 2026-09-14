import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { localePacks } from './_cat-mafia-locale-data.mjs';
import { remainingLocalePacks } from './_cat-mafia-locale-data-remaining.mjs';

const allLocalePacks = { ...remainingLocalePacks, ...localePacks };

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const outPath = join(__dirname, 'data/cat-mafia-game-info.mjs');
const tempOtherLocales = join(__dirname, 'data/_cat-mafia-other-locales.mjs');

const LOCALES = [
	'en', 'ru', 'de', 'es', 'fr', 'pl', 'pt', 'tr', 'vi', 'id', 'fi', 'ar', 'hi', 'ja', 'ko', 'zh',
];

const REMOVE_GAME_INFO_KEYS = [
	'GAME_INFO_MYSTERY_TITLE',
	'GAME_INFO_MYSTERY_BODY',
	'GAME_INFO_PROGRESS_LADDER_TITLE',
	'GAME_INFO_PROGRESS_LADDER_BODY',
];

const GAME_INFO_KEYS = [
	'GAME_INFO_ABOUT_BODY',
	'GAME_INFO_PAYLINES_TITLE',
	'GAME_INFO_PAYLINES_NOTE',
	'GAME_INFO_FS_BODY',
	'GAME_INFO_DUEL_BONUS_TITLE',
	'GAME_INFO_DUEL_BONUS_BODY',
	'GAME_INFO_SUPER_WILD_TITLE',
	'GAME_INFO_SUPER_WILD_BODY',
	'GAME_INFO_PAW_TITLE',
	'GAME_INFO_PAW_BODY',
	'GAME_INFO_BULLET_TITLE',
	'GAME_INFO_BULLET_BODY',
	'GAME_INFO_BET_MODES_BODY',
	'GAME_INFO_CONTROLS_BODY',
];

const SOCIAL_GAME_INFO_KEYS = [
	'GAME_INFO_ABOUT_BODY_SOCIAL',
	'GAME_INFO_PAYLINES_TITLE_SOCIAL',
	'GAME_INFO_PAYLINES_NOTE_SOCIAL',
	'GAME_INFO_WILD_BODY_SOCIAL',
	'GAME_INFO_DUEL_BONUS_BODY_SOCIAL',
	'GAME_INFO_SUPER_WILD_BODY_SOCIAL',
	'GAME_INFO_PAW_BODY_SOCIAL',
	'GAME_INFO_BULLET_BODY_SOCIAL',
	'GAME_INFO_BET_MODES_TITLE_SOCIAL',
	'GAME_INFO_BET_MODES_BODY_SOCIAL',
	'GAME_INFO_CONTROLS_TITLE_SOCIAL',
	'GAME_INFO_CONTROLS_BODY_SOCIAL',
];

const LOADER_CARD_KEYS = [
	'LOADER_CARD_1_TITLE',
	'LOADER_CARD_1_LINE_1',
	'LOADER_CARD_1_LINE_2',
	'LOADER_CARD_1_LINE_3',
	'LOADER_CARD_1_LINE_4',
	'LOADER_CARD_2_TITLE',
	'LOADER_CARD_2_BODY',
	'LOADER_CARD_3_TITLE',
	'LOADER_CARD_3_LINE_1',
	'LOADER_CARD_3_LINE_2',
];

/** Extract a single-quoted TS/JS string value for a key. */
const extractString = (source, key) => {
	const marker = `${key}:`;
	const start = source.indexOf(marker);
	if (start === -1) throw new Error(`Missing key ${key}`);

	let i = start + marker.length;
	while (i < source.length && /\s/.test(source[i])) i += 1;
	if (source[i] !== "'") throw new Error(`Expected string for ${key}`);

	i += 1;
	let value = '';
	while (i < source.length) {
		const ch = source[i];
		if (ch === '\\') {
			const next = source[i + 1];
			if (next === 'n') value += '\n';
			else if (next === 'r') value += '\r';
			else if (next === 't') value += '\t';
			else value += next;
			i += 2;
			continue;
		}
		if (ch === "'") break;
		value += ch;
		i += 1;
	}
	return value;
};

const pickKeys = (source, keys) =>
	Object.fromEntries(keys.map((key) => [key, extractString(source, key)]));

const readTsLocale = (locale) =>
	readFileSync(join(root, `src/i18n/messagesMap/${locale}.ts`), 'utf8');

const readEnMjs = () => readFileSync(join(__dirname, 'data/game/en.mjs'), 'utf8');

const serializeLocaleObject = (entries, indent = '\t\t') => {
	const lines = Object.entries(entries).map(([key, value]) => {
		const k = /^[A-Z_][A-Z0-9_]*$/.test(key) ? key : JSON.stringify(key);
		return `${indent}${k}: ${JSON.stringify(value)},`;
	});
	return `{\n${lines.join('\n')}\n\t}`;
};

const serializeLocales = (obj) => {
	const lines = Object.entries(obj).map(
		([locale, entries]) => `\t${locale}: ${serializeLocaleObject(entries)},`,
	);
	return `{\n${lines.join('\n')}\n}`;
};

const enTs = readTsLocale('en');
const ruTs = readTsLocale('ru');
const enMjs = readEnMjs();

const gameInfo = {
	en: pickKeys(enTs, GAME_INFO_KEYS),
	ru: pickKeys(ruTs, GAME_INFO_KEYS),
};

const socialGameInfo = {
	en: pickKeys(enTs, SOCIAL_GAME_INFO_KEYS),
	ru: pickKeys(ruTs, SOCIAL_GAME_INFO_KEYS),
};

const loaderCards = {};

loaderCards.ru = {
	LOADER_CARD_1_TITLE: 'ФРИСПИНЫ',
	LOADER_CARD_1_LINE_1: 'СОБЕРИТЕ 3+ SCATTER, ЗАТЕМ ВЫБЕРИТЕ МИШЕНЬ',
	LOADER_CARD_1_LINE_2: 'НА 8 / 10 / 12 ФРИСПИНОВ',
	LOADER_CARD_1_LINE_3: 'КУПИТЕ NORMAL ×100 ИЛИ SUPER ×200',
	LOADER_CARD_1_LINE_4: 'ТА ЖЕ СЦЕНА ВЫБОРА МИШЕНИ',
	LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
	LOADER_CARD_2_BODY:
		'PAW ПРЕВРАЩАЕТ РЯД В МОНЕТЫ. SUPER WILD РАСКРЫВАЕТ КОЛОНКУ С ×2 / ×4 / ×6 / ×8. НИКОГДА ОБА В ОДНОМ СПИНЕ.',
	LOADER_CARD_3_TITLE: 'ПАТРОНЫ И РЕВОЛЬВЕР',
	LOADER_CARD_3_LINE_1: 'СОБИРАЙТЕ ПАТРОНЫ ВО ФРИСПИНАХ (МАКС. 6). ПОСЛЕ ОСНОВНЫХ СПИНОВ',
	LOADER_CARD_3_LINE_2: 'КОТ СТРЕЛЯЕТ ПО МИШЕНЯМ ЗА +1 / +2 / +3 ДОП. FS',
};

const SOCIAL_DERIVE_FROM_GAME = [
	['GAME_INFO_DUEL_BONUS_BODY', 'GAME_INFO_DUEL_BONUS_BODY_SOCIAL'],
	['GAME_INFO_SUPER_WILD_BODY', 'GAME_INFO_SUPER_WILD_BODY_SOCIAL'],
	['GAME_INFO_PAW_BODY', 'GAME_INFO_PAW_BODY_SOCIAL'],
	['GAME_INFO_BULLET_BODY', 'GAME_INFO_BULLET_BODY_SOCIAL'],
];

/** Replace bet/win terms with play/prize per locale when deriving social bodies from gameInfo. */
const SOCIAL_TERM_SUBS = {
	de: [
		['Basiseinsatz', 'Basisspiel'],
		['Einsatz', 'Spiel'],
		['einsatz', 'spiel'],
		['Gewinn', 'Preis'],
		['gewinn', 'preis'],
		['Gewinne', 'Preise'],
		['gewinne', 'preise'],
	],
	es: [
		['apuesta base', 'juego base'],
		['apuesta', 'juego'],
		['Apuesta', 'Juego'],
		['premio', 'premio'],
		['Premio', 'Premio'],
		['ganancia', 'premio'],
	],
	fr: [
		['mise de base', 'jeu de base'],
		['mise', 'jeu'],
		['Mise', 'Jeu'],
		['gain', 'prix'],
		['Gain', 'Prix'],
		['gains', 'prix'],
		['Gains', 'Prix'],
	],
	pl: [
		['stawki', 'gry'],
		['stawka', 'gra'],
		['Stawka', 'Gra'],
		['Stawki', 'Gry'],
		['wygrana', 'nagroda'],
		['Wygrana', 'Nagroda'],
		['wygrane', 'nagrody'],
		['Wygrane', 'Nagrody'],
	],
	pt: [
		['aposta base', 'jogo base'],
		['aposta', 'jogo'],
		['Aposta', 'Jogo'],
		['ganho', 'prémio'],
		['Ganho', 'Prémio'],
		['ganhos', 'prémios'],
		['Ganhos', 'Prémios'],
	],
	tr: [
		['temel bahis', 'temel oyun'],
		['bahis', 'oyun'],
		['Bahis', 'Oyun'],
		['kazanç', 'ödül'],
		['Kazanç', 'Ödül'],
	],
	vi: [
		['cược cơ bản', 'lượt chơi cơ bản'],
		['cược', 'lượt chơi'],
		['Cược', 'Lượt chơi'],
		['thắng', 'giải'],
		['Thắng', 'Giải'],
	],
	id: [
		['taruhan dasar', 'permainan dasar'],
		['taruhan', 'permainan'],
		['Taruhan', 'Permainan'],
		['kemenangan', 'hadiah'],
		['Kemenangan', 'Hadiah'],
	],
	fi: [
		['peruspanos', 'peruspeli'],
		['panos', 'peli'],
		['Panos', 'Peli'],
		['voitto', 'palkinto'],
		['Voitto', 'Palkinto'],
	],
	ar: [
		['الرهان الأساسي', 'اللعب الأساسي'],
		['رهان', 'لعب'],
		['فوز', 'جائزة'],
	],
	hi: [
		['बेस बेट', 'बेस प्ले'],
		['बेट', 'प्ले'],
		['जीत', 'पुरस्कार'],
	],
	ja: [
		['ベースベット', 'ベースプレイ'],
		['ベット', 'プレイ'],
		['勝利', '配当'],
	],
	ko: [
		['기본 베팅', '기본 플레이'],
		['베팅', '플레이'],
		['승리', '상금'],
	],
	zh: [
		['基础投注', '基础游戏'],
		['投注', '游戏'],
		['赢奖', '奖励'],
		['获胜', '奖励'],
	],
};

const applySubs = (text, pairs) => {
	let out = text;
	for (const [from, to] of pairs) out = out.split(from).join(to);
	return out;
};

for (const locale of LOCALES) {
	if (locale === 'en' || locale === 'ru') continue;
	const pack = allLocalePacks[locale];
	if (!pack) throw new Error(`Missing locale pack for ${locale}`);
	gameInfo[locale] = pack.gameInfo;
	socialGameInfo[locale] = pack.socialGameInfo;
	loaderCards[locale] = pack.loaderCards;

	const subs = SOCIAL_TERM_SUBS[locale];
	if (subs) {
		for (const [gameKey, socialKey] of SOCIAL_DERIVE_FROM_GAME) {
			socialGameInfo[locale][socialKey] = applySubs(gameInfo[locale][gameKey], subs);
		}
	}
}

for (const locale of LOCALES) {
	if (locale === 'en') continue;
	for (const key of LOADER_CARD_KEYS) {
		if (!loaderCards[locale]?.[key]) {
			throw new Error(`Missing loader card key ${key} for ${locale}`);
		}
	}
}

for (const locale of LOCALES) {
	for (const key of GAME_INFO_KEYS) {
		if (!gameInfo[locale]?.[key]) throw new Error(`Missing gameInfo.${locale}.${key}`);
	}
	for (const key of SOCIAL_GAME_INFO_KEYS) {
		if (!socialGameInfo[locale]?.[key]) {
			throw new Error(`Missing socialGameInfo.${locale}.${key}`);
		}
	}
}

// Sanity: en loader cards remain in en.mjs only
for (const key of LOADER_CARD_KEYS) {
	extractString(enMjs, key);
}

const output = `export const REMOVE_GAME_INFO_KEYS = ${JSON.stringify(REMOVE_GAME_INFO_KEYS, null, '\t')};

export const gameInfo = ${serializeLocales(gameInfo)};

export const socialGameInfo = ${serializeLocales(socialGameInfo)};

export const loaderCards = ${serializeLocales(loaderCards)};
`;

writeFileSync(outPath, output, 'utf8');

if (existsSync(tempOtherLocales)) {
	unlinkSync(tempOtherLocales);
	console.log('Deleted temp file data/_cat-mafia-other-locales.mjs');
}

console.log('Wrote', outPath);
console.log('Locales:', LOCALES.join(', '));
console.log('gameInfo locales:', Object.keys(gameInfo).join(', '));
console.log('socialGameInfo locales:', Object.keys(socialGameInfo).join(', '));
console.log('loaderCards locales:', Object.keys(loaderCards).join(', '));
