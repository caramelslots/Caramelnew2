/** Overrides for locales with mixed/wrong translations from initial bulk import. */

const SUPER_WILD_TR =
	'Super Wild, normal Wild\'dan ayrıdır ve ×2, ×4, ×6, ×8 veya nadiren ×25, ×50, ×75 çarpanları gösterebilir. Temel oyunda yalnızca kazanan bir hattın parçası olduğunda sütununu genişletir ve spin kazancını çarpar. Ücretsiz spinlerde hatt kazancı olmadan genişleyebilir ve en fazla iki sütunda sticky olabilir; Super Bonus ilk spinden açık bir sticky sütunla başlar. Aynı spindaki birden fazla Super Wild çarpanı birbiriyle çarpılır.';

const SUPER_WILD_JA =
	'Super Wildは通常Wildとは別で、×2/×4/×6/×8、稀に×25/×50/×75のマルチプライヤーを表示。ベースゲームでは当たりラインに含まれる場合のみ列を展開しスピン配当を乗算。フリースピンではライン当たりなしでも展開し最大2列sticky可能。Super Bonusは最初から1列sticky。同一スピン複数Super Wildは乗算。';

const SUPER_WILD_KO =
	'Super Wild는 일반 Wild와 별개이며 ×2, ×4, ×6, ×8 또는 드물게 ×25, ×50, ×75 배수를 표시합니다. 기본 게임에서는 당첨 라인에 포함될 때만 열을 확장하고 스핀 당첨금을 곱합니다. 프리 스핀에서는 라인 당첨 없이도 확장해 최대 2열 sticky 가능. Super Bonus는 첫 스핀부터 sticky 열 1개. 한 스핀의 여러 Super Wild 배수는 곱해집니다.';

const SUPER_WILD_ZH =
	'Super Wild 与普通 Wild 分开，可显示 ×2、×4、×6、×8，或罕见的 ×25、×50、×75 倍数。基础游戏中仅当它属于赢奖线时才扩展列并乘以旋转赢奖。免费旋转中可无线路赢奖扩展，最多两列 sticky；Super Bonus 从第一转起就有一列 sticky 已开放。同一旋转多个 Super Wild 倍数相乘。';

export const targetPick = {
	ru: {
		TARGET_PICK_TITLE: 'ВЫБЕРИТЕ МИШЕНЬ',
		TARGET_PICK_HINT_PICK: 'Нажмите на мишень — кот сделает выстрел',
		TARGET_PICK_HINT_SHOOT: 'Бах!',
		TARGET_PICK_HINT_WON: 'Вы выиграли {n} фриспинов',
		TARGET_SHOOT_TITLE: 'ФИНАЛЬНЫЙ РАУНД',
		TARGET_SHOOT_HINT_INTRO: 'Кот прицеливается…',
		TARGET_SHOOT_HINT_FIRING: 'Огонь!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} доп. фриспинов',
		TARGET_SHOOT_HINT_NONE: 'Без доп. спинов',
	},
	de: {
		TARGET_PICK_TITLE: 'ZIEL WÄHLEN',
		TARGET_PICK_HINT_PICK: 'Tippe auf ein Ziel — die Katze schießt',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: 'Du hast {n} Freispiele gewonnen',
		TARGET_SHOOT_TITLE: 'FINALE RUNDE',
		TARGET_SHOOT_HINT_INTRO: 'Die Katze zielt…',
		TARGET_SHOOT_HINT_FIRING: 'Feuer!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} Extra-Freispiele',
		TARGET_SHOOT_HINT_NONE: 'Keine Extra-Drehs',
	},
	es: {
		TARGET_PICK_TITLE: 'ELIGE UN OBJETIVO',
		TARGET_PICK_HINT_PICK: 'Toca un objetivo — el gato dispara',
		TARGET_PICK_HINT_SHOOT: '¡Bang!',
		TARGET_PICK_HINT_WON: 'Has ganado {n} giros gratis',
		TARGET_SHOOT_TITLE: 'RONDA FINAL',
		TARGET_SHOOT_HINT_INTRO: 'El gato apunta…',
		TARGET_SHOOT_HINT_FIRING: '¡Disparo!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} giros gratis extra',
		TARGET_SHOOT_HINT_NONE: 'Sin giros extra',
	},
	fr: {
		TARGET_PICK_TITLE: 'CHOISISSEZ UNE CIBLE',
		TARGET_PICK_HINT_PICK: 'Touchez une cible — le chat tire',
		TARGET_PICK_HINT_SHOOT: 'Bang !',
		TARGET_PICK_HINT_WON: 'Vous avez gagné {n} free spins',
		TARGET_SHOOT_TITLE: 'MANCHE FINALE',
		TARGET_SHOOT_HINT_INTRO: 'Le chat vise…',
		TARGET_SHOOT_HINT_FIRING: 'Tir !',
		TARGET_SHOOT_HINT_EXTRA: '+{n} free spins supplémentaires',
		TARGET_SHOOT_HINT_NONE: 'Pas de spins supplémentaires',
	},
	pl: {
		TARGET_PICK_TITLE: 'WYBIERZ CEL',
		TARGET_PICK_HINT_PICK: 'Dotknij celu — kot strzela',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: 'Wygrałeś {n} darmowych spinów',
		TARGET_SHOOT_TITLE: 'RUNDA FINAŁOWA',
		TARGET_SHOOT_HINT_INTRO: 'Kot celuje…',
		TARGET_SHOOT_HINT_FIRING: 'Ogień!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} dodatkowych FS',
		TARGET_SHOOT_HINT_NONE: 'Bez dodatkowych spinów',
	},
	pt: {
		TARGET_PICK_TITLE: 'ESCOLHA UM ALVO',
		TARGET_PICK_HINT_PICK: 'Toque num alvo — o gato dispara',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: 'Ganhou {n} rodadas grátis',
		TARGET_SHOOT_TITLE: 'RONDA FINAL',
		TARGET_SHOOT_HINT_INTRO: 'O gato mira…',
		TARGET_SHOOT_HINT_FIRING: 'Disparo!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} rodadas grátis extra',
		TARGET_SHOOT_HINT_NONE: 'Sem rodadas extra',
	},
	tr: {
		TARGET_PICK_TITLE: 'HEDEF SEÇ',
		TARGET_PICK_HINT_PICK: 'Bir hedefe dokun — kedi ateş eder',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: '{n} ücretsiz spin kazandınız',
		TARGET_SHOOT_TITLE: 'FİNAL TURU',
		TARGET_SHOOT_HINT_INTRO: 'Kedi nişan alıyor…',
		TARGET_SHOOT_HINT_FIRING: 'Ateş!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} ekstra ücretsiz spin',
		TARGET_SHOOT_HINT_NONE: 'Ekstra spin yok',
	},
	vi: {
		TARGET_PICK_TITLE: 'CHỌN MỤC TIÊU',
		TARGET_PICK_HINT_PICK: 'Chạm vào mục tiêu — mèo sẽ bắn',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: 'Bạn thắng {n} vòng quay miễn phí',
		TARGET_SHOOT_TITLE: 'VÒNG CUỐI',
		TARGET_SHOOT_HINT_INTRO: 'Mèo đang ngắm…',
		TARGET_SHOOT_HINT_FIRING: 'Bắn!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} vòng quay miễn phí thêm',
		TARGET_SHOOT_HINT_NONE: 'Không có vòng thêm',
	},
	id: {
		TARGET_PICK_TITLE: 'PILIH TARGET',
		TARGET_PICK_HINT_PICK: 'Ketuk target — kucing menembak',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: 'Anda memenangkan {n} Free Spin',
		TARGET_SHOOT_TITLE: 'RONDE FINAL',
		TARGET_SHOOT_HINT_INTRO: 'Kucing membidik…',
		TARGET_SHOOT_HINT_FIRING: 'Menembak!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} Free Spin ekstra',
		TARGET_SHOOT_HINT_NONE: 'Tidak ada spin ekstra',
	},
	fi: {
		TARGET_PICK_TITLE: 'VALITSE KOHDE',
		TARGET_PICK_HINT_PICK: 'Napauta kohdetta — kissa ampuu',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: 'Voitit {n} ilmaiskierrosta',
		TARGET_SHOOT_TITLE: 'LOPPUKIERROS',
		TARGET_SHOOT_HINT_INTRO: 'Kissa tähtää…',
		TARGET_SHOOT_HINT_FIRING: 'Laukaus!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} extra-ilmaiskierrosta',
		TARGET_SHOOT_HINT_NONE: 'Ei extra-kierroksia',
	},
	ar: {
		TARGET_PICK_TITLE: 'اختر هدفًا',
		TARGET_PICK_HINT_PICK: 'المس هدفًا — القطة تطلق',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: 'فزت بـ {n} لفة مجانية',
		TARGET_SHOOT_TITLE: 'الجولة الأخيرة',
		TARGET_SHOOT_HINT_INTRO: 'القطة تصوّب…',
		TARGET_SHOOT_HINT_FIRING: 'إطلاق!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} لفات مجانية إضافية',
		TARGET_SHOOT_HINT_NONE: 'لا لفات إضافية',
	},
	hi: {
		TARGET_PICK_TITLE: 'लक्ष्य चुनें',
		TARGET_PICK_HINT_PICK: 'लक्ष्य पर टैप करें — बिल्ली गोली चलाएगी',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: 'आपने {n} फ्री स्पिन जीते',
		TARGET_SHOOT_TITLE: 'अंतिम राउंड',
		TARGET_SHOOT_HINT_INTRO: 'बिल्ली निशाना साध रही है…',
		TARGET_SHOOT_HINT_FIRING: 'गोली!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} अतिरिक्त फ्री स्पिन',
		TARGET_SHOOT_HINT_NONE: 'कोई अतिरिक्त स्पिन नहीं',
	},
	ja: {
		TARGET_PICK_TITLE: 'ターゲットを選ぶ',
		TARGET_PICK_HINT_PICK: 'ターゲットをタップ — 猫が射撃',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: '{n}フリースピン獲得',
		TARGET_SHOOT_TITLE: 'ファイナルラウンド',
		TARGET_SHOOT_HINT_INTRO: '猫が狙いを定める…',
		TARGET_SHOOT_HINT_FIRING: '発射！',
		TARGET_SHOOT_HINT_EXTRA: '+{n}追加フリースピン',
		TARGET_SHOOT_HINT_NONE: '追加スピンなし',
	},
	ko: {
		TARGET_PICK_TITLE: '목표 선택',
		TARGET_PICK_HINT_PICK: '목표를 탭하세요 — 고양이가 사격합니다',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: '{n} 프리 스핀 획득',
		TARGET_SHOOT_TITLE: '파이널 라운드',
		TARGET_SHOOT_HINT_INTRO: '고양이가 조준 중…',
		TARGET_SHOOT_HINT_FIRING: '발사!',
		TARGET_SHOOT_HINT_EXTRA: '+{n} 추가 프리 스핀',
		TARGET_SHOOT_HINT_NONE: '추가 스핀 없음',
	},
	zh: {
		TARGET_PICK_TITLE: '选择目标',
		TARGET_PICK_HINT_PICK: '点击目标 — 猫会射击',
		TARGET_PICK_HINT_SHOOT: 'Bang!',
		TARGET_PICK_HINT_WON: '你赢得了 {n} 次免费旋转',
		TARGET_SHOOT_TITLE: '最终回合',
		TARGET_SHOOT_HINT_INTRO: '猫正在瞄准…',
		TARGET_SHOOT_HINT_FIRING: '开火！',
		TARGET_SHOOT_HINT_EXTRA: '+{n} 额外免费旋转',
		TARGET_SHOOT_HINT_NONE: '无额外旋转',
	},
};

