export default {
	loader: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/loader/loader.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/loader/loader.json', import.meta.url).href,
			scale: 2,
		},
		preload: true,
	},
	mainBackground: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/day.png', import.meta.url).href,
		preload: true,
	},
	featureBackground: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/night.png', import.meta.url).href,
		preload: true,
	},
	lanternDay: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/lantern_day.png', import.meta.url).href,
		preload: true,
	},
	lanternNight: {
		type: 'sprite',
		src: new URL('../../assets/sprites/background/lantern_night.png', import.meta.url).href,
		preload: true,
	},
	boardDay: {
		type: 'sprite',
		src: new URL('../../assets/sprites/boardFrame/desk_day.png', import.meta.url).href,
		preload: true,
	},
	boardNight: {
		type: 'sprite',
		src: new URL('../../assets/sprites/boardFrame/desk_night.png', import.meta.url).href,
		preload: true,
	},
	pressToContinueText: {
		type: 'sprites',
		src: new URL('../../assets/sprites/pressToContinueText/MM_pressanywhere.json', import.meta.url)
			.href,
		preload: true,
	},
	// Designer-handoff `designer_assets/Symbols/export` — combined skeleton
	// with all symbol slots + bounce/win/explosion animations. Split into
	// per-symbol skeletons by `scripts/splitSymbolsSpine.py` so each ReelSymbol
	// loads only the slots/animations it actually needs (avoids overlapping
	// default-skin renders when a single-attachment animation track plays).
	H1: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/High_1.json', import.meta.url).href,
			scale: 1,
		},
	},
	H2: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/High_2.json', import.meta.url).href,
			scale: 1,
		},
	},
	H3: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/High_3.json', import.meta.url).href,
			scale: 1,
		},
	},
	H4: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/High_4.json', import.meta.url).href,
			scale: 1,
		},
	},
	L1: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/Low_1.json', import.meta.url).href,
			scale: 1,
		},
	},
	L2: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/Low_2.json', import.meta.url).href,
			scale: 1,
		},
	},
	L3: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/Low_3.json', import.meta.url).href,
			scale: 1,
		},
	},
	L4: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/Low_4.json', import.meta.url).href,
			scale: 1,
		},
	},
	explosion: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbols3/symbols3.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbols3/explosion.json', import.meta.url).href,
			scale: 2,
		},
	},
	// Wild — `Special_2` skeleton holds the bounce/idle clip (no text), so
	// the spinning/landing reels never accidentally render the W/I/L/D
	// letters from default-skin attachments.
	W: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/Special_2.json', import.meta.url).href,
			scale: 1,
		},
	},
	// Win-only Wild skeleton — used during line-win celebration so each
	// letter (W/I/L/D) drops in via the spine's rgba/scale timelines.
	WWin: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/Special_2_win.json', import.meta.url)
				.href,
			scale: 1,
		},
	},
	// Bonus — `Special_1` skeleton keeps just the kitty body + paw chain so
	// `Special_1/wave` can play on landing without bleeding BONUS letters
	// through the default skin.
	B: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/Special_1.json', import.meta.url).href,
			scale: 1,
		},
	},
	// Win-only Bonus skeleton — used during scatter/bonus-collect win so
	// each letter (B/O/N/U/S) reveals via the spine's win track.
	BWin: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/Special_1_win.json', import.meta.url)
				.href,
			scale: 1,
		},
	},
	M: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/symbolsNew/symbols.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/symbolsNew/Mystery.json', import.meta.url).href,
			scale: 1,
		},
	},
	// Static sprites for resting symbols. Each PNG comes straight from the
	// designer handoff (`designer_assets/Symbols/images/`) — no spritesheet
	// because the per-symbol sizes differ (H/L 196², Mystery 256², W/B masked).
	H1Img: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/High_1.png', import.meta.url).href,
	},
	H2Img: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/High_2.png', import.meta.url).href,
	},
	H3Img: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/High_3.png', import.meta.url).href,
	},
	H4Img: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/High_4.png', import.meta.url).href,
	},
	L1Img: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/Low_1.png', import.meta.url).href,
	},
	L2Img: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/Low_2.png', import.meta.url).href,
	},
	L3Img: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/Low_3.png', import.meta.url).href,
	},
	L4Img: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/Low_4.png', import.meta.url).href,
	},
	BImg: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/Special_1.png', import.meta.url).href,
	},
	WImg: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/Special_2.png', import.meta.url).href,
	},
	MImg: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/Mystery_sign.png', import.meta.url).href,
	},
	MBgImg: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbolsNew/Mystery_bg.png', import.meta.url).href,
	},
	reelsFrame: {
		type: 'sprites',
		src: new URL('../../assets/sprites/reelsFrame/reels_frame.json', import.meta.url).href,
	},
	payFrame: {
		type: 'sprite',
		src: new URL('../../assets/sprites/payFrame/payFrame.png', import.meta.url).href,
	},
	anticipation: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/anticipation/anticipation.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/anticipation/anticipation.json', import.meta.url).href,
			scale: 2,
		},
	},
	goldFont: {
		type: 'font',
		src: new URL('../../assets/fonts/goldFont/mm_gold.xml', import.meta.url).href,
	},
	goldBlur: {
		type: 'font',
		src: new URL('../../assets/fonts/goldBlur/miningfont_gold_blur.xml', import.meta.url).href,
	},
	silverFont: {
		type: 'font',
		src: new URL('../../assets/fonts/silverFont/mm_silver.xml', import.meta.url).href,
	},
	purpleFont: {
		type: 'font',
		src: new URL('../../assets/fonts/purpleFont/mm_purple.xml', import.meta.url).href,
	},
	bigwin: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/bigwin/big_wins.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/bigwin/mm_bigwin.json', import.meta.url).href,
			scale: 2,
		},
	},
	globalMultiplier: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/globalMultiplier/multiframe.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/globalMultiplier/multiframe.json', import.meta.url)
				.href,
			scale: 2,
		},
	},
	fsIntro: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/fsIntro/fs_screen.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/fsIntro/fs_screen.json', import.meta.url).href,
			scale: 2,
		},
	},
	fsIntroNumber: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/fsIntro/fs_screen.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/fsIntro/fs_screen_number.json', import.meta.url).href,
			scale: 2,
		},
	},
	fsOutroNumber: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/fsIntro/fs_screen.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/fsIntro/fs_total_number.json', import.meta.url).href,
			scale: 2,
		},
	},
	foregroundAnimation: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/foregroundAnimation/mm_bg.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/foregroundAnimation/mm_bg.json', import.meta.url).href,
			scale: 2,
		},
		preload: true,
	},
	foregroundFeatureAnimation: {
		type: 'spine',
		src: {
			atlas: new URL(
				'../../assets/spines/foregroundFeatureAnimation/mm_bg_feature.atlas',
				import.meta.url,
			).href,
			skeleton: new URL(
				'../../assets/spines/foregroundFeatureAnimation/mm_bg_feature.json',
				import.meta.url,
			).href,
			scale: 2,
		},
		preload: true,
	},
	tumble_multiplier: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/tumbleWin/tumble_win.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/tumbleWin/tumble_multiplier.json', import.meta.url)
				.href,
			scale: 2,
		},
	},
	tumble_win: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/tumbleWin/tumble_win.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/tumbleWin/tumble_win.json', import.meta.url).href,
			scale: 2,
		},
	},
	reelhouse: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/reelhouse/reelhouse_glow.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/reelhouse/reelhouse_glow.json', import.meta.url).href,
			scale: 2,
		},
	},
	progressBar: {
		type: 'sprites',
		src: new URL('../../assets/sprites/progressBar/progressBar.json', import.meta.url).href,
		preload: true,
	},
	freeSpins: {
		type: 'sprites',
		src: new URL('../../assets/sprites/freeSpins/freeSpins.json', import.meta.url).href,
	},
	winSmall: {
		type: 'sprites',
		src: new URL('../../assets/sprites/winSmall/MM_Localisation_winsmall.json', import.meta.url)
			.href,
	},
	clusterWin: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/clusterWin/clusterpay.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/clusterWin/clusterpay.json', import.meta.url).href,
			scale: 2,
		},
	},
	transition: {
		type: 'spine',
		src: {
			atlas: new URL('../../assets/spines/transition/transition.atlas', import.meta.url).href,
			skeleton: new URL('../../assets/spines/transition/transition.json', import.meta.url).href,
			scale: 2,
		},
	},
	symbolsStatic: {
		type: 'sprites',
		src: new URL('../../assets/sprites/symbolsStatic/symbolsStatic.json', import.meta.url).href,
	},
	coins: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/coin/SD2_Coin.json', import.meta.url).href,
	},
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
		preload: true,
	},
} as const;
