<script lang="ts">
	import type { Snippet } from 'svelte';

	import { SpineProvider, SpineTrack, SpineSlot } from 'pixi-svelte';
	import { ResponsiveBitmapText } from 'components-pixi';

	import { getContext } from '../game/context';
	import { BITMAP_FONT_SCALE, FONT_KRUTOI, SYMBOL_SIZE } from '../game/constants';
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
		 * Replaces the spine's baked-in banner art (MM_BigWin / MM_SuperWin /
		 * MM_EpicWin / MM_MaxWin) with krutoi BitmapText. The sibling
		 * `WinAnimationBannerOverride` clears the spine attachment on each
		 * frame so only this text renders.
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
					fontFamily: FONT_KRUTOI,
					fontSize: SYMBOL_SIZE * 4.4 * BITMAP_FONT_SCALE,
					align: 'center',
					fontWeight: 'bold',
					letterSpacing: 0,
				}}
			/>
		</SpineSlot>
	{/if}
</SpineProvider>
