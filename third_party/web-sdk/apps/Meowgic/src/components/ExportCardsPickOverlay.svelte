<script lang="ts" module>
	export type EmitterEventExportCardsPick =
		| {
				type: 'exportCardsPick';
				/** Book `freeSpinTargetPick.targets` — FS faces for the cards not picked. */
				targets: number[];
				chosenIndex: number;
				awardedFs: number;
		  }
		/** Fade the card screen out before the FS steam transition. */
		| { type: 'exportCardsPickRetreat' };
</script>

<script lang="ts">
	/**
	 * FS entry (Stage C): three export cards replace the target gallery.
	 * The pick is cosmetic — whichever card is tapped shows `awardedFs`, then the
	 * other two reveal dimmed. The screen stays up until `exportCardsPickRetreat`.
	 */
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import ExportCardsScreen from './ExportCardsScreen.svelte';

	const CARD_COUNT = 3;
	const FS_TIERS = [8, 10, 12] as const;
	/** Chosen card settles before the others turn. */
	const REVEAL_OTHERS_DELAY_MS = 650;
	/** Hold the full reveal so the award reads before steam. */
	const REVEAL_HOLD_MS = 1300;
	/** ExportCardsScreen fade-out (220 ms) + a frame of slack. */
	const RETREAT_MS = 260;

	const context = getContext();

	let show = $state(false);
	let values = $state<number[]>([...FS_TIERS]);
	let faceUp = $state<boolean[]>(Array.from({ length: CARD_COUNT }, () => false));
	let chosen = $state<number | null>(null);
	let locked = $state(true);
	let awarded = 10;
	let others: number[] = [];
	let oncomplete = () => {};

	const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

	/** Prefer the other FS tiers so the unpicked faces read as "what you missed". */
	const otherAwards = (targets: number[], chosenIndex: number, awardedFs: number) => {
		const pool = targets.filter((_, i) => i !== chosenIndex);
		const source = pool.length > 0 ? pool : [...FS_TIERS];
		const distinct = [...new Set(source.filter((v) => v !== awardedFs))];
		const picked = [...distinct, ...source].slice(0, CARD_COUNT - 1);
		return Math.random() < 0.5 ? picked.reverse() : picked;
	};

	const onPick = async (index: number) => {
		if (locked || chosen != null) return;
		locked = true;
		chosen = index;
		const rest = [...others];
		values = values.map((_, i) => (i === index ? awarded : (rest.shift() ?? awarded)));
		faceUp = faceUp.map((up, i) => up || i === index);
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_target_spining', forcePlay: true });

		await wait(REVEAL_OTHERS_DELAY_MS);
		faceUp = faceUp.map(() => true);
		await wait(REVEAL_HOLD_MS);
		oncomplete();
	};

	const reset = () => {
		show = false;
		chosen = null;
		locked = true;
		faceUp = faceUp.map(() => false);
	};

	context.eventEmitter.subscribeOnMount({
		exportCardsPick: async (event) => {
			awarded = event.awardedFs;
			others = otherAwards(event.targets, event.chosenIndex, event.awardedFs);
			values = [...FS_TIERS];
			faceUp = Array.from({ length: CARD_COUNT }, () => false);
			chosen = null;
			locked = false;
			show = true;

			await waitForResolve((resolve) => {
				oncomplete = resolve;
			});
		},
		exportCardsPickRetreat: async () => {
			if (!show) return;
			reset();
			await wait(RETREAT_MS);
		},
	});
</script>

{#if show}
	<ExportCardsScreen
		{values}
		{faceUp}
		{chosen}
		{locked}
		hint={context.i18nDerived.cardPickTitle()}
		{onPick}
	/>
{/if}
