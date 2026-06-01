<script lang="ts" module>
	import {
		Emitter,
		upgradeConfig,
		type EmitterConfigV3,
		type EmitterConfigV2,
		type EmitterConfigV1,
	} from '@barvynkoa/particle-emitter';

	import type { LoadedSpriteSheet } from '../types';

	export type Props = Partial<Emitter> & {
		key: string;
		emitSpeed?: number;
		config: EmitterConfigV3 | EmitterConfigV2 | EmitterConfigV1;
	};
</script>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextApp, getContextParent } from '../context.svelte';
	import { propsSyncEffect } from '../utils.svelte';

	const props: Props = $props();
	const context = getContextApp();
	const parentContext = getContextParent();
	const textures = $derived(context.stateApp.loadedAssets?.[props.key] as LoadedSpriteSheet);
	const updatedConfig = $derived(upgradeConfig(props.config, textures));
	// svelte-ignore state_referenced_locally
	const emitter = new Emitter(parentContext.parent, updatedConfig);

	propsSyncEffect({ props, target: emitter, ignore: ['emit'] });

	$effect(() => {
		if (props.emit) emitter.init(updatedConfig);
	});

	// Keep a reference to the ticker callback so it can be removed on destroy.
	// Without this, every ParticleEmitter mount (e.g. each win's coin shower)
	// permanently adds a ticker listener that keeps calling emitter.update()
	// on a destroyed emitter for the rest of the session — a leak that
	// accumulates per win and progressively degrades frame time.
	const tickerUpdate = () => {
		if (context.stateApp.pixiApplication) {
			const deltaUpdate =
				context.stateApp.pixiApplication.ticker.deltaMS * (props.emitSpeed || 0.00234);
			emitter.update(deltaUpdate);
		}
	};

	if (context.stateApp.pixiApplication) {
		context.stateApp.pixiApplication.ticker.add(tickerUpdate);
	}

	onDestroy(() => {
		emitter.emit = false;
		if (context.stateApp.pixiApplication) {
			context.stateApp.pixiApplication.ticker.remove(tickerUpdate);
		}
		emitter.destroy();
	});
</script>
