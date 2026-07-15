<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { type Snippet } from 'svelte';

	import { createInterruptible } from 'utils-shared/interruptible';

	type Props = {
		amount: number;
		duration: number;
		oncomplete: () => void;
		children: Snippet<
			[
				{
					countUpAmount: number;
					startCountUp: () => Promise<void>;
					finishCountUp: () => void;
					countUpCompleted: boolean;
				},
			]
		>;
	};

	const props: Props = $props();
	const countUpAmount = new Tween(0);
	const interruptible = createInterruptible();

	let countUpCompleted = $state(false);

	/**
	 * Most RGS book totals are integers. Tween floats invent junk like 70093.6258
	 * → "$700.936258". Snap the displayed book amount to an integer when the
	 * target is (near-)integer; keep fractions for real sub-cent books (7.5, …).
	 */
	const targetIsIntegerBook = $derived(
		Math.abs(props.amount - Math.round(props.amount)) < 0.005,
	);
	const displayCountUpAmount = $derived(
		targetIsIntegerBook ? Math.round(countUpAmount.current) : countUpAmount.current,
	);

	const countUp = () => countUpAmount.set(props.amount, { duration: props.duration });
	const resetCountUp = () => countUpAmount.set(props.amount, { duration: 0 });
	const finishCountUp = () => interruptible.interrupt();
	const startCountUp = async () => {
		countUpCompleted = false;
		await interruptible.add(countUp);
		resetCountUp();
		countUpCompleted = true;
		props.oncomplete();
		interruptible.clear();
	};
</script>

{@render props.children({
	countUpAmount: displayCountUpAmount,
	startCountUp,
	finishCountUp,
	countUpCompleted,
})}
