/**
 * DEV panel catalog — every spine clip available per pay / special symbol.
 * Used by DevButtons + DevSymbolAnimPreview (not production gameplay).
 */

export type SymbolDevClip = {
	id: string;
	label: string;
	assetKey: string;
	animationName: string;
	/** Idle / rest clips loop; land/win/bounce play once (re-click to replay). */
	loop: boolean;
};

export type SymbolDevGroup = {
	id: string;
	label: string;
	title: string;
	/**
	 * SpineProvider fit height (main-layout px). Letter skeletons are ~2603 tall
	 * with ~1306 glyph art — larger fit so the letter reads at ~board-symbol size.
	 */
	previewHeight: number;
	clips: readonly SymbolDevClip[];
};

/** Letter / prop glyph ≪ skeleton height → inflate fit so art fills the preview. */
const LETTER_PREVIEW_HEIGHT = 440;
const TELEPHONE_PREVIEW_HEIGHT = 520;
const LIGHTER_PREVIEW_HEIGHT = 480;
const DIAMOND_PREVIEW_HEIGHT = 460;
const REVOLVER_PREVIEW_HEIGHT = 480;
const STANDARD_PREVIEW_HEIGHT = 220;
const MYSTERY_PREVIEW_HEIGHT = 260;

const renderClips = (
	assetKey: string,
	winAnimationName = 'win',
): readonly SymbolDevClip[] => [
	{ id: 'idle', label: 'idle', assetKey, animationName: 'idle', loop: true },
	{ id: 'stop', label: 'stop', assetKey, animationName: 'stop', loop: false },
	{ id: 'win', label: 'win', assetKey, animationName: winAnimationName, loop: false },
];

export const SYMBOL_DEV_PREVIEW_GROUPS: readonly SymbolDevGroup[] = [
	{
		id: 'H1',
		label: 'H1 Dia',
		title: 'High 1 — diamond (idle / stop / activation)',
		previewHeight: DIAMOND_PREVIEW_HEIGHT,
		clips: renderClips('H1', 'activation'),
	},
	{
		id: 'H2',
		label: 'H2 Rev',
		title: 'High 2 — revolver (idle / stop / win)',
		previewHeight: REVOLVER_PREVIEW_HEIGHT,
		clips: renderClips('H2'),
	},
	{
		id: 'H3',
		label: 'H3 Lit',
		title: 'High 3 — lighter (idle / stop / win)',
		previewHeight: LIGHTER_PREVIEW_HEIGHT,
		clips: renderClips('H3'),
	},
	{
		id: 'H4',
		label: 'H4 Tel',
		title: 'High 4 — telephone (idle / stop / win)',
		previewHeight: TELEPHONE_PREVIEW_HEIGHT,
		clips: renderClips('H4'),
	},
	{
		id: 'L1',
		label: 'L1 A',
		title: 'Low L1 — Ace (idle / stop / win)',
		previewHeight: LETTER_PREVIEW_HEIGHT,
		clips: renderClips('L1'),
	},
	{
		id: 'L2',
		label: 'L2 J',
		title: 'Low L2 — Jack (idle / stop / win)',
		previewHeight: LETTER_PREVIEW_HEIGHT,
		clips: renderClips('L2'),
	},
	{
		id: 'L3',
		label: 'L3 K',
		title: 'Low L3 — King (idle / stop / win)',
		previewHeight: LETTER_PREVIEW_HEIGHT,
		clips: renderClips('L3'),
	},
	{
		id: 'L4',
		label: 'L4 Q',
		title: 'Low L4 — Queen (idle / stop / win)',
		previewHeight: LETTER_PREVIEW_HEIGHT,
		clips: renderClips('L4'),
	},
	{
		id: 'BT',
		label: 'BT Cart',
		title: 'Bullet — cartridge (stop land)',
		previewHeight: 520,
		clips: [
			{ id: 'stop', label: 'stop', assetKey: 'BT', animationName: 'stop', loop: false },
		],
	},
	{
		id: 'W',
		label: 'W',
		title: 'Wild — idle / bounce / win',
		previewHeight: STANDARD_PREVIEW_HEIGHT,
		clips: [
			{
				id: 'idle',
				label: 'idle',
				assetKey: 'W',
				animationName: 'Special_2/idle',
				loop: true,
			},
			{
				id: 'bounce',
				label: 'bounce',
				assetKey: 'W',
				animationName: 'Special_2/bounce',
				loop: false,
			},
			{
				id: 'win',
				label: 'win',
				assetKey: 'WWin',
				animationName: 'Special_2/win',
				loop: false,
			},
		],
	},
	{
		id: 'B',
		label: 'B',
		title: 'Bonus — idle / land(win letters) / wave',
		previewHeight: STANDARD_PREVIEW_HEIGHT,
		clips: [
			{
				id: 'idle',
				label: 'idle',
				assetKey: 'B',
				animationName: 'Special_1/idle',
				loop: true,
			},
			{
				id: 'land',
				label: 'land',
				assetKey: 'BWin',
				animationName: 'Special_1/win',
				loop: false,
			},
			{
				id: 'wave',
				label: 'wave',
				assetKey: 'B',
				animationName: 'Special_1/wave',
				loop: false,
			},
		],
	},
	{
		id: 'M',
		label: 'M',
		title: 'Mystery — idle / explosion',
		previewHeight: MYSTERY_PREVIEW_HEIGHT,
		clips: [
			{
				id: 'idle',
				label: 'idle',
				assetKey: 'M',
				animationName: 'Mystery/idle',
				loop: true,
			},
			{
				id: 'explosion',
				label: 'explode',
				assetKey: 'M',
				animationName: 'Mystery/explosion',
				loop: false,
			},
		],
	},
] as const;

export type SymbolDevSelection = {
	groupId: string;
	clipId: string;
	/** Bump to remount SpineTrack and replay one-shots. */
	nonce: number;
};

export type ResolvedSymbolDevPreview = SymbolDevClip & {
	groupId: string;
	groupLabel: string;
	previewHeight: number;
};

export const resolveSymbolDevPreview = (
	selection: SymbolDevSelection,
): ResolvedSymbolDevPreview | null => {
	const group = SYMBOL_DEV_PREVIEW_GROUPS.find((g) => g.id === selection.groupId);
	if (!group) return null;
	const clip = group.clips.find((c) => c.id === selection.clipId);
	if (!clip) return null;
	return {
		...clip,
		groupId: group.id,
		groupLabel: group.label,
		previewHeight: group.previewHeight,
	};
};
