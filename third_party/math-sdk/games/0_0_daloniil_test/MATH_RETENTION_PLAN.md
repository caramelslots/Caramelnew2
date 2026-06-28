# Wok Fury — Math Retention Plan

Живой документ с решениями по перенастройке математики для повышения engagement.
Обсуждение ведётся **поэтапно**. Изменения в код вносятся только после финализации всех этапов.

> Дата начала: 2026-06-05  
> Статус: **Этап 1 — Hit Rate** ✅ обсуждение завершено (код не меняли)  
> **Этап 2 — Near-miss** ✅ обсуждение завершено (код не меняли)

---

## Этап 1. Hit Rate (base + bonus_boost)

### Текущее состояние

| Режим         | Hit rate (line) | Dead spin quota | Basegame quota | FS quota |
| ------------- | --------------- | --------------- | -------------- | -------- |
| `base`        | ~8.85%          | 83%             | 6.9%           | 10%      |
| `bonus_boost` | ~9.17%          | 75%             | 6.9%           | 18%      |

Профиль: **high volatility** — редкие line wins, 55% RTP из FS, optimizer штрафует wins < 5×.

### Цель

| Режим         | Target hit rate | Target RTP |
| ------------- | --------------- | ---------- |
| `base`        | **18–20%**      | **96%**    |
| `bonus_boost` | **18–20%**      | **96%**    |

> Сейчас в `game_config.py` стоит `rtp = 0.9601` (96.01%).  
> **Принято:** оба режима таргетируют **ровно 96.00%** после retune + optimization rerun.

### ✅ Решение #0 — RTP 96% (hard constraint)

**Принято:** total RTP для `base` и `bonus_boost` = **96%**.

- RTP считается **от cost режима** (`base` = ×1, `bonus_boost` = ×2).
- Любые изменения hit / quotas / scaling **не должны** увести total RTP за пределы 96%.
- Финальная калибровка — через optimization rerun + PAR verification.

#### RTP budget — `base` mode (должен суммироваться в 0.96)

| Criteria   | RTP share | Статус                                             |
| ---------- | --------- | -------------------------------------------------- |
| `wincap`   | 1%        | без изменений                                      |
| `0` (dead) | 0%        | без изменений                                      |
| `freegame` | **55%**   | без изменений (FS не трогаем)                      |
| `basegame` | **40%**   | перераспределяем внутри: чаще hits, меньше avg win |
| **Total**  | **96%**   | hard target                                        |

#### RTP budget — `bonus_boost` mode (должен суммироваться в 0.96)

| Criteria   | RTP share | Статус                                             |
| ---------- | --------- | -------------------------------------------------- |
| `wincap`   | 1%        | без изменений                                      |
| `0` (dead) | 0%        | без изменений                                      |
| `freegame` | **65%**   | без изменений (FS не трогаем)                      |
| `basegame` | **30%**   | перераспределяем внутри: чаще hits, меньше avg win |
| **Total**  | **96%**   | hard target                                        |

> ⚠️ `bonus_boost` имеет **другой RTP split** (65/30 vs 55/40), потому что FS quota выше (18% vs 10%).
> Hit rate target одинаковый (18–20%), но base RTP budget меньше — avg win per hit в bonus_boost
> будет **~1.6×** (30% / 19%), а не ~2.1× как в base.

### ✅ Решение #1 — FS не трогаем

**Принято:** повышение hit rate **не должно** урезать Free Spins.

Конкретно **сохраняем без изменений**:

- FS **quota** (`base`: 10%, `bonus_boost`: 18%)
- FS **RTP-доля** (~55% total RTP в base mode)
- FS **HR trigger** (~1 in 200)
- FS **avg win target** (~110× bet)
- FS **механики** (Progress Ladder, Mystery Reels, 10 стартовых спинов)
- FS **optimizer scaling / distribution_bias** (near-wincap tail)

> FS остаётся главным «big moment» игры. Весь бюджет для роста hit берём из base layer.

### ✅ Решение #2 — Стратегия: больше hits, меньше avg win

