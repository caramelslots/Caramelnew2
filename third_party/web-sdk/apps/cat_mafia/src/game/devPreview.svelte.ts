import type { MascotDevPreview, MascotDogSpineAnimation } from './mascotHtmlSpine';
import type { SymbolDevSelection } from './symbolDevPreview';

/*
	Dev-only preview toggles. Shared between DevButtons.svelte (controls) and
	the components they preview. Not used in prod.
*/
export const devPreview = $state({
	/** slow reel scroll to 0.5× (DevButtons toggle) */
	slowReelScroll: false,
	/** force BootstrapLoader (spine logo + progress bar) for DEV preview */
	loaderProgress: false,
	/** fake 0–100 progress while `loaderProgress` is on */
	loaderProgressValue: 0,
	/** force a specific cat mascot Spine clip (null = normal pose-driven playback) */
	mascotAnimation: null as MascotDevPreview | null,
	/**
	 * Force a dog Spine clip on the primary mascot slot (replaces the cat).
	 * Mutually exclusive with `mascotAnimation` in DevButtons.
	 */
	mascotDogAnimation: null as MascotDogSpineAnimation | null,
	/**
	 * Force a spine clip onto matching board cells (null = normal SYMBOL_INFO_MAP).
	 * DevButtons paints the board with the symbol, then getSymbolInfo reads this.
	 */
	symbolAnim: null as SymbolDevSelection | null,
	/** Keep revolver drum HTML overlay visible (FS-only UI) for bullet-fly QA. */
	forceShowDrum: false,
	/**
	 * Desktop FS board chrome: spinboard (left) + barrel rim/drum (right).
	 * Also drives FreeSpinCounter visibility with sample spin text.
	 */
	forceShowFsBoardChrome: false,
	/**
	 * Layout-only Duel preview (dual desks + scale + mascots) without running a book.
	 * Sets `stateDuel.active` with sample banks / counters.
	 */
	forceShowDuelLayout: false,
	/**
	 * Pin designer paw coins on the board (x1 bronze / x2 silver / x3 gold).
	 * `nonce` remounts the sprites so appear can replay.
	 */
	pawCoins: null as null | { tiers: Array<1 | 2 | 3>; nonce: number },
	/**
	 * Designer target board (shooting gallery + 6 flip targets).
	 * Layout / interaction QA before wiring into bonus_normal / bonus_super pick.
	 */
	forceShowTargetBoard: false,
	/**
	 * Stage E 9-target cabinet (`background_9.webp`) in the gold frame.
	 * Pixi wood + HTML seats — art / seat layout QA.
	 */
	forceShowTargetShoot: false,
});
