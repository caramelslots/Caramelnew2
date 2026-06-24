<script lang="ts" module>
	import {
		Emitter,
		upgradeConfig,
		type EmitterConfigV1,
		type EmitterConfigV2,
		type EmitterConfigV3,
	} from '@barvynkoa/particle-emitter';

	import type { LoadedSpriteSheet } from 'pixi-svelte';

	export type Props = {
		key: string;
		emit?: boolean;
		emitSpeed?: number;
		config: EmitterConfigV3 | EmitterConfigV2 | EmitterConfigV1;
	};
</script>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextApp, getContextParent } from 'pixi-svelte';

	const props: Props = $props();
	const context = getContextApp();
	const parentContext = getContextParent();
	const textures = $derived(context.stateApp.loadedAssets?.[props.key] as LoadedSpriteSheet);
	const updatedConfig = $derived(upgradeConfig(props.config, textures));
	// svelte-ignore state_referenced_locally
	const emitter = new Emitter(parentContext.parent, updatedConfig);

	$effect(() => {
		if (props.emit === true) {
			emitter.init(updatedConfig);
			return;
		}
		emitter.emit = false;
	});

	const tickerUpdate = () => {
		if (context.stateApp.pixiApplication) {
			const deltaUpdate =
				context.stateApp.pixiApplication.ticker.deltaMS * (props.emitSpeed ?? 0.00234);
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
