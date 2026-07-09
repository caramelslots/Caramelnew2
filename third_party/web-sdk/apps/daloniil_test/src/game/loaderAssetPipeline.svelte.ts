export type LoaderStage = 'stake' | 'bootstrap' | 'cards' | 'done';

const STAGE_ORDER: Record<LoaderStage, number> = {
	stake: 0,
	bootstrap: 1,
	cards: 2,
	done: 3,
};

export const loaderAssetPipeline = $state({
	stage: 'stake' as LoaderStage,
});

const waiters: Array<{ minStage: LoaderStage; resolve: () => void }> = [];

export const setLoaderStage = (stage: LoaderStage) => {
	loaderAssetPipeline.stage = stage;

	const reachedOrder = STAGE_ORDER[stage];
	for (let i = waiters.length - 1; i >= 0; i--) {
		const waiter = waiters[i]!;
		if (STAGE_ORDER[waiter.minStage] <= reachedOrder) {
			waiter.resolve();
			waiters.splice(i, 1);
		}
	}
};

export const waitForLoaderStage = (minStage: LoaderStage): Promise<void> => {
	if (STAGE_ORDER[loaderAssetPipeline.stage] >= STAGE_ORDER[minStage]) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		waiters.push({ minStage, resolve });
	});
};