Чтобы поднять hit с ~9% до ~18–20% **без урезания FS**, нужно:

1. **Снизить dead spin quota** (83% → ~62–65% в base)
2. **Поднять basegame quota** (6.9% → ~18–20%)
3. **Уменьшить средний win на hit** (~4.5× → ~2.0–2.2×), чтобы base RTP-доля (~40%) не раздулась

Формула: `base_RTP = hit_rate × avg_win_per_hit`

|                                 | Сейчас | Цель                 |
| ------------------------------- | ------ | -------------------- |
| Hit rate                        | ~9%    | ~19%                 |
| Base RTP share (`base`)         | ~40%   | ~40% (без изменений) |
| Base RTP share (`bonus_boost`)  | ~30%   | ~30% (без изменений) |
| Avg win per hit (`base`)        | ~4.5×  | **~2.1×**            |
| Avg win per hit (`bonus_boost`) | ~3.3×  | **~1.6×**            |

Игрок выигрывает **в 2× чаще**, но каждый win **меньше** → total RTP **96%** сохраняется, FS не трогаем.

### ✅ Решение #3 — Quota targets

#### `base` mode

| Criteria              | Сейчас | Target                  |
| --------------------- | ------ | ----------------------- |
| `0` (dead)            | 83%    | **63%**                 |
| `basegame` (line win) | 6.9%   | **19%**                 |
| `freegame`            | 10%    | **10%** (без изменений) |
| `wincap`              | 0.1%   | 0.1% (без изменений)    |

#### `bonus_boost` mode

| Criteria              | Сейчас | Target                  |
| --------------------- | ------ | ----------------------- |
| `0` (dead)            | 75%    | **63%**                 |
| `basegame` (line win) | 6.9%   | **19%**                 |
| `freegame`            | 18%    | **18%** (без изменений) |
| `wincap`              | 0.1%   | 0.1% (без изменений)    |

> Combined «что-то произошло» в base ≈ 28% (19% hit + 10% FS − overlap).

### ✅ Решение #4 — Optimizer targets

#### Basegame conditions — `base` mode

| Параметр               | Сейчас | Draft target               |
| ---------------------- | ------ | -------------------------- |
| `hr`                   | 12     | **5.5**                    |
| `rtp` (basegame share) | 0.4001 | **0.40** (→ total RTP 96%) |
| implied avg win        | ~4.8×  | **~2.1×**                  |

#### Basegame conditions — `bonus_boost` mode

| Параметр               | Сейчас | Draft target               |
| ---------------------- | ------ | -------------------------- |
| `hr`                   | 12     | **5.5**                    |
| `rtp` (basegame share) | 0.3001 | **0.30** (→ total RTP 96%) |
| implied avg win        | ~3.6×  | **~1.6×**                  |

#### Basegame scaling

| Win range | Сейчас    | Draft target  | Логика                   |
| --------- | --------- | ------------- | ------------------------ |
| 0.3–2×    | —         | **scale 1.5** | Поощрять micro-wins      |
| 2–5×      | scale 0.3 | **scale 1.2** | Основная масса hits      |
| 5–20×     | scale 1.8 | **scale 0.8** | Резать крупные base hits |
| 20–50×    | —         | **scale 0.5** | Редкий base tail         |

#### Freegame conditions — БЕЗ ИЗМЕНЕНИЙ

```
rtp=0.55, hr=200, avg_win=110×
distribution_bias: (500, 2500) weight 0.6
scaling: as current
```

### ✅ Решение #5 — Q1: определение hit rate

**Принято: Вариант A — только line wins.**

| Метрика          | Определение                          | Target                                                     |
| ---------------- | ------------------------------------ | ---------------------------------------------------------- |
| **Hit rate**     | % спинов с выплатой по линиям в base | **18–20%**                                                 |
| **Feature rate** | % спинов с FS trigger                | **10%** (base) / **18%** (bonus_boost) — отдельная метрика |

FS trigger **не входит** в hit rate. Combined «что-то произошло» ≈ hit + feature − overlap (~28% в base).