export const gameInfoFixes = {
	tr: { GAME_INFO_SUPER_WILD_BODY: SUPER_WILD_TR },
	ja: { GAME_INFO_SUPER_WILD_BODY: SUPER_WILD_JA },
	ko: { GAME_INFO_SUPER_WILD_BODY: SUPER_WILD_KO },
	zh: { GAME_INFO_SUPER_WILD_BODY: SUPER_WILD_ZH },
	vi: {
		GAME_INFO_PAYLINES_TITLE: 'DÒNG THANH TOÁN (20)',
		GAME_INFO_PAYLINES_NOTE:
			'Cả 20 dòng luôn hoạt động. Tiền thắng trả từ trái sang phải trên các guồng liền kề, bắt đầu từ guồng ngoài cùng bên trái. Cần tối thiểu 3 biểu tượng giống nhau trên guồng liền kề để tạo dòng thắng hợp lệ.',
		GAME_INFO_FS_BODY:
			'Thu thập 3+ biểu tượng Bonus trong game cơ bản để kích hoạt vòng quay miễn phí. Chọn một trong sáu mục tiêu để nhận 8, 10 hoặc 12 vòng. 3 Bonus = Normal Bonus; 4+ = Super Bonus với một cột sticky Super Wild từ vòng đầu. Bonus không xuất hiện trong free spin và không retrigger. Sau các vòng chính, đạn trong trống revolver có thể thưởng thêm vòng qua màn bắn mục tiêu.',
		GAME_INFO_DUEL_BONUS_BODY:
			'Biểu tượng Duel Bonus chỉ xuất hiện khi mua Duel với 150× cược cơ bản. Ba Duel Bonus rơi ở reveal mua và bắt đầu tính năng — chọn Mèo hoặc Chó, hai bảng quay 10 vòng mỗi bên. Vượt tổng thắng đối thủ và lấy cả hai ngân hàng. Duel không có free spin, Paw hay đạn.',
		GAME_INFO_SUPER_WILD_BODY:
			'Super Wild tách khỏi Wild thường, có thể hiện hệ số ×2, ×4, ×6, ×8 hoặc hiếm ×25, ×50, ×75. Ở game cơ bản chỉ mở rộng cột khi nằm trong dòng thắng rồi nhân thắng vòng. Trong free spin có thể mở rộng không cần dòng thắng và sticky tối đa hai cột; Super Bonus bắt đầu với một cột sticky mở sẵn. Nhiều hệ số Super Wild trên một vòng được nhân với nhau.',
		GAME_INFO_PAW_TITLE: 'ĐỒNG PAW',
		GAME_INFO_PAW_BODY:
			'Đồng Paw chỉ ở game cơ bản. Đồng chuyển 1 hàng, bạc 2 hàng, vàng 3 hàng thành thưởng xu sau khi tính dòng. Biểu tượng thấp ×1 cược, cao trung ×2, top/Wild/Bonus ×3. Paw không trả thưởng. Paw và Super Wild không cùng kích hoạt một vòng.',
		GAME_INFO_BULLET_TITLE: 'ĐẠN',
		GAME_INFO_BULLET_BODY:
			'Trong free spin chính, Bullet lấp trống revolver (tối đa 6). Hết vòng chính, mèo tự bắn mục tiêu. Mỗi trúng có thể không có gì hoặc +1/+2/+3 vòng thêm. Đạn không xuất hiện ở vòng thêm và không có vòng bắn thứ hai.',
		GAME_INFO_BET_MODES_BODY:
			'Base (1×): Cat Mafia cổ điển — thắng dòng, Paw và rèm Super Wild mỗi vòng. 3+ Bonus vào free spin: chọn mục tiêu 8/10/12 vòng (3 Bonus = Normal · 4+ = Super với cột sticky Super Wild). Thắng trả theo bội số cược cơ bản. RTP 96,01% · Tối đa 2.500×.\nBonus Boost (2×): Chơi 2× và săn Bonus mạnh hơn. Free spin thường xuyên hơn với cùng quy tắc Base. Thắng vẫn theo cược cơ bản, không theo chi phí 2×. RTP 96,01% · Tối đa 2.500×.\nMua Normal Bonus (100×): Vào thẳng hành động — 100× cược, chọn mục tiêu 8–12 FS, thu đạn, mèo bắn thêm vòng — không sticky Super Wild lúc đầu. RTP 96,01% · Tối đa 25.000×.\nMua Super Bonus (200×): Heist cao cấp — cột Super Wild mở từ vòng đầu. RTP 96,01% · Tối đa 25.000×.\nMua Duel — Mèo (150×): Hai bảng, 10 vòng mỗi bên. ~50% cơ hội vượt Chó và lấy cả hai ngân hàng. RTP 96,01% · Tối đa 25.000×.\nMua Duel — Chó (150×): Biến động cao — Chó thắng ít hơn nhưng payout nặng khi dẫn. RTP 96,01% · Tối đa 25.000×.',
		GAME_INFO_CONTROLS_BODY:
			'Spin: Bấm Spin để bắt đầu vòng. Trong vòng, cùng nút có thể dừng guồng hoặc autoplay.\nSpace: Giống Spin. Giữ Space để chơi nhanh liên tục.\nCược (−/+): Giảm/tăng cược khi game rảnh.\nBuy Bonus: Mua Normal, Super hoặc Duel.\nBonus Boost: Bật 2× cược với nhiều Bonus hơn.\nAutoplay/Turbo/Info/Menu/Balance/Cược: như mô tả tiêu chuẩn.',
	},
	id: {
		GAME_INFO_PAYLINES_TITLE: 'GARIS PEMBAYARAN (20)',
		GAME_INFO_PAYLINES_NOTE:
			'Semua 20 garis selalu aktif. Kemenangan dibayar kiri ke kanan pada reel bersebelahan, mulai dari reel paling kiri. Minimal 3 simbol cocok pada reel bersebelahan diperlukan untuk garis menang valid.',
		GAME_INFO_FS_BODY:
			'Dapatkan 3+ simbol Bonus di game dasar untuk memicu free spin. Pilih satu dari enam target untuk 8, 10, atau 12 free spin. 3 Bonus = Normal Bonus; 4+ = Super Bonus dengan satu kolom sticky Super Wild dari spin pertama. Bonus tidak muncul selama free spin dan tidak retrigger. Setelah free spin utama, peluru di drum revolver dapat memberi spin extra lewat ronde tembak target.',
		GAME_INFO_DUEL_BONUS_BODY:
			'Simbol Duel Bonus hanya muncul saat membeli Duel seharga 150× taruhan dasar. Tiga Duel Bonus muncul di reveal pembelian — pilih Kucing atau Anjing, dua papan berputar 10 ronde masing-masing. Kalahkan total menang lawan dan ambil kedua bank. Mode Duel tanpa free spin, Paw, atau peluru.',
		GAME_INFO_SUPER_WILD_BODY:
			'Super Wild terpisah dari Wild biasa dan dapat menampilkan pengali ×2, ×4, ×6, ×8, atau jarang ×25, ×50, ×75. Di game dasar kolom hanya meluas jika bagian dari garis menang, lalu mengalikan kemenangan spin. Di free spin dapat meluas tanpa garis menang dan sticky hingga dua kolom; Super Bonus mulai dengan satu kolom sticky terbuka. Beberapa pengali Super Wild pada satu spin dikalikan bersama.',
		GAME_INFO_PAW_TITLE: 'KOIN PAW',
		GAME_INFO_PAW_BODY:
			'Koin Paw hanya di game dasar. Perunggu ubah 1 baris, perak 2 baris, emas 3 baris jadi hadiah koin setelah hitung garis. Simbol rendah ×1 taruhan, menengah ×2, top/Wild/Bonus ×3. Paw sendiri tidak bayar. Paw dan Super Wild tidak bisa bersamaan pada satu spin.',
		GAME_INFO_BULLET_TITLE: 'PELURU',
		GAME_INFO_BULLET_BODY:
			'Selama free spin utama, simbol Bullet mengisi drum revolver (maks. 6). Setelah spin utama selesai, kucing otomatis menembak target. Setiap kena bisa nol atau +1/+2/+3 free spin extra. Peluru tidak muncul di spin extra dan tidak ada ronde tembak kedua.',
		GAME_INFO_BET_MODES_BODY:
			'Base (1×): Lari Cat Mafia klasik — kemenangan garis, koin Paw, tirai Super Wild tiap spin. 3+ Bonus masuk free spin: pilih target 8/10/12 (3 Bonus = Normal · 4+ = Super dengan kolom sticky Super Wild). Kemenangan kelipatan taruhan dasar. RTP 96,01% · Maks. 2.500×.\nBonus Boost (2×): Main 2× dan buru Bonus lebih agresif. Free spin lebih sering dengan aturan masuk yang sama. Kemenangan tetap kelipatan taruhan dasar. RTP 96,01% · Maks. 2.500×.\nBeli Normal Bonus (100×): Langsung aksi — 100× taruhan, pilih target 8–12 FS, kumpul peluru, kucing tembak extra — tanpa sticky Super Wild awal. RTP 96,01% · Maks. 25.000×.\nBeli Super Bonus (200×): Heist premium — kolom Super Wild terbuka dari spin pertama. RTP 96,01% · Maks. 25.000×.\nBeli Duel — Kucing (150×): Dua papan, 10 spin masing-masing. ~50% peluang unggul Anjing. RTP 96,01% · Maks. 25.000×.\nBeli Duel — Anjing (150×): Volatilitas tinggi. RTP 96,01% · Maks. 25.000×.',
		GAME_INFO_CONTROLS_BODY:
			'Spin: Tekan Spin untuk memulai ronde. Tombol yang sama dapat menghentikan reel atau autoplay.\nSpace: Sama seperti Spin. Tahan untuk main cepat.\nTaruhan (−/+): Ubah taruhan saat idle.\nBuy Bonus: Beli Normal, Super, atau Duel.\nBonus Boost: Main 2× taruhan dengan lebih banyak Bonus.\nAutoplay/Turbo/Info/Menu/Saldo/Taruhan: sesuai panduan standar.',
	},
	fi: {
		GAME_INFO_PAYLINES_TITLE: 'VOITTOLINJAT (20)',
		GAME_INFO_PAYLINES_NOTE:
			'Kaikki 20 linjaa ovat aina aktiivisia. Voitot maksetaan vasemmalta oikealle vierekkäisillä rullilla, alkaen vasemmanpuoleisimmasta rullasta. Kelvolliseen voittolinjaan tarvitaan vähintään 3 samaa symbolia vierekkäisillä rullilla.',
		GAME_INFO_FS_BODY:
			'Saa 3+ Bonus-symbolia peruspelissä käynnistääksesi ilmaiskierrokset. Valitse yksi kuudesta kohteesta saadaksesi 8, 10 tai 12 ilmaiskierrosta. 3 Bonus = Normal Bonus; 4+ = Super Bonus yhdellä sticky Super Wild -sarakkeella ensimmäisestä kierroksesta. Bonus-symbolit eivät ilmesty ilmaiskierrosten aikana eivätkä voi uudelleenkäynnistää ominaisuutta. Pääilmaiskierrosten jälkeen revolverin lataamissa kerätyt luodit voivat antaa lisäkierroksia kohdeammuntakierroksen kautta.',
		GAME_INFO_DUEL_BONUS_BODY:
			'Duel Bonus -symboli ilmestyy vain ostaessasi Duelin 150× peruspanoksella. Kolme Duel Bonus -symbolia laskeutuu ostorevealissa ja käynnistää ominaisuuden — valitse Kissa tai Koira, sitten kaksi pelialuetta pyörii 10 kierrosta kumpikin. Voita vastustajan kokonaisvoitto ja nappaa molemmat pankit. Duel-tilassa ei ole ilmaiskierroksia, Paw-kolikoita tai luoteja.',
		GAME_INFO_SUPER_WILD_BODY:
			'Super Wild on erillinen tavallisesta Wildista ja voi näyttää kertoimia ×2, ×4, ×6, ×8 tai harvoin ×25, ×50, ×75. Peruspelissä se laajentaa sarakkeensa vain voittolinjalla ollessaan ja kertoo sitten kierrosvoiton. Ilmaiskierroksilla se voi laajentua ilman linjavoittoa ja tulla stickyksi jopa kahdelle sarakkeelle; Super Bonus alkaa yhdellä jo avoimella sticky-sarakkeella. Useat Super Wild -kertoimet samalla kierroksella kerrotaan yhteen.',
		GAME_INFO_PAW_TITLE: 'PAW-KOLIKKO',
		GAME_INFO_PAW_BODY:
			'Paw-kolikot ilmestyvät vain peruspelissä. Pronssi muuttaa yhden rivin, hopea kaksi riviä ja kulta kolme riviä kolikkopalkinnoiksi linjavoittojen jälkeen. Matalat symbolit maksavat ×1 panos, keskitason korkeat ×2 ja huippu/Wild/Bonus ×3. Paw itse ei maksa. Paw ja Super Wild eivät voi laueta samalla kierroksella.',
		GAME_INFO_BULLET_TITLE: 'LUODI',
		GAME_INFO_BULLET_BODY:
			'Pääilmaiskierrosten aikana Bullet-symbolit täyttävät revolverin rummun (enintään 6). Pääkierrosten päätyttyä kissa ampuu automaattisesti kohteita. Jokainen osuma voi antaa ei mitään tai +1, +2, +3 extra-ilmaiskierrosta. Luodit eivät ilmesty näillä extrakierroksilla eikä toista ammuntakierrosta ole.',
		GAME_INFO_BET_MODES_BODY:
			'Base (1×): Klassinen Cat Mafia -juoksu — linjavoitot, Paw-kolikot ja Super Wild -verhot joka kierroksella. 3+ Bonus ilmaiskierroksille: valitse kohde 8, 10 tai 12 kierrokselle (3 Bonus = Normal Bonus · 4+ = Super Bonus sticky Super Wild -sarakkeella). Voitot peruspanoksen kertoimina. RTP 96,01% · Maks. voitto 2 500×.\nBonus Boost (2×): Pelaa 2× panoksella ja metsästä Bonus-symbolia aggressiivisemmin. Ilmaiskierrokset laukeavat useammin samoilla säännöillä. Voitot lasketaan peruspanoksesta, ei 2×-kierroksen hinnasta. RTP 96,01% · Maks. voitto 2 500×.\nOsta Normal Bonus (100×): Suoraan toimintaan — 100× panos, kohde 8–12 FS, kerää luoteja, kissa ampuu extra-kierroksia — ei sticky Super Wildia alussa. RTP 96,01% · Maks. voitto 25 000×.\nOsta Super Bonus (200×): Premium-ryöstö — Super Wild -sarake auki ensimmäisestä kierroksesta. RTP 96,01% · Maks. voitto 25 000×.\nOsta Duel — Kissa (150×): Kaksialueinen kaksintaistelu, 10 kierrosta kumpikin. ~50% mahdollisuus voittaa Koira ja nappaa molemmat pankit. RTP 96,01% · Maks. voitto 25 000×.\nOsta Duel — Koira (150×): Korkea volatiliteetti. RTP 96,01% · Maks. voitto 25 000×.',
		GAME_INFO_CONTROLS_BODY:
			'Spin: Paina Spin aloittaaksesi kierroksen. Kierroksen aikana sama painike voi pysäyttää rullat tai autoplayn.\nVälilyönti: Sama toiminto kuin Spin. Pidä pohjassa nopeaa peliä varten.\nPanos (−/+): Muuta panosta vain kun peli on idle-tilassa.\nBuy Bonus: Osta Normal, Super tai Duel.\nBonus Boost: Pelaa 2× peruspanoksella enemmän Bonus-symboleilla.\nAutoplay/Turbo/Info/Menu/Saldo/Panos: vakioiden mukaisesti.',
	},
	ar: {
		GAME_INFO_PAYLINES_TITLE: 'خطوط الدفع (20)',
		GAME_INFO_PAYLINES_NOTE:
			'جميع الخطوط الـ20 نشطة دائمًا. تُدفع الأرباح من اليسار إلى اليمين على البكرات المجاورة، بدءًا من أقصى اليسار. يلزم 3 رموز متطابقة على الأقل على بكرات مجاورة لتكوين خط فائز صالح.',
		GAME_INFO_FS_BODY:
			'احصل على 3+ رموز Bonus في اللعبة الأساسية لتفعيل اللفات المجانية. اختر أحد ستة أهداف للكشف عن 8 أو 10 أو 12 لفة مجانية. 3 Bonus = Normal Bonus؛ 4+ = Super Bonus مع عمود sticky Super Wild من اللفة الأولى. لا تظهر رموز Bonus أثناء اللفات المجانية ولا يمكن إعادة التفعيل. بعد اللفات الرئيسية، قد تمنح الرصاصات في أسطوانة المسدس لفات إضافية عبر جولة إطلاق النار على الأهداف.',
		GAME_INFO_DUEL_BONUS_BODY:
			'يظهر رمز Duel Bonus فقط عند شراء Duel بـ 150× الرهان الأساسي. تسقط ثلاثة رموز Duel Bonus في reveal الشراء وتبدأ الميزة — اختر القطة أو الكلب، ثم تدور لوحتان 10 جولات لكل منهما. تغلب على إجمالي ربح الخصم وخذ كلا البنكين. وضع Duel بلا لفات مجانية أو Paw أو رصاص.',
		GAME_INFO_SUPER_WILD_BODY:
			'Super Wild منفصل عن Wild العادي وقد يظهر مضاعفات ×2 أو ×4 أو ×6 أو ×8 أو نادرًا ×25 أو ×50 أو ×75. في اللعبة الأساسية يوسّع عموده فقط عند كونه جزءًا من خط فائز ثم يضرب ربح اللفة. في اللفات المجانية قد يتوسع بلا خط فائز ويصبح sticky على ما يصل إلى عمودين؛ Super Bonus يبدأ بعمود sticky مفتوح مسبقًا. تُضرب عدة مضاعفات Super Wild في لفة واحدة معًا.',
		GAME_INFO_PAW_TITLE: 'عملة PAW',
		GAME_INFO_PAW_BODY:
			'تظهر عملات Paw في اللعبة الأساسية فقط. البرونز يحوّل صفًا واحدًا، الفضة صفين، والذهب ثلاثة صفوف إلى جوائز عملات بعد احتساب خطوط الربح. الرموز المنخفضة تدفع ×1 الرهان، المتوسطة ×2، والعليا/Wild/Bonus ×3. Paw نفسها لا تدفع. Paw و Super Wild لا يمكن أن يتفعلا في نفس اللفة.',
		GAME_INFO_BULLET_TITLE: 'رصاصة',
		GAME_INFO_BULLET_BODY:
			'أثناء اللفات المجانية الرئيسية، تملأ رموز Bullet أسطوانة المسدس (حد أقصى 6). عند انتهاء اللفات الرئيسية، تطلق القطة تلقائيًا على الأهداف. كل إصابة قد لا تمنح شيئًا أو +1 أو +2 أو +3 لفات مجانية إضافية. لا يظهر الرصاص في تلك اللفات الإضافية ولا توجد جولة إطلاق ثانية.',
		GAME_INFO_BET_MODES_BODY:
			'Base (1×): جولة Cat Mafia الكلاسيكية — أرباح الخطوط وPaw وستائر Super Wild في كل لفة. 3+ Bonus للدخول في لفات مجانية: اختر هدفًا لـ 8 أو 10 أو 12 لفة (3 Bonus = Normal Bonus · 4+ = Super Bonus مع عمود sticky Super Wild). الأرباح مضاعفات الرهان الأساسي. RTP 96.01% · أقصى ربح 2,500×.\nBonus Boost (2×): العب بـ 2× واصطد Bonus بقوة أكبر. RTP 96.01% · أقصى 2,500×.\nشراء Normal Bonus (100×): مباشرة إلى الحركة — 100× الرهان، هدف 8–12 FS، جمع الرصاص، القطة تطلق للجولات الإضافية. RTP 96.01% · أقصى 25,000×.\nشراء Super Bonus (200×): السطو المميز — عمود Super Wild مفتوح من اللفة الأولى. RTP 96.01% · أقصى 25,000×.\nشراء Duel — Cat (150×): مواجهة لوحتين، 10 لفات لكل منهما. ~50% فرصة التفوق على Dog. RTP 96.01% · أقصى 25,000×.\nشراء Duel — Dog (150×): تقلب عالٍ. RTP 96.01% · أقصى 25,000×.',
		GAME_INFO_CONTROLS_BODY:
			'Spin: اضغط Spin لبدء جولة. أثناء الجولة يمكن لنفس الزر إيقاف البكرات أو autoplay.\nالمسافة: نفس إجراء Spin.\nمبلغ الرهان (−/+): غيّر الرهان عند الخمول فقط.\nBuy Bonus: اشترِ Normal أو Super أو Duel.\nBonus Boost: العب بـ 2× الرهان الأساسي مع المزيد من Bonus.\nAutoplay/Turbo/Info/Menu/الرصيد/الرهان: وفق الدليل القياسي.',
	},
	hi: {
		GAME_INFO_PAYLINES_TITLE: 'पेलाइन्स (20)',
		GAME_INFO_PAYLINES_NOTE:
			'सभी 20 लाइनें हमेशा सक्रिय हैं। जीत बाएँ से दाएँ आसन्न रीलों पर, सबसे बाएँ रील से शुरू होकर भुगतान होती है। वैध जीत लाइन के लिए आसन्न रीलों पर कम से कम 3 मेल खाते सिंबल चाहिए।',
		GAME_INFO_FS_BODY:
			'बेस गेम में 3+ Bonus सिंबल लैंड करके फ्री स्पिन ट्रिगर करें। 8, 10 या 12 फ्री स्पिन के लिए छह लक्ष्यों में से एक चुनें। 3 Bonus = Normal Bonus; 4+ = Super Bonus पहले स्पिन से sticky Super Wild कॉलम के साथ। Bonus फ्री स्पिन के दौरान नहीं आते और retrigger नहीं हो सकते। मुख्य फ्री स्पिन के बाद, रेवॉल्वर में इकट्ठा गोलियाँ लक्ष्य शूटिंग राउंड से extra स्पिन दे सकती हैं।',
		GAME_INFO_DUEL_BONUS_BODY:
			'Duel Bonus सिंबल केवल Duel को 150× बेस बेट पर खरीदने पर दिखता है। तीन Duel Bonus खरीद reveal पर गिरते हैं — बिल्ली या कुत्ता चुनें, फिर दो बोर्ड 10-10 राउंड घूमते हैं। प्रतिद्वंद्वी के कुल जीत को पीछे छोड़ें और दोनों बैंक लें। Duel में फ्री स्पिन, Paw या गोली नहीं।',
		GAME_INFO_SUPER_WILD_BODY:
			'Super Wild सामान्य Wild से अलग है और ×2, ×4, ×6, ×8 या कभी-कभी ×25, ×50, ×75 गुणक दिखा सकता है। बेस गेम में यह केवल जीत लाइन का हिस्सा होने पर कॉलम expand करता है और स्पिन जीत गुणा करता है। फ्री स्पिन में बिना लाइन जीत expand हो सकता है और दो कॉलमों तक sticky; Super Bonus पहले स्पिन से एक sticky कॉलम खुले साथ शुरू। एक स्पिन पर कई Super Wild गुणक गुणा होते हैं।',
		GAME_INFO_PAW_TITLE: 'PAW सिक्का',
		GAME_INFO_PAW_BODY:
			'Paw सिक्के केवल बेस गेम में। कांस्य 1 पंक्ति, चांदी 2, सोना 3 पंक्तियाँ लाइन जीत गिनने के बाद सिक्का पुरस्कार में बदलता है। निम्न ×1 बेट, मध्य ×2, शीर्ष/Wild/Bonus ×3। Paw स्वयं भुगतान नहीं। Paw और Super Wild एक स्पिन में साथ नहीं।',
		GAME_INFO_BULLET_TITLE: 'गोली',
		GAME_INFO_BULLET_BODY:
			'मुख्य फ्री स्पिन के दौरान Bullet सिंबल रेवॉल्वर ड्रम भरते हैं (अधिकतम 6)। मुख्य स्पिन समाप्त होने पर बिल्ली स्वचालित रूप से लक्ष्यों पर गोली चलाती है। प्रत्येक हिट कुछ नहीं या +1/+2/+3 extra FS दे सकती है। extra स्पिन पर गोली नहीं और दूसरा शूटिंग राउंड नहीं।',
		GAME_INFO_BET_MODES_BODY:
			'Base (1×): क्लासिक Cat Mafia — हर स्पिन पर लाइन जीत, Paw, Super Wild पर्दे। 3+ Bonus से फ्री स्पिन: 8/10/12 के लिए लक्ष्य (3 Bonus = Normal · 4+ = Super sticky Super Wild)। जीत बेस बेट के गुणक। RTP 96.01% · अधिकतम 2,500×.\nBonus Boost (2×): 2× दांव पर Bonus का शिकार। RTP 96.01% · अधिकतम 2,500×.\nNormal Bonus खरीदें (100×): 100× बेट, 8–12 FS, गोली इकट्ठा, बिल्ली extra राउंड। RTP 96.01% · अधिकतम 25,000×.\nSuper Bonus खरीदें (200×): प्रीमियम — पहले स्पिन से Super Wild कॉलम खुला। RTP 96.01% · अधिकतम 25,000×.\nDuel खरीदें — Cat (150×): दो बोर्ड, 10-10 स्पिन। ~50% Dog से आगे। RTP 96.01% · अधिकतम 25,000×.\nDuel खरीदें — Dog (150×): उच्च volatility। RTP 96.01% · अधिकतम 25,000×.',
		GAME_INFO_CONTROLS_BODY:
			'Spin: राउंड शुरू करने के लिए Spin दबाएँ। चल रहे राउंड में वही बटन रील/autoplay रोक सकता है।\nSpace: Spin जैसा।\nबेट (−/+): idle पर बदलें।\nBuy Bonus: Normal/Super/Duel खरीदें।\nBonus Boost: 2× बेस बेट।\nAutoplay/Turbo/Info/Menu/बैलेंस/बेट: मानक गाइड।',
	},
};

