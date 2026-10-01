type PreloadHtmlImagesOptions = {
	/** Loaded sequentially before the rest (e.g. first carousel slide). */
	priority?: readonly string[];
	concurrency?: number;
};

export type HtmlPreloadMemoryEntry = {
	url: string;
	pixelWidth: number;
	pixelHeight: number;
	bytes: number;
};

const RGBA_BYTES = 4;

/**
 * Dev RAM registry: images we decoded via `preloadHtmlImages`.
 * Metadata only — we do not retain the HTMLImageElement (browser cache may still hold pixels).
 */
const htmlPreloadRegistry = new Map<string, HtmlPreloadMemoryEntry>();

const shortPathLabel = (path: string) =>
	path.replace(/^.*\//, '').slice(0, 28) || path.slice(0, 28);

const recordPreload = (url: string, img: HTMLImageElement) => {
	const w = (img.naturalWidth || img.width) | 0;
	const h = (img.naturalHeight || img.height) | 0;
	if (w <= 0 || h <= 0) return;
	htmlPreloadRegistry.set(url, {
		url,
		pixelWidth: w,
		pixelHeight: h,
		bytes: w * h * RGBA_BYTES,
	});
};

const loadImage = (url: string): Promise<void> =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const finish = () => {
				recordPreload(url, img);
				resolve();
			};
			if (typeof img.decode === 'function') {
				void img.decode().then(finish).catch(finish);
				return;
			}
			finish();
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

/** All URLs recorded by preloadHtmlImages (for Dev RAM). */
export const getHtmlPreloadMemoryEntries = (): readonly HtmlPreloadMemoryEntry[] =>
	[...htmlPreloadRegistry.values()];

/** Drop registry rows (Dev / teardown). Does not force browser image-cache eviction. */
export const clearHtmlPreloadMemoryRegistry = (urls?: readonly string[]) => {
	if (!urls) {
		htmlPreloadRegistry.clear();
		return;
	}
	for (const url of urls) htmlPreloadRegistry.delete(url);
};

export const htmlPreloadLabel = (url: string) => `preload:${shortPathLabel(url)}`;