### ✅ Решение #6 — Q2: micro-wins paytable (Вариант C — hybrid)

**Принято: Вариант C — hybrid 3-OAK для L3/L4 only.**

#### Paytable changes (draft)

| Symbol | 3-OAK    | 4-OAK  | 5-OAK  | Статус             |
| ------ | -------- | ------ | ------ | ------------------ |
| L1     | —        | 0.5×   | 3.0×   | без изменений      |
| L2     | —        | 0.5×   | 3.0×   | без изменений      |
| L3     | **0.1×** | 0.5×   | 3.0×   | **добавить 3-OAK** |
| L4     | **0.1×** | 0.5×   | 3.0×   | **добавить 3-OAK** |
| H1–H4  | as now   | as now | as now | без изменений      |

> Stake RGS: payout cents кратны 10 → pay **0.1×** (не 0.15×).

#### Win mix target (base mode, ~19% hit)

| Tier   | Источник              | Доля wins | Total win    |
| ------ | --------------------- | --------- | ------------ |
| Micro  | L3/L4 3-OAK           | ~40%      | 0.1–0.5× bet |
| Medium | L1/L2 4-OAK, H4 3-OAK | ~45%      | 0.5–2× bet   |
| Nice   | H2/H3 3-OAK+          | ~15%      | 2–8× bet     |

#### Web-sdk requirement (не math, но обязательно)

Micro-wins (**total win < 1× bet**):

- только count-up ticker, **без** BIG WIN banner / fanfare;
- не акцентировать multi-line 3-OAK L3/L4 как «большую победу».

> Зеркалить paytable в `web-sdk/apps/daloniil_test/src/game/config.ts` при реализации.

### ✅ Решение #7 — Q3: win level thresholds & celebration

**Принято: оставить BIG WIN от 10×, усилить levels 3–5 на клиенте.**

#### Math — без изменений

| Level | Диапазон | Banner         | Статус                    |
| ----- | -------- | -------------- | ------------------------- |
| 1–2   | 0 – 1×   | нет            | без изменений             |
| 3–5   | 1 – 10×  | нет            | **усилить UX на клиенте** |
| 6+    | 10×+     | BIG WIN ladder | **порог 10× сохраняем**   |

`get_win_level()` в `game_config.py` **не меняем**.

#### Web-sdk — усилить medium wins (levels 3–5)

При реализации (`Win.svelte`, `winLevelMap.ts`, SFX):

- **Level 3** (1–3×): count-up + лёгкий win SFX
- **Level 4** (3–6×): count-up + SFX + короткие particles / glow
- **Level 5** (6–10×): count-up + SFX + particles, чуть дольше presentDuration

