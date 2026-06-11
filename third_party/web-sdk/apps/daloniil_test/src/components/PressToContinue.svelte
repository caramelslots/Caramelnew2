<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { ResponsiveBitmapText } from 'components-pixi';

	import {
		BITMAP_FONT_SCALE,
		FONT_PROSTOI_WHITE,
		PRESS_TO_CONTINUE_BOTTOM_OFFSET,
		PRESS_TO_CONTINUE_FONT_SIZE,
	} from '../game/constants';
	import { getContext } from '../game/context';

	type Props = {
		onpress: () => void;
	};

	const props: Props = $props();
	const context = getContext();
	const layout = $derived(context.stateLayoutDerived.mainLayout());
	const pressText = $derived(context.i18nDerived.pressToContinue());
</script>

<MainContainer alignVertical="bottom">
	<ResponsiveBitmapText
		anchor={{ x: 0.5, y: 1 }}
		x={layout.width * 0.5}
		y={layout.height - PRESS_TO_CONTINUE_BOTTOM_OFFSET}
		maxWidth={layout.width * 0.95}
		text={pressText}
		style={{
			fontFamily: FONT_PROSTOI_WHITE,
			fontSize: PRESS_TO_CONTINUE_FONT_SIZE * BITMAP_FONT_SCALE,
			align: 'center',
			letterSpacing: 2,
		}}
	/>
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
