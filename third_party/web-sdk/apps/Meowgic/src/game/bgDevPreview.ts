/**
 * DEV panel catalog — clips on the street background spines
 * (`mainBackground` / bg_only + `bgTable`). Platform has no keyed clips.
 * Used by DevButtons + Background (not production gameplay).
 */

export type BgDevTarget = 'room' | 'table' | 'both';

export type BgDevClip = {
	id: string;
	label: string;
	animationName: string;
	/** Idle layers loop; reaction plays once (re-click to replay). */
	loop: boolean;
	/** Which animated piece(s) actually key this clip. */
	target: BgDevTarget;
	title: string;
};

/**
 * Designer export clips — names match Spine JSON exactly.
 * DEV clears all tracks then plays the clip solo (see BgDevForceClip).
 */
export const BG_DEV_PREVIEW_CLIPS: readonly BgDevClip[] = [
	{
		id: 'idle_bg',
		label: 'idle/idle_bg',
		animationName: 'idle/idle_bg',
		loop: true,
		target: 'both',
		title: 'Main idle (room + table)',
	},
	{
		id: 'lamps',
		label: 'idle/lamps',
		animationName: 'idle/lamps',
		loop: true,
		target: 'room',
		title: 'Room ambient lamps',
	},
	{
		id: 'particles',
		label: 'idle/particles',
		animationName: 'idle/particles',
		loop: true,
		target: 'room',
		title: 'Room ambient particles (e2)',
	},
	{
		id: 'candle',
		label: 'idle/candle',
		animationName: 'idle/candle',
		loop: true,
		target: 'table',
		title: 'Table candle idle',
	},
	{
		id: 'orb',
		label: 'idle/orb',
		animationName: 'idle/orb',
		loop: true,
		target: 'table',
		title: 'Table orb idle',
	},
	{
		id: 'orb2',
		label: 'idle/orb2',
		animationName: 'idle/orb2',
		loop: true,
		target: 'table',
		title: 'Table orb2 idle',
	},
	{
		id: 'pen',
		label: 'idle/pen',
		animationName: 'idle/pen',
		loop: true,
		target: 'table',
		title: 'Table pen idle',
	},
	{
		id: 'bg_reaction',
		label: 'rx/bg_reaction',
		animationName: 'reaction/bg_reaction',
		loop: false,
		target: 'room',
		title: 'ROOM spin reaction — lamps + particle burst (production)',
	},
	{
		id: 'bg_reaction2',
		label: 'rx/bg_reaction2',
		animationName: 'reaction/bg_reaction2',
		loop: false,
		target: 'table',
		title: 'TABLE spin reaction (production track 0)',
	},
	{
		id: 'lamps_reaction',
		label: 'rx/lamps',
		animationName: 'reaction/lamps',
		loop: false,
		target: 'room',
		title: 'Room lamps only (weak — flame only, almost no glow)',
	},
	{
		id: 'particles_reaction',
		label: 'rx/particles',
		animationName: 'reaction/particles_reaction',
		loop: false,
		target: 'room',
		title: 'Room particle burst alone (same e3/e4 as inside bg_reaction)',
	},
	{
		id: 'candle_reaction',
		label: 'rx/candle',
		animationName: 'reaction/candle',
		loop: false,
		target: 'table',
		title: 'Table candle reaction',
	},
	{
		id: 'orb_reaction',
		label: 'rx/orb',
		animationName: 'reaction/orb_reaction',
		loop: false,
		target: 'table',
		title: 'Table orb reaction',
	},
	{
		id: 'pen_reaction',
		label: 'rx/pen',
		animationName: 'reaction/pen',
		loop: false,
		target: 'table',
		title: 'Table pen reaction',
	},
];

export type BgDevSelection = {
	clipId: string;
	animationName: string;
	loop: boolean;
	target: BgDevTarget;
	/** Bump to remount SpineTrack and replay a one-shot. */
	nonce: number;
};

export const bgDevTargetsRoom = (target: BgDevTarget) =>
	target === 'room' || target === 'both';

export const bgDevTargetsTable = (target: BgDevTarget) =>
	target === 'table' || target === 'both';
