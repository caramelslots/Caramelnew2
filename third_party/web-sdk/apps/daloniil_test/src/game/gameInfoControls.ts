import { FEATURE_TOGGLE_ASSETS, HUD_ASSETS } from './uiHtmlAssetManifest';

export type GameInfoControlOverlay = 'buyBonus' | 'bonusBoost' | 'autoplay';

export type GameInfoControlEntry = {
	id: string;
	icons: string[];
	wide?: boolean;
	/** Text drawn on top of the HUD sprite (Buy Bonus / Autoplay / Bonus Boost). */
	overlay?: GameInfoControlOverlay;
};

/** Order matches GAME_INFO_CONTROLS_BODY / _SOCIAL paragraphs. */
export const GAME_INFO_CONTROL_ENTRIES: GameInfoControlEntry[] = [
	{ id: 'spin', icons: [HUD_ASSETS.spin1] },
	{ id: 'spacebar', icons: [] },
	{ id: 'betMinus', icons: [HUD_ASSETS.betMinus] },
	{ id: 'betPlus', icons: [HUD_ASSETS.betPlus] },
	{ id: 'buyBonus', icons: [HUD_ASSETS.buyBonusPanel], wide: true, overlay: 'buyBonus' },
	{
		id: 'bonusBoost',
		icons: [FEATURE_TOGGLE_ASSETS.bonusSwitchBg],
		wide: true,
		overlay: 'bonusBoost',
	},
	{ id: 'autoplay', icons: [HUD_ASSETS.autoplay], wide: true, overlay: 'autoplay' },
	{ id: 'turbo', icons: [HUD_ASSETS.turbo1, HUD_ASSETS.turbo2, HUD_ASSETS.turbo3] },
	{ id: 'info', icons: [HUD_ASSETS.info] },
	{ id: 'menu', icons: [HUD_ASSETS.menu] },
	{ id: 'balance', icons: [] },
	{ id: 'bet', icons: [] },
];

export type GameInfoControlRow = {
	id: string;
	icons: string[];
	wide: boolean;
	overlay: GameInfoControlOverlay | null;
	label: string;
	description: string;
	showLabel: boolean;
};

const parseControlLine = (line: string) => {
	const separator = line.indexOf(':');
	if (separator < 0) {
		return { label: '', description: line.trim() };
	}
	return {
		label: line.slice(0, separator).trim(),
		description: line.slice(separator + 1).trim(),
	};
};

export const getGameInfoControlRows = (body: string): GameInfoControlRow[] =>
	body
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line, index) => {
			const entry = GAME_INFO_CONTROL_ENTRIES[index];
			const { label, description } = parseControlLine(line);
			const icons = entry?.icons ?? [];
			const overlay = entry?.overlay ?? null;
			return {
				id: entry?.id ?? `control-${index}`,
				icons,
				wide: entry?.wide ?? false,
				overlay,
				label,
				description,
				showLabel: icons.length === 0 && !overlay,
			};
		});
