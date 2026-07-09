export type GameInfoSection = {
	title: string;
	body: string;
};

const GAME_INFO_SECTION_KEYS = [
	{ titleKey: 'GAME_INFO_ABOUT_TITLE', bodyKey: 'GAME_INFO_ABOUT_BODY' },
	{ titleKey: 'GAME_INFO_BET_MODES_TITLE', bodyKey: 'GAME_INFO_BET_MODES_BODY' },
	{ titleKey: 'GAME_INFO_LEGAL_TITLE', bodyKey: 'GAME_INFO_LEGAL_BODY' },
] as const;

export const getGameInfoSections = (t: (key: string) => string): GameInfoSection[] =>
	GAME_INFO_SECTION_KEYS.map(({ titleKey, bodyKey }) => ({
		title: t(titleKey),
		body: t(bodyKey),
	}));
