<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { anchorToPivot, Container, Sprite } from 'pixi-svelte';

	import { BOARD_DIMENSIONS, SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import PressToContinue from './PressToContinue.svelte';

	const context = getContext();

	// fs_cong.png native aspect; scaled up for legibility on desktop/portrait layouts.
	const BOARD_RATIO = 1536 / 1024;
	const NUMBER_RATIO = 1276 / 595;
	const BOARD_SCALE = 1.55;
	const PANEL_WIDTH = SYMBOL_SIZE * BOARD_DIMENSIONS.x;
	const boardSizes = {
		width: PANEL_WIDTH * BOARD_SCALE,
		height: (PANEL_WIDTH * BOARD_SCALE) / BOARD_RATIO,
	};
	// Inner "10" plaque — centred in the YOU WON / FREE SPINS gap on fs_cong art.
	const NUMBER_Y_RATIO = 0.6;
	const NUMBER_WIDTH_RATIO = 0.24;
	const numberWidth = boardSizes.width * NUMBER_WIDTH_RATIO;
	const numberSizes = {
		width: numberWidth,
		height: numberWidth / NUMBER_RATIO,
	};
	const numberOffsetY = boardSizes.height * (NUMBER_Y_RATIO - 0.5);
	const boardCenter = {
		x: boardSizes.width * 0.5,
		y: boardSizes.height * 0.5,
	};
	const panelPosition = $derived({
		x: context.stateGameDerived.boardLayout().x,
		y: context.stateGameDerived.boardLayout().y,
	});

	let show = $state(false);
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => {
			show = true;
			stateGame.freeSpinIntroActive = true;
		},
		freeSpinIntroHide: () => {
			show = false;
			stateGame.freeSpinIntroActive = false;
		},
		freeSpinIntroUpdate: async () => {
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

	<MainContainer>
		<Container
			x={panelPosition.x}
			y={panelPosition.y}
			pivot={anchorToPivot({ anchor: 0.5, sizes: boardSizes })}
		>
			<Sprite
				key="fsCongBoard"
				anchor={0.5}
				x={boardCenter.x}
				y={boardCenter.y}
				width={boardSizes.width}
				height={boardSizes.height}
			/>
			<Sprite
				key="fsCongNumber"
				anchor={0.5}
				x={boardCenter.x}
				y={boardCenter.y + numberOffsetY}
				width={numberSizes.width}
				height={numberSizes.height}
			/>
		</Container>
	</MainContainer>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
