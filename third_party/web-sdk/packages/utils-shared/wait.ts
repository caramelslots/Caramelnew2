type Resolve = (value: void | PromiseLike<void>) => void;

export const waitForResolve = (callback: (resolve: Resolve) => void) =>
	new Promise<void>((resolve) => callback(resolve));

export const waitForTimeout = (time: number) =>
	new Promise<void>((resolve) => {
		const timeout = setTimeout(() => {
			clearTimeout(timeout);
			resolve();
		}, time);
	});

/** Yields until the next compositor frame — spreads sync Svelte work across frames. */
export const waitForAnimationFrame = () =>
	new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});
