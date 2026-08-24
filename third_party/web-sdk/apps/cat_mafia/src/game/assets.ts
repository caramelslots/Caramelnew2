/** Resolve static/ asset URL relative to the deployed page (Stake Engine v### subpath-safe). */
const assetUrl = (path: string) =>
	new URL(path.replace(/^\//, ''), typeof window !== 'undefined' ? window.location.href : import.meta.url).href;

export default {
	/** Animated street scene — skins: day (basegame) / night (freegame). */
	mainBackground: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/background/skeleton.atlas'),
			skeleton: assetUrl('assets/spines/background/skeleton.json'),
		},
	},
	boardDayBase: {
		type: 'sprite',
		src: assetUrl('assets/sprites/boardFrame/desk_day_base.webp'),
	},
	boardContour: {
		type: 'sprite',
		src: assetUrl('assets/sprites/boardFrame/desk_contour.webp'),
	},
	outlineReel: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/outlineReel/skeleton.atlas'),
			skeleton: assetUrl('assets/spines/outlineReel/skeleton.json'),
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
			atlas: assetUrl('assets/spines/H1/H1.atlas'),
			skeleton: assetUrl('assets/spines/H1/H1.json'),
			scale: 1,
		},
	},
	H2: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/H2/H2.atlas'),
			skeleton: assetUrl('assets/spines/H2/H2.json'),
			scale: 1,
		},
	},
	H3: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/H3/H3.atlas'),
			skeleton: assetUrl('assets/spines/H3/H3.json'),
			scale: 1,
		},
	},
	H4: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/H4/H4.atlas'),
			skeleton: assetUrl('assets/spines/H4/H4.json'),
			scale: 1,
		},
	},
	L1: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/L1/L1.atlas'),
			skeleton: assetUrl('assets/spines/L1/L1.json'),
			scale: 1,
		},
	},
	L2: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/L2/L2.atlas'),
			skeleton: assetUrl('assets/spines/L2/L2.json'),
			scale: 1,
		},
	},
	L3: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/L3/L3.atlas'),
			skeleton: assetUrl('assets/spines/L3/L3.json'),
			scale: 1,
		},
	},
	L4: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/L4/L4.atlas'),
			skeleton: assetUrl('assets/spines/L4/L4.json'),
			scale: 1,
		},
	},
	// Wild — `Special_2` skeleton holds the bounce/idle clip (no text), so
	// the spinning/landing reels never accidentally render the W/I/L/D
	// letters from default-skin attachments.
	W: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/Special_2.json'),
			scale: 1,
		},
	},
	// Win-only Wild skeleton — used during line-win celebration so each
	// letter (W/I/L/D) drops in via the spine's rgba/scale timelines.
	WWin: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/Special_2_win.json'),
			scale: 1,
		},
	},
	// Bonus — `Special_1` skeleton (body + paw) for idle/spin and `wave` win.
	B: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/Special_1.json'),
			scale: 1,
		},
	},
	// Bullet / cartridge — `designer_assets/render_cartridge` (land `stop` only).
	BT: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/cartridge/cartridge.atlas'),
			skeleton: assetUrl('assets/spines/cartridge/cartridge.json'),
			scale: 1,
		},
	},
	// BONUS-letter skeleton — `Special_1/win` plays on reel landing.
	BWin: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/Special_1_win.json'),
			scale: 1,
		},
	},
	M: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/Mystery.json'),
			scale: 1,
		},
	},
	// Static sprites for spinning / resting cells. H/L/BT are designer
	// WebPs; W/B are cut from the packed symbolsNew atlas.
	H1Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/H1.webp'),
	},
	H2Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/H2.webp'),
	},
	H3Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/H3.webp'),
	},
	H4Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/H4.webp'),
	},
	L1Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/L1.webp'),
	},
	L2Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/L2.webp'),
	},
	L3Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/L3.webp'),
	},
	L4Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/L4.webp'),
	},
	BImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Special_1.webp'),
	},
	BTImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Cartridge.webp'),
	},
	WImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Special_2.webp'),
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
			atlas: assetUrl('assets/spines/fsPopup/fs_popup.atlas'),
			skeleton: assetUrl('assets/spines/fsPopup/fs_popup.json'),
			scale: 2,
		},
	},
	fsCongBoard: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsCong/fs_cong.webp'),
	},
	fsCongNumber: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsCong/10_fs_cong_table.webp'),
	},
	fsLeftCounter: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsLeftCounter/fs_left_counter.webp'),
	},
	transition: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/transition/transition.atlas'),
			skeleton: assetUrl('assets/spines/transition/transition.json'),
			scale: 2,
		},
	},
	/** Full-body cat — same files as the former HTML SpinePlayer mascot. */
	mascotCat: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/mascot/mascot_cat.atlas'),
			skeleton: assetUrl('assets/spines/mascot/mascot_cat.json'),
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
			atlas: assetUrl('assets/spines/coins/coins.atlas'),
			skeleton: assetUrl('assets/spines/coins/coins.json'),
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
		src: assetUrl('assets/sprites/ui/menu/menu.webp'),
	},
	infoButton: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/info/info.webp'),
	},
	turbo1: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/turbo/turbo_1.webp'),
	},
	turbo2: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/turbo/turbo_2.webp'),
	},
	turbo3: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/turbo/turbo_3.webp'),
	},
	revolverBarrel: {
		type: 'sprite',
		src: assetUrl('assets/sprites/revolverDrum/barrel.webp'),
	},
	revolverBullet1: {
		type: 'sprite',
		src: assetUrl('assets/sprites/revolverDrum/bullet_1.webp'),
	},
	revolverBullet2: {
		type: 'sprite',
		src: assetUrl('assets/sprites/revolverDrum/bullet_2.webp'),
	},
	revolverOverlay: {
		type: 'sprite',
		src: assetUrl('assets/sprites/revolverDrum/overlay.webp'),
	},
} as const;