Micro-wins (levels 1–2, total < 1× bet): **только ticker**, без fanfare (см. Решение #6).

> BIG WIN banner (level 6+, от 10×) остаётся редким «вау» в base и первой ступенью FS ladder.

### ✅ Решение #8 — Q4: reelstrips BR0 / BR1 (Вариант A)

**Принято: BR0 W 37 → 28, +L3/L4; BR1 W без изменений (22), +L3/L4.**

#### BR0 — `generate_reels.py` / `BR0.csv`

| Symbol           | Сейчас (per reel) | Target | Δ   |
| ---------------- | ----------------- | ------ | --- |
| W                | 37                | **28** | −9  |
| L3               | 30                | **34** | +4  |
| L4               | 30                | **35** | +5  |
| L1, L2, H1–H4, B | as now            | as now | —   |

- W share: ~17% → **~13%**
- **B не меняем** → FS trigger rate сохраняется
- Sum per reel = 220 (без изменений)

#### BR1 — `BR1.csv`

| Symbol | Сейчас (per reel) | Target | Δ   |
| ------ | ----------------- | ------ | --- |
| W      | 22                | **22** | —   |
| L3     | 36                | **38** | +2  |
| L4     | 36                | **38** | +2  |
| B      | 6–7               | as now | —   |

> W на BR1 уже ниже (~10%) — дополнительное снижение не нужно.

#### Не трогаем

- **FR0, FR1, FRWCAP** — FS ленты
- **BR2** — special_spins

При реализации: `python3 generate_reels.py` → sim → optimization rerun.

### ✅ Решение #9 — Q5: zerowin reelstrip (Вариант C — hybrid)

**Принято: Этап 1 — без отдельной zerowin-ленты; Этап 2 — BR0_ZW / BR1_ZW.**

#### Этап 1 (hit rate retune)

- `zerowin_condition` **остаётся на BR0 / BR1** (обновлённых после Q4)
- Dead books: sim `check_repeat` до win=0 + optimizer resampling
- **Отдельный `BR0_ZW.csv` не создаём**

> После retune (L3/L4 3-OAK, W↓) sim может делать больше retry для dead books.
> Если sim станет слишком медленным — добавить BR0_ZW как оптимизацию (не blocker).

#### Этап 2 (near-miss) — отложено

- Добавить **`BR0_ZW.csv` / `BR1_ZW.csv`** для controlled near-miss dead spins
- Sub-distribution среди dead quota (visual cluster, scatter tease, line near-miss)
- **Ждёт обсуждения и решений по Этапу 2**

---

## ✅ Этап 1 — Summary (все решения)

| #   | Тема           | Решение                                          |
| --- | -------------- | ------------------------------------------------ |
| 0   | RTP            | **96%** base + bonus_boost                       |
| 1   | FS             | **Не трогаем** (quota, RTP, HR, mechanics)       |
| 2   | Стратегия      | Hit ↑, avg win ↓ (micro-wins)                    |
| 3   | Quotas         | dead **63%**, basegame **19%**, FS unchanged     |
| 4   | Optimizer      | HR **5.5**, inverted scaling, base RTP 40%/30%   |
| Q1  | Hit definition | **Line wins only** (18–20%)                      |
| Q2  | Paytable       | **3-OAK L3/L4 @ 0.1×** (hybrid)                  |
| Q3  | Celebrations   | **BIG WIN от 10×**, усилить levels 3–5 (web-sdk) |
| Q4  | Reelstrips     | **BR0 W 37→28**, +L3/L4; BR1 W=22, +L3/L4        |
| Q5  | Zerowin strip  | **BR0/BR1** (same), BR0_ZW → **Этап 2**          |

### Файлы для изменения (когда начнём реализацию)

**Math-sdk:**

- `game_config.py` — paytable, quotas, rtp=0.96
- `game_optimization.py` — HR, scaling
- `generate_reels.py` + `reels/BR0.csv`, `reels/BR1.csv`

**Web-sdk:**

- `src/game/config.ts` — paytable mirror
- `Win.svelte`, `winLevelMap.ts` — levels 3–5 UX, micro-win ticker

**Pipeline:** `generate_reels.py` → `run.py` → optimization → `sync_to_web_sdk.py`

### ❓ Открытые вопросы (Этап 1)

- [x] **Q1:** Hit = **только line wins** → ✅
- [x] **Q2:** Micro-wins = **Вариант C** → ✅
- [x] **Q3:** BIG WIN **от 10×** + levels 3–5 UX → ✅
- [x] **Q4:** **BR0 W 37→28**, +L3/L4 → ✅
- [x] **Q5:** Zerowin = **BR0/BR1 same**; BR0_ZW → Этап 2 → ✅

### 📋 Следующий этап

**Этап 2 — Near-miss / visual clustering** — обсуждение начато.

→ см. раздел **«Этап 2»** ниже.

---

## Этап 2. Near-miss / visual clustering

> Статус: **in progress** (обсуждение, код не меняем)

### Зачем Этап 2 после Этапа 1

Этап 1 даёт **чаще line wins** (19% hit). Этап 2 добавляет **ощущение action между wins** —
dead spins (63%) не выглядят как «пустота», а как «почти получилось».

**RTP impact: ноль** — near-miss живёт только среди `criteria="0"` (win = 0).
Меняется perceived engagement, не математика.

### Связь с Этапом 1

| Этап 1                     | Этап 2                                  |
| -------------------------- | --------------------------------------- |
| Hit 19% (реальные выплаты) | Near-miss среди 63% dead                |
| BR0/BR1 для wins           | **BR0_ZW / BR1_ZW** для controlled dead |
| Micro-wins L3/L4           | Visual clusters L/H **off-line**        |
| FS 10%/18% без изменений   | 2-scatter tease → drive к FS            |

### Три типа near-miss

#### Тип A — Visual cluster (символы на экране, не на линии)

Много одинаковых символов **видно**, но payline через них **не проходит**.

- **Эмоция:** «богатый экран», интерес
- **Frustration risk:** низкий
- **Реализация:** reelstrip clustering + BR0_ZW

#### Тип B — Line near-miss (4-OAK, miss на 5-м барабане)

4 одинаковых на линии, 5-й не совпал → win = 0 (или ниже порога).

- **Эмоция:** «ещё чуть-чуть!»
- **Frustration risk:** **высокий** на premium symbols
- **Реализация:** sub-quota среди dead books

#### Тип C — Scatter tease (2× Bonus из 3)

2 scatter на доске, для FS нужно 3.

- **Эмоция:** «почти бонус!»
- **Frustration risk:** средний
- **Реализация:** BR0_ZW B-density + **anticipation animation** (web-sdk)
- **Сейчас:** anticipation **отключён** в `game_config.py`

### ✅ Решение #10 — Q2 (partial): тип A — visual cluster

**Принято: включаем тип A (visual cluster) в Этап 2.**

Много одинаковых символов **на экране**, но **не складываются в line win** —
lowest frustration risk, совпадает с исходной идеей пользователя.

**Типы B и C — ещё не решены** (можно добавить позже или пропустить).

#### Как работает тип A (player view)

```
Доска 5×5:              Payline #2 (row 1):
[H1][H1][H1][L2][L4]     .  H1  .  .  .
[L3][H1][H2][H1][L1]  →  .  .  .  .  .
[L2][L4][H1][H3][H2]     (линия идёт по row 1)
...

На экране 5× H1 — выглядит «богато»
На payline только 1× H1 → win = 0
```

#### Math / reelstrip (draft)

- Новые ленты **`BR0_ZW.csv` / `BR1_ZW.csv`** для `criteria="0"` sub-quota «cluster»
- На strip: **блоки одинаковых символов** (H1-H1-H1, L3-L3-L3) на разных rows,
  но **разнесены** так, чтобы 25 paylines не собирали 3+/4+ OAK
- RTP = 0 (dead spin), только visual

#### Near-miss mix (тип A only) — ✅ Q3 принято

| Sub-type              | Доля dead | Доля всех спинов (base, dead=63%) |
| --------------------- | --------- | --------------------------------- |
| Plain dead            | **60%**   | ~38%                              |
| **A: visual cluster** | **40%**   | **~25%**                          |

Combined player feel (base): 19% hit + 10% FS + 25% cluster ≈ **~54%** спинов с «событием на экране».

> Допустимый tuning range: 35–45% cluster — стартовый target **40%**.

### ✅ Решение #12 — Q3: пропорции cluster vs plain

**Принято: 40% dead spins = visual cluster (A), 60% = plain dead.**

Применяется **во всех bet modes** (Q1), внутри `criteria="0"` sub-quota.

### ✅ Решение #13 — Q4: символы в cluster (weighted by rarity)

**Принято: символ cluster выбирается weighted random — чем реже символ на ленте, тем реже он «собирается» на экране.**

#### Логика

Каждый cluster dead book:

1. Выбирается **один dominant symbol** (weighted по rarity)
2. На доске **4–6 копий** этого символа, **off-line** (ни одна payline не даёт 3+ OAK)
3. Остальные cells — filler, не создающий line win

#### Draft weights — cluster symbol picker (BR0_ZW)

Веса **обратно пропорциональны** частоте символа на base-ленте:

| Symbol | Rarity (BR0) | Cluster weight | ~% cluster boards         |
| ------ | ------------ | -------------- | ------------------------- |
| L3, L4 | common       | **6** each     | ~14% each (~28% combined) |
| L1, L2 | common       | **5** each     | ~12% each (~24% combined) |
| H4     | medium       | **4**          | ~9%                       |
| H3     | medium       | **3**          | ~7%                       |
| H2     | uncommon     | **2**          | ~5%                       |
| H1     | rare         | **1**          | ~2%                       |
| W      | very rare    | **1**          | ~2%                       |

> W включён **редко** — визуально сильный, но 5×W на экране может намекать на huge win.
> При реализации: mirror weights per strip (BR1_ZW, BR2_ZW, FR0_ZW — свои веса от ленты).

#### Почему это хорошо

- **L-clusters часто** — «живой экран», low frustration
- **H1-cluster редко** — когда выпадает, feels special
- **Естественно** — редкие символы не «сыпятся» каждый dead spin
- **RTP = 0** — только visual, paytable не затронут

#### Реализация (draft)

- `generate_reels.py`: генератор BR0_ZW books с `cluster_symbol` + board layout validator
- Или sub-quota в sim: `criteria="0_cluster"` с `search_conditions={"cluster": symbol}`

### ✅ Решение #14 — Q5: scatter tease (тип C) — не включаем

**Принято: тип C (2-scatter tease) и anticipation animation — не делаем.**

- Near-miss Этапа 2 = **только тип A** (visual cluster)
- `anticipation_triggers` в `game_config.py` **остаётся отключён**
- FS trigger tease через 2× B — **нет**

### ✅ Решение #15 — Q6: без подсветки cluster на клиенте

**Принято: клиент НЕ подсвечивает off-line clusters.**

- Нет extra highlight / glow / counter («5× H1 on screen!»)
- Нет отдельного SFX для cluster dead spin
- Игрок **сам замечает** плотность символов на доске — organic feel
- Payline overlay **не** загорается (win = 0)

> Согласовано с типом A: low frustration, не «продаём» ложный win.

### ✅ Решение #16 — Q7: visual cluster в FS dead spins

**Принято: cluster (тип A) — и в base dead, и в FS dead spins (win = 0).**

#### FS dead spin = спin в freegame без line win

- Те же правила: **40%** FS-zero spins = cluster, **60%** plain
- Cluster symbol: **weighted by rarity** на FS-ленте (FR0 / FR1)
- Без подсветки на клиенте (Q6)

#### FS near-miss strips

| FS strip   | Modes                                             |
| ---------- | ------------------------------------------------- |
| **FR0_ZW** | base, bonus_boost, special_spins, bonus_normal FS |
| **FR1_ZW** | bonus_super FS                                    |

> FR0_ZW weights пересчитываются от FR0 symbol density; FR1_ZW — от FR1.
> Mystery reels / ladder logic **не меняются** — cluster только на zero-win FS reveals.

### ✅ Этап 2 — Summary (все решения)

| #   | Тема          | Решение                                            |
| --- | ------------- | -------------------------------------------------- |
| Q1  | Scope         | **Все bet modes**                                  |
| Q2  | Тип           | **A only** (visual cluster)                        |
| Q3  | Пропорции     | **40%** cluster / **60%** plain dead               |
| Q4  | Символы       | **Weighted by rarity** (L часто, H1/W редко)       |
| Q5  | Scatter tease | **Не включаем**                                    |
| Q6  | Клиент        | **Без подсветки** — organic                        |
| Q7  | FS            | **Да** — cluster в FS dead spins (FR0_ZW / FR1_ZW) |

#### Strips (при реализации)

| Strip  | Назначение                  |
| ------ | --------------------------- |
| BR0_ZW | base / buy trigger zerowin  |
| BR1_ZW | bonus_boost zerowin         |
| BR2_ZW | special_spins zerowin       |
| FR0_ZW | FS dead spins (default)     |
| FR1_ZW | FS dead spins (bonus_super) |

### ❓ Открытые вопросы (Этап 2)

- [x] **Q1:** Near-miss **во всех bet modes** → ✅
- [x] **Q2:** Тип **A only**; B/C excluded → ✅
- [x] **Q3:** **40%** cluster / **60%** plain → ✅
- [x] **Q4:** Cluster symbol **weighted by rarity** → ✅
- [x] **Q5:** Тип **C / anticipation** — **не включаем** → ✅
- [x] **Q6:** **Без подсветки** — organic → ✅
- [x] **Q7:** Cluster в **FS dead spins** — **да** (FR0_ZW / FR1_ZW) → ✅

<details>
<summary>Старый draft с B и C (не принят)</summary>

| Sub-type   | Доля dead |
| ---------- | --------- | ------ | ----- |
| Plain ~55% | A ~25%    | C ~12% | B ~8% |

</details>

### ✅ Решение #11 — Q1: scope near-miss

**Принято: near-miss (тип A) — во всех bet modes.**

| Mode            | Base zerowin strip | FS zerowin strip |
| --------------- | ------------------ | ---------------- |
| `base`          | BR0_ZW             | FR0_ZW           |
| `bonus_boost`   | BR1_ZW             | FR0_ZW           |
| `special_spins` | BR2_ZW             | FR0_ZW           |
| `bonus_normal`  | BR0_ZW             | FR0_ZW           |
| `bonus_super`   | BR0_ZW             | FR1_ZW           |

> Buy/special modes в основном FS — near-miss на **base trigger spin** и на **dead FS spins**
> (если Q7 = да). RTP по-прежнему не меняется.

---

## Журнал решений

| Дата       | Решение                                                  | Статус     |
| ---------- | -------------------------------------------------------- | ---------- |
| 2026-06-05 | RTP `base` + `bonus_boost` = **96%** (hard constraint)   | ✅ Принято |
| 2026-06-05 | FS не трогаем (quota, RTP, HR, avg win, mechanics)       | ✅ Принято |
| 2026-06-05 | Hit ↑ за счёт micro-wins, не за счёт FS budget           | ✅ Принято |
| 2026-06-05 | Q1: Hit = **только line wins** (Вариант A)               | ✅ Принято |
| 2026-06-05 | Q2: Micro-wins = **Вариант C** (3-OAK L3/L4 @ 0.1×)      | ✅ Принято |
| 2026-06-05 | Q3: BIG WIN **от 10×** + усилить levels 3–5 (web-sdk)    | ✅ Принято |
| 2026-06-05 | Q4: **BR0 W 37→28**, BR1 W=22, +L3/L4 на обеих лентах    | ✅ Принято |
| 2026-06-05 | Q5: Zerowin = BR0/BR1 (same); BR0_ZW → Этап 2            | ✅ Принято |
| 2026-06-05 | Quotas: dead 63%, basegame 19%, FS unchanged             | ✅ Принято |
| 2026-06-05 | **Этап 1 обсуждение завершено** — код не меняли          | ✅ Done    |
| 2026-06-05 | Этап 2 Q1: near-miss **во всех bet modes**               | ✅ Принято |
| 2026-06-05 | Этап 2 Q3: **40%** dead = cluster, **60%** plain         | ✅ Принято |
| 2026-06-05 | Этап 2 Q4: cluster symbol **weighted by rarity**         | ✅ Принято |
| 2026-06-05 | Этап 2 Q5: тип **C / anticipation** — **не включаем**    | ✅ Принято |
| 2026-06-05 | Этап 2 Q6: cluster **без подсветки** на клиенте          | ✅ Принято |
| 2026-06-05 | Этап 2 Q7: cluster в **FS dead spins** (FR0_ZW / FR1_ZW) | ✅ Принято |
| 2026-06-05 | **Этап 2 обсуждение завершено** — код не меняли          | ✅ Done    |
| 2026-06-05 | Этап 2 Q2: **тип A only** (B/C excluded)                 | ✅ Принято |
