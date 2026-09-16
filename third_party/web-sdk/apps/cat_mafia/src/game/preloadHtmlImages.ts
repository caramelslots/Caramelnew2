type PreloadHtmlImagesOptions = {
	/** Loaded sequentially before the rest (e.g. first carousel slide). */
	priority?: readonly string[];
	concurrency?: number;
};

const loadImage = (url: string): Promise<void> =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			if (typeof img.decode === 'function') {
				void img.decode().then(resolve).catch(resolve);
				return;
			}
			resolve();
		};
		img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
		img.src = url;
	});

const dedupeUrls = (urls: readonly string[]) => {
	const seen = new Set<string>();
	const ordered: string[] = [];

	for (const url of urls) {
		if (seen.has(url)) continue;
		seen.add(url);
		ordered.push(url);
	}

	return ordered;
};

const preloadWithConcurrency = async (urls: readonly string[], concurrency: number) => {
	if (urls.length === 0) return;

	const queue = [...urls];
	const workerCount = Math.min(concurrency, queue.length);

	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (queue.length > 0) {
				const url = queue.shift();
				if (!url) break;

				try {
					await loadImage(url);
				} catch {
					/* Best-effort warm-up; `<img>` will retry on render. */
				}
			}
		}),
	);
};

/** Warm HTTP cache + decode HTML overlay sprites before first paint. */
export const preloadHtmlImages = async (
	urls: readonly string[],
	{ priority = [], concurrency = 4 }: PreloadHtmlImagesOptions = {},
) => {
	const ordered = dedupeUrls([...priority, ...urls]);
	const prioritySet = new Set(priority);
	const priorityUrls = ordered.filter((url) => prioritySet.has(url));
	const remainingUrls = ordered.filter((url) => !prioritySet.has(url));

	for (const url of priorityUrls) {
		try {
			await loadImage(url);
		} catch {
			/* noop */
		}
	}

	await preloadWithConcurrency(remainingUrls, concurrency);
};
