/**
 * DEV panel catalog — every clip on the library-book board spine.
 * Used by DevButtons + BoardFrame (not production gameplay).
 */

export type BoardDevClip = {
	id: string;
	label: string;
	animationName: string;
	/** Idle layers loop; reaction plays once (re-click to replay). */
	loop: boolean;
	title: string;
};

/**
 * Designer export clips. Production idle stacks all `idle/*` on parallel tracks;
 * DEV can force one clip at a time on track 0.
 */
export const BOARD_DEV_PREVIEW_CLIPS: readonly BoardDevClip[] = [
	{
		id: 'idle_board',
		label: 'idle_board',
		animationName: 'idle/idle_board',
		loop: true,
		title: 'Main desk breathe (production track 0)',
	},
	{
		id: 'bookmarks',
		label: 'bookmarks',
		animationName: 'idle/bookmarks',
		loop: true,
		title: 'Bookmark flutter (production track 1)',
	},
	{
		id: 'clothes',
		label: 'clothes',
		animationName: 'idle/clothes',
		loop: true,
		title: 'Fabric / cloth idle (production track 2)',
	},
	{
		id: 'key',
		label: 'key',
		animationName: 'idle/key',
		loop: true,
		title: 'Key idle (production track 3)',
	},
	{
		id: 'pages',
		label: 'pages',
		animationName: 'idle/pages',
		loop: true,
		title: 'Page rustle (production track 4)',
	},
	{
		id: 'reaction',
		label: 'reaction',
		animationName: 'reaction/reaction',
		loop: false,
		title: 'Win / hit reaction (one-shot)',
	},
];

export type BoardDevSelection = {
	clipId: string;
	animationName: string;
	loop: boolean;
	/** Bump to remount SpineTrack and replay a one-shot. */
	nonce: number;
};
