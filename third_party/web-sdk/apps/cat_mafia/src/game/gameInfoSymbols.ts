import config from './config';

export type GameInfoSymbolId = 'H1' | 'H2' | 'H3' | 'H4' | 'L1' | 'L2' | 'L3' | 'L4' | 'W' | 'B' | 'M';
export type GameInfoImageSymbolId = Exclude<GameInfoSymbolId, 'M'>;

const symbolAssetUrl = (file: string) =>
	`${import.meta.env.BASE_URL}assets/sprites/symbols/${file}`;

export const GAME_INFO_SYMBOL_IMAGES: Record<GameInfoImageSymbolId, string> = {
	H1: symbolAssetUrl('H1.webp'),
	H2: symbolAssetUrl('H2.webp'),
	H3: symbolAssetUrl('H3.webp'),
	H4: symbolAssetUrl('H4.webp'),
	L1: symbolAssetUrl('L1.webp'),
	L2: symbolAssetUrl('L2.webp'),
	L3: symbolAssetUrl('L3.webp'),
	L4: symbolAssetUrl('L4.webp'),
	W: symbolAssetUrl('Wild.webp'),
	B: symbolAssetUrl('Bonus.webp'),
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

export const GAME_INFO_SYMBOL_IMAGE_URLS = [...Object.values(GAME_INFO_SYMBOL_IMAGES)];
