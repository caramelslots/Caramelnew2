<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container, SpineProvider, SpineSlot } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import {
		BOARD_SIZES,
		FS_OUTRO_PHONE_SCALE,
		FS_OUTRO_SPINE_WIDTH_FRAC,
		getFsOutroPopupPosition,
		getPortraitMobileTier,
	} from '../game/constants';
	import FsPopupSpineController from './FsPopupSpineController.svelte';

	type Props = {
		title: Snippet<[{ width: number; height: number }]>;
		winAmount: Snippet<[{ width: number; height: number }]>;
	};

	const props: Props = $props();

	const context = getContext();

	// SPINE_WIDTH drives the uniform scale applied by SpineProvider.
	// All content inside SpineSlots scales proportionally with this value.
	const spineWidth = $derived.by(() => {
		const base = BOARD_SIZES.width * FS_OUTRO_SPINE_WIDTH_FRAC;
		const canvasSizeType = context.stateLayoutDerived.canvasSizeType();
		if (canvasSizeType !== 'smallMobile' && canvasSizeType !== 'mobile') return base;

		const { width, height } = context.stateLayoutDerived.canvasSizes();
		const tier = getPortraitMobileTier(canvasSizeType, Math.min(width, height));
		return base * FS_OUTRO_PHONE_SCALE[tier];
	});

	const popupPosition = $derived(
		getFsOutroPopupPosition({
			boardLayout: context.stateGameDerived.boardLayout(),
			mainLayout: context.stateLayoutDerived.mainLayout(),
			canvasSizeType: context.stateLayoutDerived.canvasSizeType(),
		}),
	);

	const layoutRefWidth = $derived(spineWidth / FS_OUTRO_SPINE_WIDTH_FRAC);
	const layoutRefHeight = $derived(
		BOARD_SIZES.height * (layoutRefWidth / BOARD_SIZES.width),
	);

	let controller = $state<FsPopupSpineController | undefined>();

	export function playDisappear(): Promise<void> {
		return controller?.playDisappear() ?? Promise.resolve();
	}
</script>

<MainContainer>
	<Container x={popupPosition.x} y={popupPosition.y}>
		<SpineProvider key="fsPopup" width={spineWidth}>
			<FsPopupSpineController bind:this={controller} />
			<SpineSlot slotName="text_placeholder_1">
				{@render props.title({ width: layoutRefWidth, height: layoutRefHeight })}
			</SpineSlot>
			<SpineSlot slotName="text_placeholder_2">
				{@render props.winAmount({ width: layoutRefWidth, height: layoutRefHeight })}
			</SpineSlot>
		</SpineProvider>
	</Container>
</MainContainer>
