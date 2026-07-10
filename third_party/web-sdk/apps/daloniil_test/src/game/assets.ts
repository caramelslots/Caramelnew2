/** Resolve static/ asset URL relative to the deployed page (Stake Engine v### subpath-safe). */
const assetUrl = (path: string) =>
	new URL(path.replace(/^\//, ''), typeof window !== 'undefined' ? window.location.href : import.meta.url).href;

export default {
	mainBackground: {
		type: 'sprite',
		src: assetUrl('assets/sprites/background/day.webp'),
	},
	featureBackground: {
		type: 'sprite',
		src: assetUrl('assets/sprites/background/night.webp'),
	},
	lanternDay: {
		type: 'sprite',
		src: assetUrl('assets/sprites/background/lantern_day.webp'),
	},
	lanternNight: {
		type: 'sprite',
		src: assetUrl('assets/sprites/background/lantern_night.webp'),
	},
	neonBackground: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/neonBackground/skeleton.atlas'),
			skeleton: assetUrl('assets/spines/neonBackground/skeleton.json'),
		},
	},
	boardDayBase: {
		type: 'sprite',
		src: assetUrl('assets/sprites/boardFrame/desk_day_base.webp'),
	},
	boardNightBase: {
		type: 'sprite',
		src: assetUrl('assets/sprites/boardFrame/desk_night_base.webp'),
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
	bonusBarV: {
		type: 'sprite',
		src: assetUrl('assets/sprites/bonusBar/bar_v.webp'),
	},
	bonusBarH: {
		type: 'sprite',
		src: assetUrl('assets/sprites/bonusBar/bar_h.webp'),
	},
	bonusBarCat: {
		type: 'sprite',
		src: assetUrl('assets/sprites/bonusBar/cat_static.png'),
	},
	// Designer-handoff `designer_assets/Symbols/export` — combined skeleton
	// with all symbol slots + bounce/win/explosion animations. Split into
	// per-symbol skeletons by `scripts/splitSymbolsSpine.py` so each ReelSymbol
	// loads only the slots/animations it actually needs (avoids overlapping
	// default-skin renders when a single-attachment animation track plays).
	H1: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/High_1.json'),
			scale: 1,
		},
	},
	H2: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/High_2.json'),
			scale: 1,
		},
	},
	H3: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/High_3.json'),
			scale: 1,
		},
	},
	H4: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/High_4.json'),
			scale: 1,
		},
	},
	L1: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/Low_1.json'),
			scale: 1,
		},
	},
	L2: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/Low_2.json'),
			scale: 1,
		},
	},
	L3: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/Low_3.json'),
			scale: 1,
		},
	},
	L4: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/symbolsNew/symbols.atlas'),
			skeleton: assetUrl('assets/spines/symbolsNew/Low_4.json'),
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
	// Static sprites for resting symbols. Each WebP is cut straight from the
	// packed atlas by `scripts/extractSymbolSprites.py` — no spritesheet
	// because the per-symbol sizes differ (H/L 196², Mystery 256², W/B masked).
	H1Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/High_1.webp'),
	},
	H2Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/High_2.webp'),
	},
	H3Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/High_3.webp'),
	},
	H4Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/High_4.webp'),
	},
	L1Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Low_1.webp'),
	},
	L2Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Low_2.webp'),
	},
	L3Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Low_3.webp'),
	},
	L4Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Low_4.webp'),
	},
	BImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Special_1.webp'),
	},
	WImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Special_2.webp'),
	},
	MImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Mystery_sign.webp'),
	},
	MBgImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Mystery_bg.webp'),
	},
	anticipation: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/anticipation/anticipation.atlas'),
			skeleton: assetUrl('assets/spines/anticipation/anticipation.json'),
			scale: 2,
		},
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
	reelhouse: {
		type: 'spine',
		src: {
			atlas: assetUrl('assets/spines/reelhouse/reelhouse_glow.atlas'),
			skeleton: assetUrl('assets/spines/reelhouse/reelhouse_glow.json'),
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
	coins: {
		type: 'spriteSheet',
		src: assetUrl('assets/sprites/coin/SD2_Coin.json'),
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
} as const;
