/** Resolve static/ asset URL relative to the deployed page (Stake Engine v### subpath-safe). */
const assetUrl = (path: string) =>
	new URL(path.replace(/^\//, ''), typeof window !== 'undefined' ? window.location.href : import.meta.url).href;

export default {
	mainBackground: {
		type: 'sprite',
		src: assetUrl('assets/sprites/background/day.png'),
		preload: true,
	},
	featureBackground: {
		type: 'sprite',
		src: assetUrl('assets/sprites/background/night.png'),
		preload: true,
	},
	lanternDay: {
		type: 'sprite',
		src: assetUrl('assets/sprites/background/lantern_day.png'),
		preload: true,
	},
	lanternNight: {
		type: 'sprite',
		src: assetUrl('assets/sprites/background/lantern_night.png'),
		preload: true,
	},
	boardDay: {
		type: 'sprite',
		src: assetUrl('assets/sprites/boardFrame/desk_day.png'),
		preload: true,
	},
	boardNight: {
		type: 'sprite',
		src: assetUrl('assets/sprites/boardFrame/desk_night.png'),
		preload: true,
	},
	bonusBarV: {
		type: 'sprite',
		src: assetUrl('assets/sprites/bonusBar/bar_v.png'),
	},
	bonusBarH: {
		type: 'sprite',
		src: assetUrl('assets/sprites/bonusBar/bar_h.png'),
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
	// Static sprites for resting symbols. Each PNG comes straight from the
	// designer handoff (`designer_assets/Symbols/images/`) — no spritesheet
	// because the per-symbol sizes differ (H/L 196², Mystery 256², W/B masked).
	H1Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/High_1.png'),
	},
	H2Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/High_2.png'),
	},
	H3Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/High_3.png'),
	},
	H4Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/High_4.png'),
	},
	L1Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Low_1.png'),
	},
	L2Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Low_2.png'),
	},
	L3Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Low_3.png'),
	},
	L4Img: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Low_4.png'),
	},
	BImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Special_1.png'),
	},
	WImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Special_2.png'),
	},
	MImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Mystery_sign.png'),
	},
	MBgImg: {
		type: 'sprite',
		src: assetUrl('assets/sprites/symbolsNew/Mystery_bg.png'),
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
	prostoiWhiteFont: {
		type: 'font',
		src: assetUrl('assets/fonts/prostoiWhiteFont/prostoiWhite_langs.fnt'),
	},
	krutoiFont: {
		type: 'font',
		src: assetUrl('assets/fonts/krutoiFont/krutoi_langs.fnt'),
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
	progressBar: {
		type: 'sprites',
		src: assetUrl('assets/sprites/progressBar/progressBar.json'),
		preload: true,
	},
	freeSpins: {
		type: 'sprites',
		src: assetUrl('assets/sprites/freeSpins/freeSpins.json'),
	},
	fsCongBoard: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsCong/fs_cong.png'),
	},
	fsCongNumber: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsCong/10_fs_cong_table.png'),
	},
	fsLeftCounter: {
		type: 'sprite',
		src: assetUrl('assets/sprites/fsLeftCounter/fs_left_counter.png'),
	},
	winSmall: {
		type: 'sprites',
		src: new URL('../../assets/sprites/winSmall/MM_Localisation_winsmall.json', import.meta.url)
			.href,
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
		preload: true,
	},
	betPlus: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/bet/plus.png'),
	},
	betMinus: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/bet/minus.png'),
	},
	autoplayButton: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/autoplay/autoplay.png'),
	},
	autoplayMobileButton: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/autoplay/autoplay_mobile.png'),
	},
	spin1: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/spin/spin_1.png'),
	},
	spin2: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/spin/spin_2.png'),
	},
	menuButton: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/menu/menu.png'),
	},
	infoButton: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/info/info.png'),
	},
	turbo1: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/turbo/turbo_1.png'),
	},
	turbo2: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/turbo/turbo_2.png'),
	},
	turbo3: {
		type: 'sprite',
		src: assetUrl('assets/sprites/ui/turbo/turbo_3.png'),
	},
} as const;
