import config from './config';

export type GameInfoSymbolId = 'H1' | 'H2' | 'H3' | 'H4' | 'L1' | 'L2' | 'L3' | 'L4' | 'W' | 'B' | 'M';

const symbolAssetUrl = (file: string) =>
	`${import.meta.env.BASE_URL}assets/sprites/symbolsNew/${file}`;

export const GAME_INFO_MYSTERY_BG_IMAGE = symbolAssetUrl('Mystery_bg.png');
export const GAME_INFO_MYSTERY_SIGN_IMAGE = symbolAssetUrl('Mystery_sign.png');

export const GAME_INFO_SYMBOL_IMAGES: Record<GameInfoSymbolId, string> = {
	H1: symbolAssetUrl('High_1.png'),
	H2: symbolAssetUrl('High_2.png'),
	H3: symbolAssetUrl('High_3.png'),
	H4: symbolAssetUrl('High_4.png'),
	L1: symbolAssetUrl('Low_1.png'),
	L2: symbolAssetUrl('Low_2.png'),
	L3: symbolAssetUrl('Low_3.png'),
	L4: symbolAssetUrl('Low_4.png'),
	W: symbolAssetUrl('Special_2.png'),
	B: symbolAssetUrl('Special_1.png'),
	M: GAME_INFO_MYSTERY_SIGN_IMAGE,
};

export const GAME_INFO_SPECIAL_SYMBOL_ENTRIES = [
	{ id: 'B' as const, titleKey: 'GAME_INFO_BONUS_SYMBOL_TITLE', bodyKey: 'GAME_INFO_FS_BODY' },
	{ id: 'W' as const, titleKey: 'GAME_INFO_WILD_TITLE', bodyKey: 'GAME_INFO_WILD_BODY' },
	{ id: 'M' as const, titleKey: 'GAME_INFO_MYSTERY_TITLE', bodyKey: 'GAME_INFO_MYSTERY_BODY' },
] as const;

export const GAME_INFO_PAYING_SYMBOL_IDS = [
	'H1',
	'H2',
	'H3',
	'H4',
	'L1',
	'L2',
	'L3',
	'L4',
	'W',
] as const satisfies readonly GameInfoSymbolId[];

export type SymbolPayRow = { count: number; multiplier: number };

export const getSymbolPayRows = (id: GameInfoSymbolId): SymbolPayRow[] => {
	const symbolConfig = config.symbols[id as keyof typeof config.symbols];
	const paytable = symbolConfig && 'paytable' in symbolConfig ? symbolConfig.paytable : null;
	if (!paytable) return [];

	return paytable.map((entry) => {
		const [count, multiplier] = Object.entries(entry)[0];
		return { count: Number(count), multiplier: Number(multiplier) };
	});
};

export const GAME_INFO_SYMBOL_IMAGE_URLS = [
	...Object.values(GAME_INFO_SYMBOL_IMAGES),
	GAME_INFO_MYSTERY_BG_IMAGE,
];
