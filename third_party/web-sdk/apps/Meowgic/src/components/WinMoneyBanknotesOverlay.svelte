<!--
	Overlay spine that only plays `banknotes_paket_*`. Those clips clear the
	plaque/stack on *this* instance so flying notes sit above the frozen main
	stack (separate SpineProvider) without wiping it.
-->
<script lang="ts">
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		animationName: string;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	const clearWinSumm = () => {
		spine.skeleton.findSlot('win_summ')?.setAttachment(null);
		spine.spineAttachmentsDirty = true;
	};

	const applyBanknotes = (name: string) => {
		try {
			spine.state.setAnimation(0, name, true);
			clearWinSumm();
			spine.update(0);
		} catch (error) {
			console.error(error);
		}
	};

	// Before paint so the first frame already has stack/plaque cleared.
	$effect.pre(() => {
		applyBanknotes(props.animationName);
	});

	/**
	 * Stop looping and resolve when the current banknotes cycle finishes
	 * (used as Big/Super/Epic "outro" when there is no `paket_4_out`).
	 */
	export function finishAndWait(): Promise<void> {
		const track = spine.state.tracks[0];
		if (!track?.animation) return Promise.resolve();

		track.loop = false;
		clearWinSumm();

		return new Promise((resolve) => {
			const prev = track.listener;
			track.listener = {
				complete: () => {
					track.listener = prev ?? undefined;
					resolve();
				},
			};
		});
	}
</script>