export const loaderCardsFixes = {
	pt: {
		LOADER_CARD_1_TITLE: 'RODADAS GRÁTIS',
		LOADER_CARD_1_LINE_1: 'CONSIGA 3+ SCATTERS E ESCOLHA UM ALVO',
		LOADER_CARD_1_LINE_2: 'PARA 8 / 10 / 12 RODADAS GRÁTIS',
		LOADER_CARD_1_LINE_3: 'COMPRE NORMAL ×100 OU SUPER ×200',
		LOADER_CARD_1_LINE_4: 'MESMA CENA DE ESCOLHA DE ALVO',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAW TRANSFORMA UMA FILA EM MOEDAS. SUPER WILD EXPANDE UMA COLUNA COM ×2 / ×4 / ×6 / ×8. NUNCA AMBOS NO MESMO SPIN.',
		LOADER_CARD_3_TITLE: 'BALAS & REVÓLVER',
		LOADER_CARD_3_LINE_1: 'RECOLHA BALAS NAS RODADAS GRÁTIS (MÁX. 6). APÓS AS RODADAS PRINCIPAIS',
		LOADER_CARD_3_LINE_2: 'O GATO DISPARA AOS ALVOS POR +1 / +2 / +3 FS EXTRA',
	},
	tr: {
		LOADER_CARD_1_TITLE: 'ÜCRETSİZ SPİNLER',
		LOADER_CARD_1_LINE_1: '3+ SCATTER YAKALAYIN, SONRA HEDEF SEÇİN',
		LOADER_CARD_1_LINE_2: '8 / 10 / 12 ÜCRETSİZ SPİN İÇİN',
		LOADER_CARD_1_LINE_3: 'NORMAL ×100 VEYA SUPER ×200 SATIN ALIN',
		LOADER_CARD_1_LINE_4: 'AYNI HEDEF SEÇİM SAHNESİ',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAW BİR SATIRI COİNE ÇEVİRİR. SUPER WILD ×2 / ×4 / ×6 / ×8 İLE SÜTUNU GENİŞLETİR. AYNI SPİNDE İKİSİ BİRDEN ASLA.',
		LOADER_CARD_3_TITLE: 'MERMİLER & REVOLVER',
		LOADER_CARD_3_LINE_1: 'ÜCRETSİZ SPİNLERDE MERMİ TOPLAYIN (MAKS. 6). ANA SPİNLERDEN SONRA',
		LOADER_CARD_3_LINE_2: 'KEDİ +1 / +2 / +3 EKSTRA FS İÇİN HEDEFLERE ATEŞ EDER',
	},
	vi: {
		LOADER_CARD_1_TITLE: 'VÒNG QUAY MIỄN PHÍ',
		LOADER_CARD_1_LINE_1: 'THU 3+ SCATTER, RỒI CHỌN MỤC TIÊU',
		LOADER_CARD_1_LINE_2: 'CHO 8 / 10 / 12 VÒNG MIỄN PHÍ',
		LOADER_CARD_1_LINE_3: 'MUA NORMAL ×100 HOẶC SUPER ×200',
		LOADER_CARD_1_LINE_4: 'CÙNG CẢNH CHỌN MỤC TIÊU',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAW BIẾN MỘT HÀNG THÀNH XU. SUPER WILD MỞ RỘNG CỘT VỚI ×2 / ×4 / ×6 / ×8. KHÔNG BAO GIỜ CẢ HAI TRONG MỘT VÒNG.',
		LOADER_CARD_3_TITLE: 'ĐẠN & REVOLVER',
		LOADER_CARD_3_LINE_1: 'THU ĐẠN TRONG FREE SPIN (TỐI ĐA 6). SAU CÁC VÒNG CHÍNH',
		LOADER_CARD_3_LINE_2: 'MÈO BẮN MỤC TIÊU CHO +1 / +2 / +3 FS THÊM',
	},
	id: {
		LOADER_CARD_1_TITLE: 'PUTARAN GRATIS',
		LOADER_CARD_1_LINE_1: 'DAPATKAN 3+ SCATTER, LALU PILIH TARGET',
		LOADER_CARD_1_LINE_2: 'UNTUK 8 / 10 / 12 PUTARAN GRATIS',
		LOADER_CARD_1_LINE_3: 'BELI NORMAL ×100 ATAU SUPER ×200',
		LOADER_CARD_1_LINE_4: 'ADEGAN PILIH TARGET YANG SAMA',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAW MENGUBAH SATU BARIS MENJADI KOIN. SUPER WILD MEMPERLUAS KOLOM DENGAN ×2 / ×4 / ×6 / ×8. TIDAK PERNAH KEDUANYA DALAM SATU PUTARAN.',
		LOADER_CARD_3_TITLE: 'PELURU & REVOLVER',
		LOADER_CARD_3_LINE_1: 'KUMPULKAN PELURU DI FREE SPIN (MAKS. 6). SETELAH PUTARAN UTAMA',
		LOADER_CARD_3_LINE_2: 'KUCING MENEMBAK TARGET UNTUK +1 / +2 / +3 FS EKSTRA',
	},
	fi: {
		LOADER_CARD_1_TITLE: 'ILMAISKIERROKSET',
		LOADER_CARD_1_LINE_1: 'SAAT 3+ SCATTERIA, VALITSE SITTEN KOHTE',
		LOADER_CARD_1_LINE_2: 'SAADAKSESI 8 / 10 / 12 ILMAISKIERROSTA',
		LOADER_CARD_1_LINE_3: 'OSTA NORMAL ×100 TAI SUPER ×200',
		LOADER_CARD_1_LINE_4: 'SAMA KOHTEENVALINTA',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAW MUUTTAA RIVIN KOLIKOIKSI. SUPER WILD LAJENTAA SARAKKEEN ×2 / ×4 / ×6 / ×8. EI KOSKAAN MOLEMMAT SAMALLA KIERROKSLLA.',
		LOADER_CARD_3_TITLE: 'LUODIT & REVOLVERI',
		LOADER_CARD_3_LINE_1: 'KERÄÄ LUODEJA ILMAISKIERROKSILLA (MAKS. 6). PÄÄKIERROSTEN JÄLKEEN',
		LOADER_CARD_3_LINE_2: 'KISSA AMPUU KOHTEITA +1 / +2 / +3 EXTRA-FS',
	},
	ar: {
		LOADER_CARD_1_TITLE: 'لفات مجانية',
		LOADER_CARD_1_LINE_1: 'احصل على 3+ scatters ثم اختر هدفًا',
		LOADER_CARD_1_LINE_2: 'لـ 8 / 10 / 12 لفة مجانية',
		LOADER_CARD_1_LINE_3: 'اشترِ Normal ×100 أو Super ×200',
		LOADER_CARD_1_LINE_4: 'نفس مشهد اختيار الهدف',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAW يحوّل صفًا إلى عملات. SUPER WILD يوسّع عمودًا بـ ×2 / ×4 / ×6 / ×8. ليس كلاهما في لفة واحدة.',
		LOADER_CARD_3_TITLE: 'رصاص & مسدس',
		LOADER_CARD_3_LINE_1: 'اجمع الرصاص في اللفات المجانية (حد أقصى 6). بعد اللفات الرئيسية',
		LOADER_CARD_3_LINE_2: 'القطة تطلق على الأهداف لـ +1 / +2 / +3 FS إضافية',
	},
	hi: {
		LOADER_CARD_1_TITLE: 'फ्री स्पिन',
		LOADER_CARD_1_LINE_1: '3+ SCATTER लाएँ, फिर लक्ष्य चुनें',
		LOADER_CARD_1_LINE_2: '8 / 10 / 12 फ्री स्पिन के लिए',
		LOADER_CARD_1_LINE_3: 'NORMAL ×100 या SUPER ×200 खरीदें',
		LOADER_CARD_1_LINE_4: 'वही लक्ष्य चयन दृश्य',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAW एक पंक्ति को सिक्कों में बदलता है। SUPER WILD ×2 / ×4 / ×6 / ×8 के साथ कॉलम बढ़ाता है। एक स्पिन में दोनों कभी नहीं।',
		LOADER_CARD_3_TITLE: 'गोली & रेवॉल्वर',
		LOADER_CARD_3_LINE_1: 'फ्री स्पिन में गोली इकट्ठा करें (अधिकतम 6)। मुख्य स्पिन के बाद',
		LOADER_CARD_3_LINE_2: 'बिल्ली +1 / +2 / +3 अतिरिक्त FS के लिए लक्ष्य पर गोली चलाती है',
	},
	ja: {
		LOADER_CARD_1_TITLE: 'フリースピン',
		LOADER_CARD_1_LINE_1: '3+ SCATTERを集め、ターゲットを選択',
		LOADER_CARD_1_LINE_2: '8 / 10 / 12 フリースピン',
		LOADER_CARD_1_LINE_3: 'NORMAL ×100 または SUPER ×200 を購入',
		LOADER_CARD_1_LINE_4: '同じターゲット選択シーン',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAWは1段をコインに変換。SUPER WILDは×2/×4/×6/×8で列を展開。同一スピンで両方は不可。',
		LOADER_CARD_3_TITLE: '弾丸 & リボルバー',
		LOADER_CARD_3_LINE_1: 'FS中に弾丸を集める（最大6）。メインスピン後',
		LOADER_CARD_3_LINE_2: '猫がターゲットを射撃 +1/+2/+3 追加FS',
	},
	ko: {
		LOADER_CARD_1_TITLE: '프리 스핀',
		LOADER_CARD_1_LINE_1: '3+ SCATTER 후 목표 선택',
		LOADER_CARD_1_LINE_2: '8 / 10 / 12 프리 스핀',
		LOADER_CARD_1_LINE_3: 'NORMAL ×100 또는 SUPER ×200 구매',
		LOADER_CARD_1_LINE_4: '동일한 목표 선택 장면',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAW는 한 행을 코인으로 변환. SUPER WILD는 ×2/×4/×6/×8로 열 확장. 한 스핀에 둘 다 불가.',
		LOADER_CARD_3_TITLE: '총알 & 리볼버',
		LOADER_CARD_3_LINE_1: '프리 스핀에서 총알 수집(최대 6). 메인 스핀 후',
		LOADER_CARD_3_LINE_2: '고양이가 목표 사격 +1/+2/+3 추가 FS',
	},
	zh: {
		LOADER_CARD_1_TITLE: '免费旋转',
		LOADER_CARD_1_LINE_1: '收集 3+ SCATTER，然后选择目标',
		LOADER_CARD_1_LINE_2: '获得 8 / 10 / 12 次免费旋转',
		LOADER_CARD_1_LINE_3: '购买 NORMAL ×100 或 SUPER ×200',
		LOADER_CARD_1_LINE_4: '相同的目标选择场景',
		LOADER_CARD_2_TITLE: 'PAW & SUPER WILD',
		LOADER_CARD_2_BODY:
			'PAW 将一行变为金币。SUPER WILD 以 ×2/×4/×6/×8 扩展列。同一旋转不会同时触发。',
		LOADER_CARD_3_TITLE: '子弹 & 左轮',
		LOADER_CARD_3_LINE_1: '在免费旋转中收集子弹（最多 6）。主要旋转结束后',
		LOADER_CARD_3_LINE_2: '猫射击目标获得 +1/+2/+3 额外 FS',
	},
};

