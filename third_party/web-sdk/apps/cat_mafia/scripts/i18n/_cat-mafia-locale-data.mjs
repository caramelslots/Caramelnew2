const betModes = (t) => [t.base, t.boost, t.buyNormal, t.buySuper, t.duelCat, t.duelDog].join('\n');
const controls = (t) =>
	[t.spin, t.space, t.minus, t.plus, t.buyBonus, t.boost, t.autoplay, t.turbo, t.info, t.menu, t.balance, t.amount].join('\n');

const pack = (game, social, loader) => ({ gameInfo: game, socialGameInfo: social, loaderCards: loader });

export const localePacks = {
	de: pack(
		{
			GAME_INFO_ABOUT_BODY:
				'Cat Mafia ist ein Slot mit 5 Walzen und 4 Reihen sowie 20 Gewinnlinien. Gewinne werden von links nach rechts auf benachbarten Walzen ausgezahlt, beginnend bei der linken Walze. Für einen Gewinn auf einer Linie sind mindestens 3 übereinstimmende Symbole erforderlich. Pro Linie wird nur der höchste Gewinn ausgezahlt. In der Basisrunde können Paw-Münzen oder Super Wild in einem Dreh auslösen — aber nie beides gleichzeitig. Erhalte 3 oder mehr Bonus-Symbole, um Freispiele zu starten und ein Ziel für 8, 10 oder 12 Freispiele zu wählen.',
			GAME_INFO_PAYLINES_TITLE: 'GEWINNLINIEN (20)',
			GAME_INFO_PAYLINES_NOTE:
				'Alle 20 Gewinnlinien sind immer aktiv. Gewinne werden von links nach rechts auf benachbarten Walzen ausgezahlt, beginnend bei der linken Walze. Für eine gültige Gewinnlinie sind mindestens 3 übereinstimmende Symbole auf benachbarten Walzen erforderlich.',
			GAME_INFO_FS_BODY:
				'Erhalte 3 oder mehr Bonus-Symbole in der Basisrunde, um Freispiele auszulösen. Wähle eines von sechs Zielen, um 8, 10 oder 12 Freispiele zu enthüllen. Drei Bonus-Symbole starten Normal Bonus; vier oder mehr starten Super Bonus mit einer sticky Super-Wild-Spalte ab dem ersten Dreh. Bonus-Symbole erscheinen während Freispielen nicht und können das Feature nicht erneut auslösen. Nach den Haupt-Freispielen können in der Revolvertrommel gesammelte Kugeln über die Zielschuss-Runde zusätzliche Freispiele vergeben.',
			GAME_INFO_DUEL_BONUS_TITLE: 'DUEL BONUS',
			GAME_INFO_DUEL_BONUS_BODY:
				'Das Duel-Bonus-Symbol erscheint nur beim Kauf von Duel für 150× deines Basiseinsatzes. Drei Duel-Bonus-Symbole landen beim Kauf-Reveal und starten das Feature — wähle Katze oder Hund, dann drehen zwei Boards je 10 Runden. Schlage die Gesamtsumme der Gegenseite und nimm beide Banken. Im Duel-Modus gibt es keine Freispiele, Paw-Münzen oder Kugeln.',
			GAME_INFO_SUPER_WILD_TITLE: 'SUPER WILD',
			GAME_INFO_SUPER_WILD_BODY:
				'Super Wild ist vom normalen Wild getrennt und kann Multiplikatoren ×2, ×4, ×6, ×8 oder selten ×25, ×50 oder ×75 zeigen. In der Basisrunde expandiert die Spalte nur, wenn Super Wild Teil einer Gewinnlinie ist, und multipliziert dann den Drehgewinn. In Freispielen kann es ohne Liniengewinn expandieren und auf bis zu zwei Spalten sticky werden; Super Bonus startet mit einer bereits offenen sticky Spalte. Mehrere Super-Wild-Multiplikatoren in einem Dreh werden miteinander multipliziert.',
			GAME_INFO_PAW_TITLE: 'PAW-MÜNZE',
			GAME_INFO_PAW_BODY:
				'Paw-Münzen erscheinen nur in der Basisrunde. Bronze wandelt eine Reihe, Silber zwei Reihen und Gold drei Reihen nach dem Zählen der Liniengewinne in Münzpreise um. Niedrige Symbole zahlen ×1 Einsatz, mittlere hohe ×2 und Top-Symbole, Wild oder Bonus ×3. Die Paw-Münze selbst zahlt nichts. Paw und Super Wild können nicht im selben Dreh auslösen.',
			GAME_INFO_BULLET_TITLE: 'KUGEL',
			GAME_INFO_BULLET_BODY:
				'Während der Haupt-Freispiele füllen Kugel-Symbole die Revolvertrommel (maximal 6). Wenn die Hauptdrehs enden, schießt die Katze automatisch auf Ziele. Jeder Treffer kann nichts oder +1, +2 oder +3 Extra-Freispiele geben. Kugeln erscheinen in diesen Extra-Drehs nicht und es gibt keine zweite Schussrunde.',
			GAME_INFO_BET_MODES_BODY: betModes({
				base: 'Base (1×): Der klassische Cat-Mafia-Lauf — Liniengewinne, Paw-Münzen und Super-Wild-Vorhänge bei jedem Dreh. Erhalte 3+ Bonus-Symbole für Freispiele: wähle ein Ziel für 8, 10 oder 12 Drehs (3 Bonus = Normal Bonus · 4+ = Super Bonus mit sticky Super-Wild-Spalte ab Dreh eins). Gewinne werden als Vielfache deines Basiseinsatzes ausgezahlt. RTP 96,01% · Max. Gewinn 2.500×.',
				boost: 'Bonus Boost (2×): Mehr Druck — spiele mit 2× Einsatz und jage Bonus-Symbole aggressiver. Freispiele lösen häufiger mit denselben Einstiegsregeln wie Base aus. Jeder Gewinn zahlt weiter als Vielfaches deines Basiseinsatzes, nicht der 2×-Drehkosten. RTP 96,01% · Max. Gewinn 2.500×.',
				buyNormal: 'Normal Bonus kaufen (100×): Direkt ins Geschehen. Zahle 100× deinen Basiseinsatz, wähle ein Ziel für 8–12 Freispiele, sammle Kugeln im Revolver und lass die Katze für Extra-Runden schießen — ohne sticky Super Wild am Start. Gewinne werden als Vielfache deines Basiseinsatzes ausgezahlt. RTP 96,01% · Max. Gewinn 25.000×.',
				buySuper: 'Super Bonus kaufen (200×): Der Premium-Raubzug. Gleiche Zielwahl und Kugel-Finale, aber eine Super-Wild-Spalte ist ab dem ersten Dreh bereits offen — sticky Wilds, multiplizierende Spalten und mehr Bonus-Potenzial. Gewinne werden als Vielfache deines Basiseinsatzes ausgezahlt. RTP 96,01% · Max. Gewinn 25.000×.',
				duelCat: 'Duel kaufen — Katze (150×): Wähle deine Seite im Zwei-Board-Duell — je 10 Drehs. Spiele als Katze mit ~50% Chance vorn zu liegen; schlage den Hund und nimm beide Banken. Gewinne werden als Vielfache deines Basiseinsatzes ausgezahlt. RTP 96,01% · Max. Gewinn 25.000×.',
				duelDog: 'Duel kaufen — Hund (150×): Hohe Volatilität, hohes Limit — der Hund gewinnt seltener, liefert aber stärkere Auszahlungen, wenn er oben liegt. Gleiches 10+10-Format; überhole die Katze und nimm beide Banken. Gewinne werden als Vielfache deines Basiseinsatzes ausgezahlt. RTP 96,01% · Max. Gewinn 25.000×.',
			}),
			GAME_INFO_CONTROLS_BODY: controls({
				spin: 'Spin: Drücke Spin, um eine Runde zu starten. Während einer Runde kann dieselbe Taste die Walzen oder Autoplay stoppen. Eine neue Runde kann nicht starten, solange eine andere Runde oder Animation läuft oder das Guthaben nicht ausreicht.',
				space: 'Leertaste: Führt dieselbe Aktion wie Spin aus. Halte Leertaste für schnelles Dauer-Spiel. Wenn Autoplay offen ist, startet Leertaste Autoplay. Leertaste setzt auch Press to Continue fort.',
				minus: 'Einsatz (−): Verringert den Einsatz. Nur im Leerlauf möglich.',
				plus: 'Einsatz (+): Erhöht den Einsatz. Nur im Leerlauf möglich.',
				buyBonus: 'Buy Bonus: Öffne Buy Bonus, um Normal Bonus, Super Bonus oder Duel zu kaufen. Bestätige den Kauf, um das Feature sofort zu starten.',
				boost: 'Bonus Boost: Spiele mit 2× Basiseinsatz und mehr Bonus-Symbolen. Ein-/Ausschalten im Buy-Bonus- oder Autoplay-Panel.',
				autoplay: 'Autoplay: Wähle Rundenanzahl und starte automatisches Spiel. Erneut drücken zum Stoppen.',
				turbo: 'Turbo: Schaltet Geschwindigkeit durch Stufen 1, 2 und 3.',
				info: 'Info: Öffnet diese Spielinformation.',
				menu: 'Menu: Öffnet Einstellungen für Spielgeschwindigkeit, Master-Lautstärke und Musik.',
				balance: 'Balance: Zeigt dein Guthaben.',
				amount: 'Einsatz: Zeigt deinen gewählten Einsatz.',
			}),
		},
		{
			GAME_INFO_ABOUT_BODY_SOCIAL:
				'Cat Mafia ist ein Slot mit 5 Walzen und 4 Reihen sowie 20 Gewinnlinien. Preise werden von links nach rechts auf benachbarten Walzen vergeben, beginnend bei der linken Walze. Für einen Preis auf einer Linie sind mindestens 3 übereinstimmende Symbole erforderlich. Pro Linie wird nur der höchste Preis vergeben. In der Basisrunde können Paw-Münzen oder Super Wild in einem Dreh auslösen — aber nie beides gleichzeitig. Erhalte 3 oder mehr Bonus-Symbole, um Freispiele zu starten und ein Ziel für 8, 10 oder 12 Freispiele zu wählen.',
			GAME_INFO_PAYLINES_TITLE_SOCIAL: 'GEWINNLINIEN (20)',
			GAME_INFO_PAYLINES_NOTE_SOCIAL:
				'Alle 20 Gewinnlinien sind immer aktiv. Preise werden von links nach rechts auf benachbarten Walzen vergeben, beginnend bei der linken Walze. Für eine gültige Linie sind mindestens 3 übereinstimmende Symbole auf benachbarten Walzen erforderlich.',
			GAME_INFO_WILD_BODY_SOCIAL:
				'Das Wild-Symbol ersetzt alle zahlenden Symbole außer Bonus. Wild zahlt 225× Spiel für 5 gleiche.',
			GAME_INFO_DUEL_BONUS_BODY_SOCIAL:
				'Das Duel-Bonus-Symbol erscheint nur beim Spielen von Duel für 150× deines Basisspiels. Drei Duel-Bonus-Symbole landen beim Reveal und starten das Feature — wähle Katze oder Hund, dann drehen zwei Boards je 10 Runden. Schlage die Gesamtsumme der Gegenseite und nimm beide Banken. Im Duel-Modus gibt es keine Freispiele, Paw-Münzen oder Kugeln.',
			GAME_INFO_SUPER_WILD_BODY_SOCIAL:
				'Super Wild ist vom normalen Wild getrennt und kann Multiplikatoren ×2, ×4, ×6, ×8 oder selten ×25, ×50 oder ×75 zeigen. In der Basisrunde expandiert die Spalte nur bei Liniengewinn und multipliziert dann den Spin-Preis. In Freispielen kann es ohne Linie expandieren und sticky auf bis zu zwei Spalten werden; Super Bonus startet mit einer offenen sticky Spalte. Mehrere Super-Wild-Multiplikatoren werden multipliziert.',
			GAME_INFO_PAW_BODY_SOCIAL:
				'Paw-Münzen erscheinen nur in der Basisrunde. Bronze wandelt eine Reihe, Silber zwei, Gold drei in Münzpreise um. Niedrige Symbole zahlen ×1 Spiel, mittlere hohe ×2, Top-Symbole, Wild oder Bonus ×3. Die Paw-Münze selbst zahlt nichts. Paw und Super Wild können nicht im selben Dreh auslösen.',
			GAME_INFO_BULLET_BODY_SOCIAL:
				'Während der Haupt-Freispiele füllen Kugel-Symbole die Revolvertrommel (maximal 6). Wenn die Hauptdrehs enden, schießt die Katze automatisch auf Ziele. Jeder Treffer kann nichts oder +1, +2 oder +3 Extra-Freispiele geben. Kugeln erscheinen in Extra-Drehs nicht und es gibt keine zweite Schussrunde.',
			GAME_INFO_BET_MODES_TITLE_SOCIAL: 'SPIELMODI',
			GAME_INFO_BET_MODES_BODY_SOCIAL: betModes({
				base: 'Base (1×): Der klassische Cat-Mafia-Lauf — Linien, Paw-Münzen und Super-Wild-Vorhänge bei jedem Dreh. Erhalte 3+ Bonus für Freispiele: wähle ein Ziel für 8, 10 oder 12 Drehs (3 Bonus = Normal Bonus · 4+ = Super Bonus mit sticky Super Wild ab Dreh eins). Preise sind Vielfache deines Basisspiels. RTP 96,01% · Max. Preis 2.500×.',
				boost: 'Bonus Boost (2×): Mehr Druck — spiele mit 2× und jage Bonus-Symbole aggressiver. Freispiele lösen häufiger mit denselben Regeln wie Base. Jeder Preis zahlt als Vielfaches deines Basisspiels, nicht der 2×-Summe. RTP 96,01% · Max. Preis 2.500×.',
				buyNormal: 'Normal Bonus spielen (100×): Direkt ins Geschehen. Spiele für 100× dein Basisspiel, wähle ein Ziel für 8–12 Freispiele, sammle Kugeln und lass die Katze für Extra-Runden schießen — ohne sticky Super Wild am Start. Preise sind Vielfache deines Basisspiels. RTP 96,01% · Max. Preis 25.000×.',
				buySuper: 'Super Bonus spielen (200×): Der Premium-Raubzug. Gleiche Zielwahl und Kugel-Finale, aber eine Super-Wild-Spalte ist ab dem ersten Dreh offen. Preise sind Vielfache deines Basisspiels. RTP 96,01% · Max. Preis 25.000×.',
				duelCat: 'Duel spielen — Katze (150×): Wähle deine Seite — je 10 Drehs. Spiele als Katze mit ~50% Chance vorn zu liegen; schlage den Hund und nimm beide Banken. Preise sind Vielfache deines Basisspiels. RTP 96,01% · Max. Preis 25.000×.',
				duelDog: 'Duel spielen — Hund (150×): Hohe Volatilität — der Hund gewinnt seltener, liefert aber stärkere Preise oben. Gleiches 10+10-Format; überhole die Katze und nimm beide Banken. Preise sind Vielfache deines Basisspiels. RTP 96,01% · Max. Preis 25.000×.',
			}),
			GAME_INFO_CONTROLS_TITLE_SOCIAL: 'BENUTZERHANDBUCH',
			GAME_INFO_CONTROLS_BODY_SOCIAL: controls({
				spin: 'Spin: Drücke Spin, um eine Runde zu starten. Während einer Runde kann dieselbe Taste die Walzen oder Autoplay stoppen. Eine neue Runde kann nicht starten, solange eine andere Runde läuft oder das Guthaben nicht ausreicht.',
				space: 'Leertaste: Führt dieselbe Aktion wie Spin aus. Halte Leertaste für schnelles Dauer-Spiel. Wenn Autoplay offen ist, startet Leertaste Autoplay.',
				minus: 'Spielbetrag (−): Verringert den Spielbetrag. Nur im Leerlauf möglich.',
				plus: 'Spielbetrag (+): Erhöht den Spielbetrag. Nur im Leerlauf möglich.',
				buyBonus: 'Play Bonus: Öffne Play Bonus, um Normal Bonus, Super Bonus oder Duel zu spielen. Bestätige, um das Feature sofort zu starten.',
				boost: 'Bonus Boost: Spiele mit 2× Basisspiel und mehr Bonus-Symbolen. Ein-/Ausschalten im Play-Bonus- oder Autoplay-Panel.',
				autoplay: 'Autoplay: Wähle Rundenanzahl und starte automatisches Spiel. Erneut drücken zum Stoppen.',
				turbo: 'Turbo: Schaltet Geschwindigkeit durch Stufen 1, 2 und 3.',
				info: 'Info: Öffnet diese Spielinformation.',
				menu: 'Menu: Öffnet Einstellungen.',
				balance: 'Balance: Zeigt dein Guthaben.',
				amount: 'Spiel: Zeigt deinen gewählten Spielbetrag.',
			}),
		},
		{
			LOADER_CARD_1_TITLE: 'FREISPIELE',
			LOADER_CARD_1_LINE_1: '3+ SCATTER LANDEN, DANN ZIEL WÄHLEN',
			LOADER_CARD_1_LINE_2: 'FÜR 8 / 10 / 12 FREISPIELE',
			LOADER_CARD_1_LINE_3: 'NORMAL ×100 ODER SUPER ×200 KAUFEN',
			LOADER_CARD_1_LINE_4: 'GLEICHE ZIELAUSWAHL-SZENE',
			LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
			LOADER_CARD_2_BODY:
				'PAW VERWANDELT EINE REIHE IN MÜNZEN. SUPER WILD EXPANDIERT EINE SPALTE MIT ×2 / ×4 / ×6 / ×8. NIE BEIDES IN EINEM DREH.',
			LOADER_CARD_3_TITLE: 'KUGELN & REVOLVER',
			LOADER_CARD_3_LINE_1: 'SAMMLE KUGELN IN FREISPIELEN (MAX. 6). NACH DEN HAUPTDREHS',
			LOADER_CARD_3_LINE_2: 'SCHIEßT DIE KATZE AUF ZIELE FÜR +1 / +2 / +3 EXTRA-FS',
		},
	),
};

// Import remaining locale packs from generated module
import { remainingLocalePacks } from './_cat-mafia-locale-data-remaining.mjs';
Object.assign(localePacks, remainingLocalePacks);
