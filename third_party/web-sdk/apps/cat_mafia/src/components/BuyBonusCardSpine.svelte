<!--
	Buy-bonus card art — HTML SpinePlayer (same path as DuelPickMascot).

	Normal sandwich: street Spine → white mascot → frame Spine.
	Street must share the frame camera (not a full-bleed still) or it spills
	past the gold border.

	Confirm reparents `portalHost` (imperative DOM), never the Svelte root.
-->
<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { SpinePlayer } from '@esotericsoftware/spine-player';
	import '@esotericsoftware/spine-player/dist/spine-player.css';

	import {
		disposeBuyBonusCardSpinePlayer,
		setBuyBonusCardReady,
		trackBuyBonusCardSpinePlayer,
	} from '../game/buyBonusCardGpu';
	import { registerBuyBonusCardSpineHost } from '../game/buyBonusCardHosts';
	import {
		BUY_BONUS_NORMAL_MASCOT_ANIM,
		BUY_BONUS_SPINE_ANIM,
		BUY_BONUS_SPINE_VIEWPORTS,
		buyBonusNormalMascotUrls,
		buyBonusSpineUrls,
		type BuyBonusSpineVariant,
	} from '../game/buyBonusHtmlSpine';

	type Props = {
		variant: BuyBonusSpineVariant;
		/** When false, pause idle loops (warm park / hidden). */
		active?: boolean;
	};

	const { variant, active = true }: Props = $props();

	/** Svelte-owned anchor — never reparented. */
	let rootEl = $state<HTMLDivElement | undefined>();
	/** Imperative host confirm moves; contains street + SpinePlayer canvases. */
	let portalHost = $state<HTMLDivElement | undefined>();
	let bgHost = $state<HTMLDivElement | undefined>();
	let fgHost = $state<HTMLDivElement | undefined>();
	let mascotHost = $state<HTMLDivElement | undefined>();

	let bgPlayer = $state<SpinePlayer | undefined>(undefined);
	let fgPlayer = $state<SpinePlayer | undefined>(undefined);
	let mascotPlayer = $state<SpinePlayer | undefined>(undefined);
	let bgReady = $state(false);
	let fgReady = $state(false);
	let mascotReady = $state(false);

	const isNormal = variant === 'normal';
	const ready = $derived(isNormal ? bgReady && fgReady && mascotReady : fgReady);

	/** Card atlases: normal is PMA; super/duel exports omit pma (straight alpha). */
	const framePremultiplied = variant === 'normal';

	const NORMAL_BG_SLOT = 'normal_background';

	/** BG: only street. FG: everything except street. Animation restores slots — re-apply each frame. */
	const applyLayerSlots = (player: SpinePlayer, layer: 'bg' | 'fg') => {
		const skeleton = player.skeleton;
		if (!skeleton) return;
		for (const slot of skeleton.slots) {
			const isBg = slot.data.name === NORMAL_BG_SLOT;
			const keep = layer === 'bg' ? isBg : !isBg;
			if (!keep) slot.setAttachment(null);
		}
	};

	const padViewport = (vp: { x: number; y: number; width: number; height: number }) => ({
		x: vp.x,
		y: vp.y,
		width: vp.width,
		height: vp.height,
		padLeft: '0%' as const,
		padRight: '0%' as const,
		padTop: '0%' as const,
		padBottom: '0%' as const,
	});

	const startFramePlayer = (
		el: HTMLDivElement,
		layer: 'bg' | 'fg' | 'solo',
		onReady: (player: SpinePlayer) => void,
	) => {
		const urls = buyBonusSpineUrls(variant);
		const anim = BUY_BONUS_SPINE_ANIM[variant];
		const vp = padViewport(BUY_BONUS_SPINE_VIEWPORTS[variant]);

		let disposed = false;
		el.replaceChildren();

		const created = new SpinePlayer(el, {
			jsonUrl: urls.skeleton,
			atlasUrl: urls.atlas,
			animation: anim,
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: framePremultiplied,
			mipmaps: true,
			alpha: true,
			defaultMix: 0,
			viewport: {
				...vp,
				animations: { [anim]: vp },
			},
			update: (spinePlayer) => {
				if (layer === 'bg') applyLayerSlots(spinePlayer, 'bg');
				else if (layer === 'fg' && isNormal) applyLayerSlots(spinePlayer, 'fg');
			},
			success: (spinePlayer) => {
				if (disposed) return;
				spinePlayer.skeleton!.scaleY = -1;
				spinePlayer.animationState?.setAnimation(0, anim, true);
				if (layer === 'bg') applyLayerSlots(spinePlayer, 'bg');
				else if (layer === 'fg' && isNormal) applyLayerSlots(spinePlayer, 'fg');
				spinePlayer.animationState!.timeScale = untrack(() => (active ? 1 : 0));
				trackBuyBonusCardSpinePlayer(created);
				onReady(created);
			},
		});
		trackBuyBonusCardSpinePlayer(created);

		return {
			player: created,
			dispose: () => {
				disposed = true;
				disposeBuyBonusCardSpinePlayer(created);
			},
		};
	};

	/** Build imperative portal once under the Svelte root (safe to reparent). */
	$effect(() => {
		const root = rootEl;
		if (!root) return;

		const portal = document.createElement('div');
		portal.className = 'spine-portal';
		portal.setAttribute('aria-hidden', 'true');

		const fg = document.createElement('div');
		fg.className = 'spine-host fg-host';

		let bg: HTMLDivElement | undefined;
		let mascot: HTMLDivElement | undefined;
		if (isNormal) {
			bg = document.createElement('div');
			bg.className = 'spine-host bg-host';
			mascot = document.createElement('div');
			mascot.className = 'spine-host mascot-host';
			portal.append(bg, mascot, fg);
		} else {
			portal.append(fg);
		}

		root.replaceChildren(portal);
		portalHost = portal;
		bgHost = bg;
		mascotHost = mascot;
		fgHost = fg;
		registerBuyBonusCardSpineHost(variant, portal);

		return () => {
			registerBuyBonusCardSpineHost(variant, null);
			if (portal.parentElement === root) root.replaceChildren();
			else if (portal.isConnected) portal.remove();
			portalHost = undefined;
			bgHost = undefined;
			mascotHost = undefined;
			fgHost = undefined;
		};
	});

	$effect(() => {
		setBuyBonusCardReady(variant, ready);
		return () => setBuyBonusCardReady(variant, false);
	});

	/** Normal street — same Spine camera as the frame (no full-bleed still spill). */
	$effect(() => {
		if (!isNormal) return;
		const el = bgHost;
		if (!el) return;

		untrack(() => {
			disposeBuyBonusCardSpinePlayer(bgPlayer);
			bgPlayer = undefined;
		});
		bgReady = false;
		const started = startFramePlayer(el, 'bg', (player) => {
			bgPlayer = player;
			bgReady = true;
		});
		bgPlayer = started.player;

		return () => {
			started.dispose();
			if (bgPlayer === started.player) bgPlayer = undefined;
			bgReady = false;
		};
	});

	/** Frame / full card (fg for normal = no street; solo for super/duel). */
	$effect(() => {
		const el = fgHost;
		if (!el) return;

		untrack(() => {
			disposeBuyBonusCardSpinePlayer(fgPlayer);
			fgPlayer = undefined;
		});
		fgReady = false;
		const started = startFramePlayer(el, isNormal ? 'fg' : 'solo', (player) => {
			fgPlayer = player;
			fgReady = true;
		});
		fgPlayer = started.player;

		return () => {
			started.dispose();
			if (fgPlayer === started.player) fgPlayer = undefined;
			fgReady = false;
		};
	});

	/** White mascot between street and frame. */
	$effect(() => {
		if (!isNormal) return;
		const el = mascotHost;
		if (!el) return;
		const urls = buyBonusNormalMascotUrls();
		const anim = BUY_BONUS_NORMAL_MASCOT_ANIM;
		const vp = padViewport(BUY_BONUS_SPINE_VIEWPORTS.normal);

		let disposed = false;
		untrack(() => {
			disposeBuyBonusCardSpinePlayer(mascotPlayer);
			mascotPlayer = undefined;
		});
		mascotReady = false;
		el.replaceChildren();

		const created = new SpinePlayer(el, {
			jsonUrl: urls.skeleton,
			atlasUrl: urls.atlas,
			animation: anim,
			showControls: false,
			showLoading: false,
			backgroundColor: '#00000000',
			premultipliedAlpha: false,
			mipmaps: true,
			alpha: true,
			defaultMix: 0.15,
			viewport: {
				...vp,
				animations: { [anim]: vp },
			},
			success: (spinePlayer) => {
				if (disposed) return;
				spinePlayer.skeleton!.scaleY = -1;
				try {
					spinePlayer.skeleton!.setAttachment('smile', null);
				} catch {
					spinePlayer.skeleton!.findSlot('smile')?.setAttachment(null);
				}
				spinePlayer.animationState?.setAnimation(0, anim, true);
				spinePlayer.animationState!.timeScale = untrack(() => (active ? 1 : 0));
				mascotPlayer = created;
				trackBuyBonusCardSpinePlayer(created);
				mascotReady = true;
			},
		});
		mascotPlayer = created;
		trackBuyBonusCardSpinePlayer(created);

		return () => {
			disposed = true;
			disposeBuyBonusCardSpinePlayer(created);
			if (mascotPlayer === created) mascotPlayer = undefined;
			mascotReady = false;
		};
	});

	$effect(() => {
		const playing = active ? 1 : 0;
		if (bgPlayer?.animationState) bgPlayer.animationState.timeScale = playing;
		if (fgPlayer?.animationState) fgPlayer.animationState.timeScale = playing;
		if (mascotPlayer?.animationState) mascotPlayer.animationState.timeScale = playing;
	});

	onDestroy(() => {
		setBuyBonusCardReady(variant, false);
		disposeBuyBonusCardSpinePlayer(bgPlayer);
		disposeBuyBonusCardSpinePlayer(fgPlayer);
		disposeBuyBonusCardSpinePlayer(mascotPlayer);
		bgPlayer = undefined;
		fgPlayer = undefined;
		mascotPlayer = undefined;
	});
