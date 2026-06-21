/**
 * Localized FS-outro banner copy — matches legacy `winsmall_*` / `freespins_*`
 * and `totalwin.png` from SDK atlases.
 */
const FS_OUTRO_YOU_WON: Record<string, string> = {
	ar: 'لقد فزت',
	de: 'SIE HABEN GEWONNEN',
	en: 'YOU WON',
	es: 'HAS GANADO',
	fi: 'VOITIT',
	fr: 'VOUS AVEZ GAGNÉ',
	hi: 'आपकी जीत',
	id: 'KAMU MENANG',
	ja: '獲得額',
	ko: '귀하께서 승리하셨습니다',
	pl: 'WYGRYWASZ',
	pt: 'VOCÊ GANHOU',
	ru: 'ВЫ ВЫИГРАЛИ',
	tr: 'KAZANDINIZ',
	vi: 'BẠN THẮNG',
	zh: '您赢得了',
};

const FS_OUTRO_CONGRATULATIONS: Record<string, string> = {
	ar: '!هنيئاً',
	de: 'HERZLICHEN GLÜCKWUNSCH!',
	en: 'CONGRATULATIONS!',
	es: '¡ENHORABUENA!',
	fi: 'ONNITTELUT!',
	fr: 'FÉLICITATIONS!',
	hi: 'बधाई हो!',
	id: 'SELAMAT!',
	ja: 'やったぜ！',
	ko: '축하합니다!',
	pl: 'GRATULACJE!',
	pt: 'PARABÉNS!',
	ru: 'ПОЗДРАВЛЯЕМ!',
	tr: 'TEBRİKLER!',
	vi: 'CHÚC MỪNG!',
	zh: '恭喜！',
};

/** Legacy `totalwin.png` — single English frame in both atlases. */
export const FS_OUTRO_TOTAL_WIN_LABEL = 'TOTAL WIN';

const pick = (map: Record<string, string>, lang: string) => map[lang] ?? map.en;

export const getFsOutroYouWonText = (lang: string) => pick(FS_OUTRO_YOU_WON, lang);

export const getFsOutroCongratulationsText = (lang: string) => pick(FS_OUTRO_CONGRATULATIONS, lang);
