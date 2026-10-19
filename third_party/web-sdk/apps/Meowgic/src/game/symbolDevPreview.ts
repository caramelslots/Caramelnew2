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
	/** After a one-shot, switch the preview to this clip id (usually idle). */
	followUpId?: string;
	/** Default spine — sprite for spin WebP previews (B / BD). */
	renderType?: 'spine' | 'sprite';
};

export type SymbolDevGroup = {
	id: string;
	label: string;
	title: string;
	/**
	 * SpineProvider fit height (main-layout px) — inflate when the glyph is a
	 * small part of the skeleton AABB so it reads at ~board-symbol size.
	 */
	previewHeight: number;
	clips: readonly SymbolDevClip[];
};

/** Magic-library H/L skeletons are ≈ their art box — no inflate needed. */
const HL_PREVIEW_HEIGHT = 240;

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
		label: 'H1 Ame',
		title: 'High 1 — amethyst (idle / stop / win)',
		previewHeight: HL_PREVIEW_HEIGHT,
		clips: renderClips('H1'),
	},
	{
		id: 'H2',
		label: 'H2 Wand',
		title: 'High 2 — wand (idle / stop / win)',
		previewHeight: HL_PREVIEW_HEIGHT,
		clips: renderClips('H2'),
	},
	{
		id: 'H3',
		label: 'H3 Cndl',
		title: 'High 3 — candle (idle / stop / win)',
		previewHeight: HL_PREVIEW_HEIGHT,
		clips: renderClips('H3'),
	},
	{
		id: 'H4',
		label: 'H4 Book',
		title: 'High 4 — book (idle / stop / win)',
		previewHeight: HL_PREVIEW_HEIGHT,
		clips: renderClips('H4'),
	},
	{
		id: 'L1',
		label: 'L1 A',
		title: 'Low L1 — Ace (idle / stop / win)',
		previewHeight: HL_PREVIEW_HEIGHT,
		clips: renderClips('L1'),
	},
	{
		id: 'L2',
		label: 'L2 K',
		title: 'Low L2 — King (idle / stop / win)',
		previewHeight: HL_PREVIEW_HEIGHT,
		clips: renderClips('L2'),
	},
	{
		id: 'L3',
		label: 'L3 Q',
		title: 'Low L3 — Queen (idle / stop / win)',
		previewHeight: HL_PREVIEW_HEIGHT,
		clips: renderClips('L3'),
	},
	{
		id: 'L4',
		label: 'L4 J',
		title: 'Low L4 — Jack (idle / stop / win)',
		previewHeight: HL_PREVIEW_HEIGHT,
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
		id: 'B',
		label: 'B',
		title: 'Bonus — idle / land / activate',
		previewHeight: 460,
		clips: [
			{
				id: 'spin',
				label: 'spin',
				assetKey: 'BImg',
				animationName: '',
				loop: false,
				renderType: 'sprite',
			},
			{
				id: 'idle',
				label: 'idle',
				assetKey: 'B',
				animationName: 'idle',
				loop: true,
			},
			{
				id: 'land',
				label: 'land',
				assetKey: 'B',
				animationName: 'land',
				loop: false,
			},
			{
				id: 'activate',
				label: 'activate',
				assetKey: 'B',
				animationName: 'activate',
				loop: false,
			},
			{
				id: 'idle_blink',
				label: 'blink',
				assetKey: 'B',
				animationName: 'idle_blink',
				loop: false,
			},
			{
				id: 'idle_ears',
				label: 'ears',
				assetKey: 'B',
				animationName: 'idle_ears',
				loop: false,
			},
		],
	},
	{
		id: 'BD',
		label: 'BD Duel',
		title: 'Duel Bonus (BD) — spin WebP + idle / land / activate',
		previewHeight: 460,
		clips: [
			{
				id: 'spin',
				label: 'spin',
				assetKey: 'BDuelImg',
				animationName: '',
				loop: false,
				renderType: 'sprite',
			},
			{
				id: 'idle',
				label: 'idle',
				assetKey: 'BD',
				animationName: 'idle',
				loop: true,
			},
			{
				id: 'land',
				label: 'land',
				assetKey: 'BD',
				animationName: 'land',
				loop: false,
			},
			{
				id: 'activate',
				label: 'activate',
				assetKey: 'BD',
				animationName: 'activate',
				loop: false,
			},
		],
	},
	{
		id: 'W',
		label: 'W Wild',
		title: 'Wild — idle (`static`) / bounce (`land`)',
		previewHeight: 460,
		clips: [
			{
				id: 'idle',
				label: 'idle',
				assetKey: 'W',
				animationName: 'static',
				loop: true,
			},
			{
				id: 'bounce',
				label: 'bounce',
				assetKey: 'W',
				animationName: 'land',
				loop: false,
				followUpId: 'idle',
			},
			{
				id: 'spin',
				label: 'spin',
				assetKey: 'WImg',
				animationName: '',
				loop: false,
				renderType: 'sprite',
			},
		],
	},
	{
		id: 'SW',
		label: 'SW Super',
		title: 'Super Wild — idle / bounce / open / win (wild_render)',
		previewHeight: 460,
		clips: [
			{
				id: 'idle',
				label: 'idle',
				assetKey: 'W',
				animationName: 'static',
				loop: true,
			},
			{
				id: 'bounce',
				label: 'bounce',
				assetKey: 'W',
				animationName: 'land',
				loop: false,
				followUpId: 'idle',
			},
			{
				id: 'open',
				label: 'open',
				assetKey: 'superWildCurtain',
				animationName: 'open',
				loop: false,
				followUpId: 'curtainIdle',
			},
			{
				id: 'win',
				label: 'win',
				assetKey: 'superWildCurtain',
				animationName: 'win',
				loop: false,
			},
			{
				id: 'curtainIdle',
				label: 'curtain idle',
				assetKey: 'superWildCurtain',
				animationName: 'idle',
				loop: true,
			},
			{
				id: 'activation',
				label: 'activation',
				assetKey: 'superWildCurtain',
				animationName: 'activation',
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
