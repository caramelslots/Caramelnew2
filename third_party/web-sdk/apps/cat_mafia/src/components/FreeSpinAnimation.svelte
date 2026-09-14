<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container, SpineProvider, SpineSlot } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import {
		BOARD_SIZES,
		FS_OUTRO_SPINE_WIDTH_FRAC,
		FS_OUTRO_TEXT_LAYOUT_FRAC,
		getFsOutroSpineWidth,
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
	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());

	const spineWidth = $derived.by(() =>
		getFsOutroSpineWidth({
			canvasSizeType: context.stateLayoutDerived.canvasSizeType(),
			canvasSizes: context.stateLayoutDerived.canvasSizes(),
		}),
	);

	const layoutRefWidth = $derived(
		(spineWidth / FS_OUTRO_SPINE_WIDTH_FRAC) * FS_OUTRO_TEXT_LAYOUT_FRAC,
	);
	const layoutRefHeight = $derived(BOARD_SIZES.height * (layoutRefWidth / BOARD_SIZES.width));

	let controller = $state<FsPopupSpineController | undefined>();

	export function playDisappear(): Promise<void> {
		return controller?.playDisappear() ?? Promise.resolve();
	}
</script>

<MainContainer>
	<Container x={mainLayout.width * 0.5} y={mainLayout.height * 0.3}>
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