</script>

<div class="buy-bonus-card-spine" class:ready bind:this={rootEl} aria-hidden="true"></div>

<style lang="scss">
	.buy-bonus-card-spine {
		position: absolute;
		inset: 0;
		z-index: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: hidden;
		opacity: 0;
	}

	.buy-bonus-card-spine.ready {
		opacity: 1;
	}

	.buy-bonus-card-spine :global(.spine-portal) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.buy-bonus-card-spine :global(.spine-host),
	:global(.spine-portal .spine-host) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.buy-bonus-card-spine :global(.bg-host),
	:global(.spine-portal .bg-host) {
		z-index: 0;
	}

	.buy-bonus-card-spine :global(.mascot-host),
	:global(.spine-portal .mascot-host) {
		z-index: 1;
	}

	.buy-bonus-card-spine :global(.fg-host),
	:global(.spine-portal .fg-host) {
		z-index: 2;
	}

	.buy-bonus-card-spine :global(.street-still),
	:global(.spine-portal .street-still) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		pointer-events: none;
		user-select: none;
	}

	.buy-bonus-card-spine :global(.spine-player),
	:global(.spine-portal .spine-player) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: transparent !important;
	}

	.buy-bonus-card-spine :global(.spine-player-canvas),
	:global(.spine-portal .spine-player-canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
		background: transparent !important;
	}
</style>
