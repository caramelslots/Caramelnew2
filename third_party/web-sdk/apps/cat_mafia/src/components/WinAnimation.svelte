<script lang="ts">
	import type { Snippet } from 'svelte';

	import { ColorMatrixFilter } from 'pixi.js';
	import { Container, SpineProvider, SpineSlot } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		BITMAP_FONT_SCALE,
		FONT_MEOWFIA_BIGER,
		LOCALE_TEXT_FILL_GOLD,
		SYMBOL_SIZE,
	} from '../game/constants';
	import type { BigWinSpineAnimationMap } from '../game/winLevelMap';
	import ArchedLocaleText from './ArchedLocaleText.svelte';
	import BoardFrameSlotFilter from './BoardFrameSlotFilter.svelte';
	import WinMoneyBanknotesOverlay from './WinMoneyBanknotesOverlay.svelte';
	import WinMoneySpineTrack from './WinMoneySpineTrack.svelte';

	/** Huge additive glow meshes — soft bloom toward the sides of the screen. */
	const BIG_WIN_GLOW_SLOTS = ['glow_1', 'glow_2', 'glow_3', 'glow_4'] as const;

	type Props = {
		animationMap: BigWinSpineAnimationMap;
		/**
		 * Banner title arched above the money stack (not on the plaque).
		 */
		bannerOverrideText?: string;
		children: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	let moneyTrack: { playOutro: () => Promise<void> } | undefined = $state();
	let banknotesOverlay: { finishAndWait: () => Promise<void> } | undefined = $state();
	/** Flying notes from tier start until outro finishes. */
	let banknotesActive = $state(true);

	/** Money stack scale relative to the board plate. */
	const spineWidth = $derived(context.stateGameDerived.boardLayout().width * 0.78);
	/** Shift stack + banknotes down from board centre. */
	const stackY = $derived(spineWidth * 0.14);
	/**
	 * Peak of the arc — above the stack, but lower than the previous sky-high placement.
	 */
	const titleY = $derived(stackY - spineWidth * 0.62);
	const titleMaxWidth = $derived(spineWidth * 1.35);
	const titleFontSize = $derived(SYMBOL_SIZE * 2.2 * BITMAP_FONT_SCALE);
	const titleArchDeg = 34;
	/** >1 spreads glyphs along the arc (Big / Super / Epic / Sensational). */
	const titleTracking = 1.28;

	/**
	 * Match title colour to each paket's Spine glow (`glow_1`…`glow_4` in money.webp):
	 * Big lime, Super magenta, Epic gold (baked), Sensational orange.
	 * Krutoi is baked gold (~hue 45°) — hue-rotate to the glow hues.
	 */
	const titleHueDeg = $derived.by(() => {
		switch (props.animationMap.intro) {
			case 'paket_1_in':
				return 33; // → ~78° lime (glow_1)
			case 'paket_1_to_paket_2':
				return 275; // → ~320° magenta (glow_2)
			case 'paket_2_to_paket_3':
				return 0; // gold / glow_3
			case 'paket_3_to_paket_4':
				return -17; // → ~28° orange (glow_4)
			default:
				return 0;
		}
	});
	const titleFallbackFill = $derived.by(() => {
		switch (props.animationMap.intro) {
			case 'paket_1_in':
				return '#b6ed38';
			case 'paket_1_to_paket_2':
				return '#c83f9a';
			case 'paket_2_to_paket_3':
				return LOCALE_TEXT_FILL_GOLD;
			case 'paket_3_to_paket_4':
				return '#fbab64';
			default:
				return LOCALE_TEXT_FILL_GOLD;
		}
	});

	const titleColorFilter = new ColorMatrixFilter();
	const titleFilters = $derived.by(() => {
		titleColorFilter.reset();
		if (titleHueDeg !== 0) {
			titleColorFilter.hue(titleHueDeg, false);
			titleColorFilter.saturate(0.15, true);
		}
		return titleHueDeg === 0 ? undefined : [titleColorFilter];
	});

	/** New ladder tier — keep / restart banknotes for that tier's idle clip. */
	$effect(() => {
		props.animationMap.idle;
		banknotesActive = true;
	});

	/**
	 * Run stack outro (Sensational `paket_4_out`) while banknotes keep playing;
	 * tear banknotes down only after outro finishes. Big/Super/Epic: finish the
	 * current banknotes cycle instead.
	 */
	export async function playOutro(): Promise<void> {
		const distinctOutro = props.animationMap.outro !== props.animationMap.idle;
		if (distinctOutro) {
			await moneyTrack?.playOutro();
		} else if (banknotesActive) {
			await banknotesOverlay?.finishAndWait();
		}
		banknotesActive = false;
	}
</script>

<!-- sortableChildren so the arc title can sit above the growing money spine. -->
<Container sortableChildren={true}>
	<Container y={stackY} zIndex={0}>
		<SpineProvider width={spineWidth} key="bigwin">
			<BoardFrameSlotFilter hiddenSlots={BIG_WIN_GLOW_SLOTS} />
			{#key props.animationMap.intro}
				<WinMoneySpineTrack bind:this={moneyTrack} animationMap={props.animationMap} />
			{/key}
			<!-- Amount only — centred on the plaque's `win_summ` bone. -->
			<SpineSlot slotName="win_summ">
				{@render props.children()}
			</SpineSlot>
		</SpineProvider>

		{#if banknotesActive}
			{#key props.animationMap.idle}
				<SpineProvider width={spineWidth} key="bigwin">
					<BoardFrameSlotFilter hiddenSlots={BIG_WIN_GLOW_SLOTS} />
					<WinMoneyBanknotesOverlay
						bind:this={banknotesOverlay}
						animationName={props.animationMap.idle}
					/>
				</SpineProvider>
			{/key}
		{/if}
	</Container>

	{#if props.bannerOverrideText}
		{#key props.bannerOverrideText}
			<Container y={titleY} zIndex={10} filters={titleFilters}>
				<ArchedLocaleText
					text={props.bannerOverrideText}
					maxWidth={titleMaxWidth}
					archDeg={titleArchDeg}
					tracking={titleTracking}
					fallbackFill={titleFallbackFill}
					forceBitmap={true}
					style={{
						// Meowfia Biger Latin atlas — same on every locale.
						fontFamily: FONT_MEOWFIA_BIGER,
						fontSize: titleFontSize,
						align: 'center',
						fontWeight: 'bold',
						letterSpacing: 0,
					}}
				/>
			</Container>
		{/key}
	{/if}
</Container>
