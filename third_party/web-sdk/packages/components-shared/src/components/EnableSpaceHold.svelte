<script lang="ts" module>
	import { stateBet, stateBetDerived } from 'state-shared';
</script>

<script lang="ts">
	import OnHotkey from './OnHotkey.svelte';

	type Props = {
		disabled?: boolean;
	};

	const props: Props = $props();

	const spaceHoldOn = () => {
		stateBet.autoSpinsCounter = 0;
		stateBet.isSpaceHold = true;
		stateBetDerived.updateIsTurbo(true, { persistent: true });
	};

	const spaceHoldOff = () => {
		stateBet.isSpaceHold = false;
		stateBetDerived.updateIsTurbo(false, { persistent: true });
	};
</script>

<OnHotkey hotkey="Space" disabled={props.disabled} onhold={spaceHoldOn} onholdend={spaceHoldOff} />