export const socialGameInfoFixes = {
	tr: {
		GAME_INFO_SUPER_WILD_BODY_SOCIAL: SUPER_WILD_TR.replace(/kazancını/g, 'ödülünü').replace(/spin kazancını/g, 'spin ödülünü'),
	},
	ja: { GAME_INFO_SUPER_WILD_BODY_SOCIAL: SUPER_WILD_JA.replace(/配当/g, '賞金') },
	ko: {
		GAME_INFO_SUPER_WILD_BODY_SOCIAL: SUPER_WILD_KO.replace(/당첨금/g, '상금'),
		GAME_INFO_PAYLINES_NOTE_SOCIAL:
			'20개 라인은 항상 활성입니다. 상금은 가장 왼쪽 릴부터 인접 릴에서 왼쪽에서 오른쪽으로 부여됩니다. 유효 당첨 라인에는 인접 릴에 최소 3개 일치 심볼이 필요합니다.',
	},
	zh: {
		GAME_INFO_SUPER_WILD_BODY_SOCIAL: SUPER_WILD_ZH.replace(/赢奖/g, '奖励'),
		GAME_INFO_PAYLINES_NOTE_SOCIAL:
			'20 条奖励线始终激活。奖励从最左轴开始在相邻轴上从左到右发放。有效赢奖线需要在相邻轴上至少 3 个相同符号。',
	},
	vi: {
		GAME_INFO_PAYLINES_TITLE_SOCIAL: 'DÒNG THANH TOÁN (20)',
		GAME_INFO_PAYLINES_NOTE_SOCIAL:
			'Cả 20 dòng luôn hoạt động. Thưởng trả từ trái sang phải trên guồng liền kề, bắt đầu từ guồng trái nhất. Cần tối thiểu 3 biểu tượng giống nhau trên guồng liền kề.',
		GAME_INFO_WILD_BODY_SOCIAL: 'Wild thay thế mọi biểu tượng trả thưởng trừ Bonus. Wild trả 225× chơi cho 5 giống nhau.',
		GAME_INFO_DUEL_BONUS_BODY_SOCIAL: gameInfoFixes.vi.GAME_INFO_DUEL_BONUS_BODY.replace(/cược cơ bản/g, 'chơi cơ bản').replace(/thắng/g, 'thưởng'),
		GAME_INFO_SUPER_WILD_BODY_SOCIAL: gameInfoFixes.vi.GAME_INFO_SUPER_WILD_BODY.replace(/thắng/g, 'thưởng').replace(/cược/g, 'chơi'),
		GAME_INFO_PAW_BODY_SOCIAL: gameInfoFixes.vi.GAME_INFO_PAW_BODY.replace(/cược/g, 'chơi'),
		GAME_INFO_BULLET_BODY_SOCIAL: gameInfoFixes.vi.GAME_INFO_BULLET_BODY,
		GAME_INFO_BET_MODES_TITLE_SOCIAL: 'CHẾ ĐỘ CHƠI',
		GAME_INFO_BET_MODES_BODY_SOCIAL: gameInfoFixes.vi.GAME_INFO_BET_MODES_BODY.replace(/Thắng/g, 'Thưởng').replace(/cược/g, 'chơi'),
		GAME_INFO_CONTROLS_TITLE_SOCIAL: 'HƯỚNG DẪN THAO TÁC',
		GAME_INFO_CONTROLS_BODY_SOCIAL: 'Spin: Bấm Spin để bắt đầu vòng.\nPlay amount (−/+): Giảm/tăng mức chơi khi rảnh.\nPlay Bonus: Chơi Normal, Super hoặc Duel.\nBonus Boost: Bật 2× mức chơi cơ bản.\nAutoplay/Turbo/Info/Menu/Balance/Play: theo hướng dẫn chuẩn.',
	},
	id: {
		GAME_INFO_PAYLINES_TITLE_SOCIAL: 'GARIS HADIAH (20)',
		GAME_INFO_PAYLINES_NOTE_SOCIAL: gameInfoFixes.id.GAME_INFO_PAYLINES_NOTE.replace(/Kemenangan/g, 'Hadiah').replace(/menang/g, 'hadiah'),
		GAME_INFO_WILD_BODY_SOCIAL: 'Wild menggantikan semua simbol hadiah kecuali Bonus. Wild membayar 225× play untuk 5 sama.',
		GAME_INFO_DUEL_BONUS_BODY_SOCIAL: gameInfoFixes.id.GAME_INFO_DUEL_BONUS_BODY.replace(/taruhan dasar/g, 'play dasar').replace(/menang/g, 'hadiah'),
		GAME_INFO_SUPER_WILD_BODY_SOCIAL: gameInfoFixes.id.GAME_INFO_SUPER_WILD_BODY.replace(/kemenangan/g, 'hadiah').replace(/menang/g, 'hadiah').replace(/taruhan/g, 'play'),
		GAME_INFO_PAW_BODY_SOCIAL: gameInfoFixes.id.GAME_INFO_PAW_BODY.replace(/taruhan/g, 'play'),
		GAME_INFO_BULLET_BODY_SOCIAL: gameInfoFixes.id.GAME_INFO_BULLET_BODY,
		GAME_INFO_BET_MODES_TITLE_SOCIAL: 'MODE MAIN',
		GAME_INFO_BET_MODES_BODY_SOCIAL: gameInfoFixes.id.GAME_INFO_BET_MODES_BODY.replace(/Kemenangan/g, 'Hadiah').replace(/taruhan/g, 'play'),
		GAME_INFO_CONTROLS_TITLE_SOCIAL: 'PANDUAN PENGGUNA',
		GAME_INFO_CONTROLS_BODY_SOCIAL: 'Spin: Tekan Spin untuk memulai ronde.\nPlay amount (−/+): Ubah jumlah play saat idle.\nPlay Bonus: Main Normal, Super, atau Duel.\nBonus Boost: Main 2× play dasar.\nAutoplay/Turbo/Info/Menu/Balance/Play: sesuai panduan.',
	},
	fi: {
		GAME_INFO_PAYLINES_TITLE_SOCIAL: 'VOITTOLINJAT (20)',
		GAME_INFO_PAYLINES_NOTE_SOCIAL: gameInfoFixes.fi.GAME_INFO_PAYLINES_NOTE,
		GAME_INFO_DUEL_BONUS_BODY_SOCIAL: gameInfoFixes.fi.GAME_INFO_DUEL_BONUS_BODY,
		GAME_INFO_SUPER_WILD_BODY_SOCIAL: gameInfoFixes.fi.GAME_INFO_SUPER_WILD_BODY.replace(/voitto/g, 'palkinto'),
		GAME_INFO_PAW_BODY_SOCIAL: gameInfoFixes.fi.GAME_INFO_PAW_BODY.replace(/panos/g, 'play'),
		GAME_INFO_BULLET_BODY_SOCIAL: gameInfoFixes.fi.GAME_INFO_BULLET_BODY,
		GAME_INFO_BET_MODES_TITLE_SOCIAL: 'PELI TILAT',
		GAME_INFO_BET_MODES_BODY_SOCIAL: gameInfoFixes.fi.GAME_INFO_BET_MODES_BODY.replace(/Voitot/g, 'Palkinnot').replace(/voitto/g, 'palkinto').replace(/panos/g, 'play'),
	},
	ar: {
		GAME_INFO_PAYLINES_TITLE_SOCIAL: 'خطوط الجائزة (20)',
		GAME_INFO_PAYLINES_NOTE_SOCIAL: gameInfoFixes.ar.GAME_INFO_PAYLINES_NOTE.replace(/الأرباح/g, 'الجوائز').replace(/ربح/g, 'جائزة'),
		GAME_INFO_DUEL_BONUS_BODY_SOCIAL: gameInfoFixes.ar.GAME_INFO_DUEL_BONUS_BODY.replace(/الرهان/g, 'اللعب').replace(/ربح/g, 'جائزة'),
		GAME_INFO_SUPER_WILD_BODY_SOCIAL: gameInfoFixes.ar.GAME_INFO_SUPER_WILD_BODY.replace(/ربح/g, 'جائزة'),
		GAME_INFO_PAW_BODY_SOCIAL: gameInfoFixes.ar.GAME_INFO_PAW_BODY.replace(/الرهان/g, 'اللعب'),
		GAME_INFO_BULLET_BODY_SOCIAL: gameInfoFixes.ar.GAME_INFO_BULLET_BODY,
		GAME_INFO_BET_MODES_TITLE_SOCIAL: 'أوضاع اللعب',
		GAME_INFO_BET_MODES_BODY_SOCIAL: gameInfoFixes.ar.GAME_INFO_BET_MODES_BODY.replace(/الأرباح/g, 'الجوائز').replace(/ربح/g, 'جائزة').replace(/الرهان/g, 'اللعب'),
	},
	hi: {
		GAME_INFO_PAYLINES_TITLE_SOCIAL: 'जीत लाइनें (20)',
		GAME_INFO_PAYLINES_NOTE_SOCIAL: gameInfoFixes.hi.GAME_INFO_PAYLINES_NOTE.replace(/जीत/g, 'पुरस्कार'),
		GAME_INFO_DUEL_BONUS_BODY_SOCIAL: gameInfoFixes.hi.GAME_INFO_DUEL_BONUS_BODY.replace(/बेट/g, 'प्ले').replace(/जीत/g, 'पुरस्कार'),
		GAME_INFO_SUPER_WILD_BODY_SOCIAL: gameInfoFixes.hi.GAME_INFO_SUPER_WILD_BODY.replace(/जीत/g, 'पुरस्कार'),
		GAME_INFO_PAW_BODY_SOCIAL: gameInfoFixes.hi.GAME_INFO_PAW_BODY.replace(/बेट/g, 'प्ले'),
		GAME_INFO_BULLET_BODY_SOCIAL: gameInfoFixes.hi.GAME_INFO_BULLET_BODY,
		GAME_INFO_BET_MODES_TITLE_SOCIAL: 'खेल मोड',
		GAME_INFO_BET_MODES_BODY_SOCIAL: gameInfoFixes.hi.GAME_INFO_BET_MODES_BODY.replace(/जीत/g, 'पुरस्कार').replace(/बेट/g, 'प्ले'),
	},
};
