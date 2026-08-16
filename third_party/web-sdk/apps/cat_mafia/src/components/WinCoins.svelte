<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { fountain as baseConfig } from 'constants-shared/particleConfig';
	import { LEVEL_PARTICLE_COIN_MAP } from 'constants-shared/particleCoin';

	import { getContext } from '../game/context';
	import type { WinLevelAlias } from '../game/winLevelMap';
	import CoinParticleEmitter from './CoinParticleEmitter.svelte';

	type Props = {
		emit?: boolean;
		levelAlias?: WinLevelAlias;
		x?: number;
		y?: number;
		/** When true, x/y are canvas px (stage root). Default uses MainContainer game layout. */
		canvasSpace?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const shouldEmit = $derived(props.emit === true);
	const extraConfig = $derived(
		props?.levelAlias ? LEVEL_PARTICLE_COIN_MAP[props.levelAlias] : null,
	);
	/** Designer coin frames are ~110px (old SD2 sheet was ~487px). */
	const config = $derived({
		...baseConfig,
		...extraConfig,
		scale: { start: 1.15, end: 1.35, minimumScaleMultiplier: 0.85 },
		frequency: 0.18,
	});
	const bronzeConfig = $derived({
		...config,
		frequency: 0.12,
		startRotation: { min: 240, max: 270 },
	});
	const silverConfig = $derived({
		...config,
		frequency: 0.12,
		startRotation: { min: 270, max: 300 },
	});
	const coinContainer = $derived({
		x: props.x ?? boardLayout.x,
		y: props.y ?? boardLayout.y,
	});
</script>

{#if config}
	{#if props.canvasSpace}
		<Container x={coinContainer.x} y={coinContainer.y}>
			<CoinParticleEmitter {config} key="coins" emit={shouldEmit} />
			<CoinParticleEmitter config={bronzeConfig} key="coinsBronze" emit={shouldEmit} />
			<CoinParticleEmitter config={silverConfig} key="coinsSilver" emit={shouldEmit} />
		</Container>
	{:else}
		<MainContainer>
			<Container x={coinContainer.x} y={coinContainer.y}>
				<CoinParticleEmitter {config} key="coins" emit={shouldEmit} />
				<CoinParticleEmitter config={bronzeConfig} key="coinsBronze" emit={shouldEmit} />
				<CoinParticleEmitter config={silverConfig} key="coinsSilver" emit={shouldEmit} />
			</Container>
		</MainContainer>
	{/if}
{/if}
