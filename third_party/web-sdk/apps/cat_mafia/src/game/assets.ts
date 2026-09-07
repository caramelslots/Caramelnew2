/** Resolve static/ asset URL relative to the deployed page (Stake Engine v### subpath-safe). */
const assetUrl = (path: string) =>
	new URL(
		path.replace(/^\//, ''),
		typeof window !== 'undefined' ? window.location.href : import.meta.url,
	).href;

export default {
	/** Animated street scene — skins: day (basegame) / night (freegame). */
	mainBackground: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/background/skeleton.atlas'),
			skeleton: assetUrl('assets/spines/background/skeleton.json'),
		},
	},
	/** Designer board spine — desk body + crest glow pulse (`animation`). */
	boardFrame: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/board/board.atlas'),
			skeleton: assetUrl('assets/spines/board/board.json'),
		},
	},
	outlineReel: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/bonusReel/skeleton.atlas'),
			skeleton: assetUrl('assets/spines/bonusReel/skeleton.json'),
		},
	},
	/** Tir shot projectile + impact (`designer_assets/bullet`). */
	shotBullet: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/shotBullet/shot_bullet.atlas'),
			skeleton: assetUrl('assets/spines/shotBullet/shot_bullet.json'),
			scale: 1,
		},
	},
	/** Tir seat flip (disc only — Pixi, not HTML SpinePlayer). */
	targetBoardFlip: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/targetBoard/target_board.atlas'),
			skeleton: assetUrl('assets/spines/targetBoard/target_board.json'),
			scale: 1,
		},
	},
	/** Super Wild column curtain (`open` → `idle` + wheel). Pixi, not HTML SpinePlayer. */
	superWildCurtain: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/superWild/WILD_F_1.atlas'),
			skeleton: assetUrl('assets/spines/superWild/WILD_F_1.json'),
			scale: 1,
		},
	},
	// Designer-handoff `designer_assets/Symbols/export` — combined skeleton
	// with all symbol slots + bounce/win/explosion animations. Split into
	// per-symbol skeletons by `scripts/splitSymbolsSpine.py` so each ReelSymbol
	// loads only the slots/animations it actually needs (avoids overlapping
	// default-skin renders when a single-attachment animation track plays).
	// H1–H4 / L1–L4 designer spines (idle / stop / win|activation).
	H1: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/H1/H1.atlas'),
			skeleton: assetUrl('assets/spines/symbols/H1/H1.json'),
			scale: 1,
		},
	},
	H2: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/H2/H2.atlas'),
			skeleton: assetUrl('assets/spines/symbols/H2/H2.json'),
			scale: 1,
		},
	},
	H3: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/H3/H3.atlas'),
			skeleton: assetUrl('assets/spines/symbols/H3/H3.json'),
			scale: 1,
		},
	},
	H4: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/H4/H4.atlas'),
			skeleton: assetUrl('assets/spines/symbols/H4/H4.json'),
			scale: 1,
		},
	},
	L1: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/L1/L1.atlas'),
			skeleton: assetUrl('assets/spines/symbols/L1/L1.json'),
			scale: 1,
		},
	},
	L2: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/L2/L2.atlas'),
			skeleton: assetUrl('assets/spines/symbols/L2/L2.json'),
			scale: 1,
		},
	},
	L3: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/L3/L3.atlas'),
			skeleton: assetUrl('assets/spines/symbols/L3/L3.json'),
			scale: 1,
		},
	},
	L4: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/L4/L4.atlas'),
			skeleton: assetUrl('assets/spines/symbols/L4/L4.json'),
			scale: 1,
		},
	},
	// Bonus — designer `export_cat` (idle / land / activate).
	B: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/B/B.atlas'),
			skeleton: assetUrl('assets/spines/symbols/B/B.json'),
			scale: 1,
		},
	},
	// Duel Bonus (BD) — designer `export_cat&dog` (idle / land / activate).
	BD: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/BD/BD.atlas'),
			skeleton: assetUrl('assets/spines/symbols/BD/BD.json'),
			scale: 1,
		},
	},
	// Bullet / cartridge — `designer_assets/render_cartridge` (land `stop` only).
	BT: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/cartridge/cartridge.atlas'),
			skeleton: assetUrl('assets/spines/symbols/cartridge/cartridge.json'),
			scale: 1,
		},
	},
	// Static sprites for spinning / resting cells.
	H1Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/H1.webp'),
	},
	H2Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/H2.webp'),
	},
	H3Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/H3.webp'),
	},
	H4Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/H4.webp'),
	},
	L1Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/L1.webp'),
	},
	L2Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/L2.webp'),
	},
	L3Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/L3.webp'),
	},
	L4Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/L4.webp'),
	},
	BImg: {
		type: 'sprite',
		// Bonus static/spin — designer `кот статика` (normal + super).
		src: assetUrl('assets/sprites/symbols/Bonus.webp'),
	},
	/** Duel Bonus (BD) — designer `котопес статика`; math buy-duel only. */
	BDuelImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/BonusDuel.webp'),
	},
	BTImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/Cartridge.webp'),
	},
	WImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/Wild.webp'),
	},
	/** Super Wild board tile — same art as regular Wild. */
	SWImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbols/Wild.webp'),
	},
	babloFont: {
		type: 'font',
		src: assetUrl('assets/fonts/babloFont/bablo.fnt'),
	},
	prostoiFont: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiFont/prostoi_langs.fnt'),
	},
	prostoiFontRu: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiFont/prostoi_ru.fnt'),
	},
	prostoiFontHi: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiFont/prostoi_hi.fnt'),
	},
	prostoiFontVi: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiFont/prostoi_vi.fnt'),
	},
	prostoiFontCjk: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiFont/prostoi_cjk.fnt'),
	},
	prostoiWhiteFont: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiWhiteFont/prostoiWhite_langs.fnt'),
	},
	prostoiWhiteFontRu: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiWhiteFont/prostoiWhite_ru.fnt'),
	},
	prostoiWhiteFontHi: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiWhiteFont/prostoiWhite_hi.fnt'),
	},
	prostoiWhiteFontVi: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiWhiteFont/prostoiWhite_vi.fnt'),
	},
	prostoiWhiteFontCjk: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiWhiteFont/prostoiWhite_cjk.fnt'),
	},
	krutoiFont: {
		type: 'font',
		src: assetUrl('assets/fonts/krutoiFont/krutoi_langs.fnt'),
	},
	krutoiFontRu: {
		type: 'font',
		src: assetUrl('assets/fonts/krutoiFont/krutoi_ru.fnt'),
	},
	bigwin: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/bigwin/big_wins.atlas'),
			skeleton: assetUrl('assets/spines/bigwin/mm_bigwin.json'),
			scale: 2,
		},
	},
	fsPopup: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/fsEnd/fs_popup.atlas'),
			skeleton: assetUrl('assets/spines/fsEnd/fs_popup.json'),
			scale: 2,
		},
	},
	/** Free-spins congrats modal layers (designer FS_* — stacked in FreeSpinIntro). */
	fsCongRays: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsCong/fs_rays.webp'),
	},
	fsCongBg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsCong/fs_bg.webp'),
	},
	fsCongFrame: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsCong/fs_frame.webp'),
	},
	/** Empty FREE SPINS banner (gems + frame) — label text is overlaid for i18n. */
	fsCongBoard: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsCong/fs_board.webp'),
	},
	/** Desktop FS plaque (Bonus / Super Bonus) — mounts to the left of the board. */
	fsLeftCounterSpinboard: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsLeftCounter/spinboard.webp'),
	},
	transition: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/transition/transition.atlas'),
			skeleton: assetUrl('assets/spines/transition/transition.json'),
			scale: 2,
		},
	},
	/** Full-body cat — white (freegame / duel). Ref. designer_assets/cat_render/white. */
	mascotCat: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/mascot/white/mascot_cat.atlas'),
			skeleton: assetUrl('assets/spines/mascot/white/mascot_cat.json'),
			scale: 1,
		},
	},
	/** Full-body cat — gray (basegame). Ref. designer_assets/gray. */
	mascotCatGray: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/mascot/gray/mascot_cat.atlas'),
			skeleton: assetUrl('assets/spines/mascot/gray/mascot_cat.json'),
			scale: 1,
		},
	},
	/** Duel left-side dog mascot (`designer_assets/dog` → 4.2 runtime export). */
	mascotDog: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/mascot/mascot_dog.atlas'),
			skeleton: assetUrl('assets/spines/mascot/mascot_dog.json'),
			scale: 1,
		},
	},
	coins: {
		type: 'spriteSheet',
		src: assetUrl('assets/sprites/coin/SD2_Coin.json'),
	},
	// Baked paw-coin animations (bronze/silver/gold × appear/loop) — board
	// symbols PB/PS/PG render from this sheet (SymbolCoinPaw.svelte).
	// Live coin spine (60fps, skins coin_bronze/coin_silver/coin_gold) — board
	// symbols PB/PS/PG render this natively in Pixi instead of the baked sheet.
	coinsPaw: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbols/coins/coins.atlas'),
			skeleton: assetUrl('assets/spines/symbols/coins/coins.json'),
			scale: 1,
		},
	},
	sound: {
		type: 'audio',
		src: assetUrl('assets/audio/sounds.json'),
	},
	betPlus: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/bet/plus.webp'),
	},
	betMinus: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/bet/minus.webp'),
	},
	autoplayButton: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/autoplay/autoplay.webp'),
	},
	autoplayMobileButton: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/autoplay/autoplay_mobile.webp'),
	},
	spin1: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/spin/spin_1.webp'),
	},
	spin2: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/spin/spin_2.webp'),
	},
	menuButton: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/settings/menu.webp'),
	},
	infoButton: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/info/info.webp'),
	},
	turbo1: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/settings/turbo_1.webp'),
	},
	turbo2: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/settings/turbo_2.webp'),
	},
	turbo3: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/settings/turbo_3.webp'),
	},
	revolverBarrel: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsExtraCounter/barrel.webp'),
	},
	/** Desktop gold rim + left mounts around the revolver drum. */
	revolverBarrelRim: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsExtraCounter/barrel_rim.webp'),
	},
	revolverBullet1: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsExtraCounter/bullet_1.webp'),
	},
	revolverBullet2: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsExtraCounter/bullet_2.webp'),
	},
	revolverOverlay: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsExtraCounter/overlay.webp'),
	},
} as const;
