<!--
	WinAnimationBannerOverride.svelte — clears the spine's baked-in BIG_WIN
	banner attachments on every frame so the sibling `<SpineSlot slotName=
	"BIG_WIN">` (in WinAnimation.svelte) renders only our override text.

	Why this is needed: `mm_bigwin.json` ships 5 banner attachments
	(MM_BigWin / MM_SuperWin / MM_MegaWin / MM_EpicWin / MM_MaxWin). Each
	`*_intro` animation has a keyframe that sets `BIG_WIN.attachment` to
	one of these. The 4-tier Cash Stacks rework uses the `max_win_*`
	track for "Sensational Win" — but the baked label says "MAX WIN".
	Replacing it requires either an art rebuild (TODO) or this runtime
	override.

	Implementation: hook the spine's `beforeUpdateWorldTransforms`
	callback (mirrors the pattern in SpineEventEmitterProvider) so the
	override sticks across all keyframes — clearing the attachment in
	`onMount` only would last until the next keyframe re-applies it.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { getContextSpine } from 'pixi-svelte';

	const spine = getContextSpine();

	onMount(() => {
		const previous = spine.beforeUpdateWorldTransforms;
		spine.beforeUpdateWorldTransforms = (...args) => {
			previous?.(...args);
			const banner = spine.skeleton.findSlot('BIG_WIN');
			if (banner) banner.attachment = null;
			const glow = spine.skeleton.findSlot('BIG_WIN_GLOW');
			if (glow) glow.attachment = null;
		};

		return () => {
			spine.beforeUpdateWorldTransforms = previous;
		};
	});
</script>
