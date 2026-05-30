<script lang="ts">
	import type { Snippet } from 'svelte';

	import { SpineProvider, SpineTrack, SpineSlot } from 'pixi-svelte';
	import { ResponsiveBitmapText } from 'components-pixi';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import WinAnimationBannerOverride from './WinAnimationBannerOverride.svelte';

	type AnimationState = 'intro' | 'idle' | 'outro';

	type Props = {
		animationMap: {
			intro:
				| 'big_win_intro'
				| 'epic_win_intro'
				| 'max_win_intro'
				| 'mega_win_intro'
				| 'super_win_intro';
			idle: 'big_win_idle' | 'epic_win_idle' | 'max_win_idle' | 'mega_win_idle' | 'super_win_idle';
			outro: 'big_win_exit' | 'epic_win_exit' | 'max_win_exit' | 'mega_win_exit' | 'super_win_exit';
		};
		/**
		 * Optional banner-text overlay rendered at the spine's `BIG_WIN` slot.
		 * Used by Cash Stacks 4-tier rework when the spine's baked-in banner
		 * art doesn't match the desired label (e.g. the `max_win_*` track has
		 * "MAX WIN" baked in, but level 9-10 want "SENSATIONAL WIN"). The
		 * sibling `WinAnimationBannerOverride` clears the spine attachment on
		 * each frame so only this text renders. When undefined the spine's
		 * baked-in banner shows as-is (Big/Super/Epic).
		 */
		bannerOverrideText?: string;
		children: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	let oncomplete = $state(() => {});
	let animationState = $state<AnimationState>('intro');
</script>

<SpineProvider width={context.stateGameDerived.boardLayout().width} key="bigwin">
	<SpineTrack
		trackIndex={0}
		animationName={props.animationMap[animationState]}
		loop={animationState === 'idle'}
		listener={{
			complete: () => {
				if (animationState === 'intro') animationState = 'idle';
				if (animationState === 'outro') oncomplete();
			},
		}}
	/>
	<SpineSlot slotName="slot_win_count">
		{@render props.children()}
	</SpineSlot>

	{#if props.bannerOverrideText}
		<WinAnimationBannerOverride />
		<SpineSlot slotName="BIG_WIN">
			<ResponsiveBitmapText
				anchor={0.5}
				maxWidth={1400}
				text={props.bannerOverrideText}
				style={{
					fontFamily: 'gold',
					fontSize: SYMBOL_SIZE * 4.4,
					align: 'center',
					fontWeight: 'bold',
					letterSpacing: 0,
				}}
			/>
		</SpineSlot>
	{/if}
</SpineProvider>
