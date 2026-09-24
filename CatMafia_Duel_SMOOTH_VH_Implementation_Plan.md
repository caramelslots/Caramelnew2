# Cat Mafia — план реализации: Duel SMOOTH · VH + математическая интрига

Дата: 2026-09-23 (дополнено: **фаза A — math intrigue**; **симметрия win/lose по сумме победы**)  
Scope: `third_party/math-sdk/games/0_0_cat_mafia` (математика). Web UI показывает **правдивые** book totals (без fake banks).  
Статус: **фаза B+A код готов** (lose-mirror + S1–S4 intrigue в sim; histogram/enforce win+lose; metrics/asserts). Нужен полный M5 → histogram → enforce → resample → accept.

Связанные документы:
- `CatMafia_Duel_Intrigue_And_Wins_Plan.md` — стратегия / целевые каскады
- `CatMafia_Duel_Bonus_TZ.md` — правила режима
- `MATH_COMMANDS.md` — M5 / M6 / resample
- Canvas: `duel-vh-only` (целевые таблицы выплат «как будет»)

---

## Общий порядок

| Фаза | Название | Суть | Когда |
|---|---|---|---|
| **B** | SMOOTH · VH | Форма **финальной суммы победы** — и когда выиграл игрок, и когда выиграл оппонент | **Сначала** |
| **A** | Math intrigue | Форма **гонки банков** по спинам (оба копится) при тех же финалах | **После accept B** |

Инварианты на обе фазы:
- P(win) cat ≈ 50% / dog ≈ 25% — **не менять** (кто победил — отдельные шансы)
- Каскад **величины** победы SMOOTH · VH — **симметричен** для win и lose (см. B.0.1)
- RTP ≈ 0.96, max `×25000` rarity — **не ломать** (на lose игроку по-прежнему `payout = 0`)
- После B: каскад SMOOTH · VH на win **и** на lose-victory — фаза A **не должна** его откатить
- UI не подменяет цифры: интрига только в math book events

---

# ФАЗА B — SMOOTH · VH (форма выплат)

## B.0 Цель

Заменить текущую форму **суммы победы сессии** в `bonus_duel_cat` и `bonus_duel_dog` на **SMOOTH · VH**.

На `duel_win` это по-прежнему `payout` игрока (= `dogTotal + catTotal` по settle).  
На `duel_lose` игроку платим `0`, но **величина победы оппонента** (тот же смысл суммы боя — см. B.0.1) живёт в **том же каскаде весов**.

| Правило | Значение |
|---|---|
| P(`victory < 150×` \| исход с победителем) | **≈ 2%** (и win, и lose) |
| Пик | **`150–180×`** (сразу над buy `150×`) — самый частый размер победы |
| Форма | Монотонный спад: чем больше ×, тем реже |
| RTP | ≈ **0.96** (lose не платит игроку) |
| P(player win) | cat ≈ **50%**, dog ≈ **25%** |
| Max `×25000` | Редкость **не режем** (~1 / 100k buys) |
| E[payout\|player win] | cat ≈ **288×**, dog ≈ **574×** |

---

## B.0.1 Симметрия win / lose (зафиксировано продуктово)

**Проигрыш должен ощущаться как победа другого человека**, не как «пустота и ноль на экране».

Пример: если среди твоих побед ~3% дают ~`$1500`, то среди твоих проигрышей ~3% должны выглядеть как «оппонент сорвал ~`$1500`». Те же веса — **в обе стороны**.

| Исход | Деньги игроку | Что таргетим каскадом SMOOTH · VH |
|---|---|---|
| `duel_win` | `payout` (= pot `dog+cat`) | распределение `payout` среди wins |
| `duel_lose` | `0` | распределение **той же метрики победы** среди loses |

**Метрика победы на lose (рабочее определение):**  
`victoryAmount = dogTotal + catTotal` (тот же pot, что стал бы payout при победе игрока).  
Альтернатива при приёмке/отладке: `max(dogTotal, catTotal)` — только если pot окажется слишком шумным; по умолчанию якорь = **pot**.

**Что это не меняет:**
- hit-rate: кто победил — по-прежнему ~50%/25%;
- RTP: lose = `0` игроку;
- правило settle / нет ничьи.

**Что это меняет в B:**
- histogram / TARGET / enforce смотрят **два** каскада: `% среди wins` и `% среди loses` по `victoryAmount`;
- допуски те же (±2 п.п. тело, ±0.5 на `<150`, монотонность);
- цель: `P(victory ∈ band | lose) ≈ P(payout ∈ band | win)` для каждого бенда SMOOTH · VH.

**Связь с фазой A:** B задаёт *какой величины был бой/победа*; A задаёт *как оба банка копились в конкуренции*, чтобы проигрыш не был «нас разнесли 900 vs 12 с первого спина», а «у нас тоже копилось — чуть не хватило».

---

## B.1 Целевые каскады (% среди wins **и** среди loses)

Таблицы ниже — TARGET для **величины победы**. На win считаем по `payout`; на lose — по `victoryAmount` (B.0.1). Доли **одинаковые** в обоих срезах.

### Cat (E≈288× среди player wins)

| Band (×bet) | TARGET %wins |
|---|---|
| `<150` (сумма) | **2.0** |
| `150–180` ★ | **23.7** |
| `180–220` | **19.3** |
| `220–280` | **15.8** |
| `280–350` | **12.9** |
| `350–450` | **10.5** |
| `450–550` | **8.6** |
| `550–700` | **7.0** |
| `700+` / soft / max | как publish (редко) |

Допуск: ±2 п.п. на бендах тела ≥5%; ±0.5 п.п. на `<150`; монотонность обязательна.

### Dog (E≈574× среди player wins; тот же каскад % среди loses)

| Band (×bet) | TARGET %wins |
|---|---|
| `<150` (сумма) | **2.0** |
| `150–180` ★ | **16.7** |
| `180–220` | **14.3** |
| `220–280` | **12.2** |
| `280–350` | **10.5** |
| `350–450` | **9.0** |
| `450–550` | **7.7** |
| `550–700` | **6.6** |
| `700–1000` | **5.6** |
| `1000–1500` | **4.8** (снять горб ~19%) |
| `1500–2000` | **4.1** |
| `2000–2500` | **3.5** |
| `2500–5000` | **3.0** |
| `5000+` / max | как publish |

---

## B.2 Где править

| Файл | Что |
|---|---|
| `game_optimization.py` | `_bonus_duel_*_scaling`, `distribution_bias` |
| `game_config.py` | квоты/hr — **по умолчанию не трогать** |
| `tools/match_duel_win_body.py` (новый) | post-opt выравнивание LUT по бендам (**win + lose victory**) |
| `tools/duel_payout_histogram.py` (новый) | приёмка vs TARGET (**отдельно win / lose**) |
| `run_m5.py` / `run_bonus_duel.py` / pipeline | подключить enforce |
| Web / settle | **не в scope B** (lose всё ещё `payout = 0`) |

---

## B.3 Архитектура (2 слоя)

```
Sim books (duel_win / duel_lose / wincap)
        ↓
Optimizer (scaling + bias)     ← Слой 1 (сейчас в основном win-payout)
        ↓
Weighted LUT
        ↓
Enforce match body             ← Слой 2: win payout + lose victoryAmount
        ↓
RTP / hit-rate checks
        ↓
resample → publish + storybook
```

**Scaling / bias (направление):** давить `<150`, усиливать пик `(150–180)/(150–220)`, убывающий scale вверх по каскаду; cat bias с `(40–120)` → `(150–220)`; dog bias с `(90–280)` → `(150–220)`, убрать кормёжку горба `~$1k–1.5k`.

**Enforce:**
- внутри `duel_win` — веса по бендам `payout` (как уже спланировано);
- внутри `duel_lose` — веса по бендам `victoryAmount` (= pot), **зеркало** того же TARGET;
- не смешивать win↔lose (hit-rate не сдвигать);
- hit-rate / max / RTP в допуске.

> Практическая заметка: opt сегодня кормит по `payout`, поэтому lose-каскад почти наверняка дотянется **enforce / post-pass на totals** (подогнать pot при сохранении `winner` и `payout=0`). Это всё ещё scope B, не A.

---

## B.4 Шаги работ

0. Histogram + TARGET json + базлайн текущего publish (**win payout + lose pot**)  
1. Opt scaling/bias cat+dog (win-тело)  
2. M5 duel-only → сверка каскада win  
3. Enforce win-body + **lose victoryAmount** при необходимости  
4. Resample + publish  
5. Storybook / sync + smoke (win **и** типичный lose)  
6. **Accept B** → (опц. M6) → старт фазы A  

---

## B.5 Чеклист приёмки B

- [ ] P(`<150`|win) ≈ 2% (cat и dog)
- [ ] Пик `150–180` — максимальная доля тела (**среди wins**)
- [ ] Монотонный спад; cat без горба `350–450`; dog без горба `1000–1500`
- [ ] **Lose-зеркало:** тот же каскад по `victoryAmount` среди `duel_lose` (± тот же допуск)
- [ ] RTP 0.959–0.961; P(win) 50%/25%; E[win|win] ~288 / ~574
- [ ] Max ~1/100k buys; `assert_duel_invariants` OK
- [ ] Storybook: типичный lose с «жирным» pot / close lose — не сухой ноль по ощущению

---

# ФАЗА A — Математическая интрига (гонка банков)

> Старт **только после Accept B**.  
> Согласовано в обсуждении: реальная интрига в book, не UI-подмена; шансы *кто* победил и каскад *величины* победы (win **и** lose) из B **сохраняются**.

## A.0 Цель

Игрок до последних спинов не уверен, кто победит — потому что **реальные** `dogTotal` / `catTotal` **оба копится в конкуренции**, держат бой близким и/или с переломами, а не из‑за фейковых цифр на экране.

Проигрыш в A — продолжение B.0.1: не «нас размазали в ноль», а **глупость / почти**, при том что у нас тоже рос баланс.

Пример (продуктовый паттерн, не буквальный скрипт):

> Долго кот ведёт ~300, собака ~120 → под конец собака лутает крупный спин +500 → исход решается в финале.

Финал книги (`winner`, `payout`, `victoryAmount` / pot) остаётся согласованным с фазой B (включая lose-зеркало).

---

## A.1 Что нельзя менять фазой A

| Параметр | Правило |
|---|---|
| P(player win) | cat ~50% / dog ~25% — без подкрутки |
| Распределение финальных `payout` \| win (SMOOTH · VH) | регресс-чек после A |
| Распределение `victoryAmount` \| lose (зеркало B.0.1) | регресс-чек после A |
| RTP / max rarity | в допуске B |
| UI | показывает book totals as-is (без theatrical display) |
| Ничья | по-прежнему невозможна |

---

## A.2 Продуктовые паттерны гонки (сценарии)

Каждая duel-книга после фиксации исхода получает один из сценариев пути (веса — подобрать на M5; старт-предложение):

| ID | Сценарий | Ощущение | Доля (черновик) |
|---|---|---|---|
| **S1 Close fight** | Gap узкий почти всю сессию; победитель уходит на последних 1–2 спинах | Постоянное «кто же» | ~45% |
| **S2 False lead** | Лузер ведёт mid-game; чемпион отыгрывает в конце | Разворот | ~25% |
| **S3 Late steal** | Чемпион ведёт комфортно mid; лузер почти догоняет / перехватывает в конце (или наоборот — удержание) | Бац на финише (твой пример) | ~20% |
| **S4 Blowout** | Ранний отрыв, исход ясен рано | Редкое исключение | ~10% |

Blowout оставляем редким: иначе интрига снова пропадает.

---

## A.3 Техническая схема (как работает)

**Принцип:** сначала исход и финальные банки, потом режиссура пути.

```
1) Симуляция / settle как сейчас
        ↓
2) Зафиксировать: winner, catTotal, dogTotal, payout  (уже из мира B)
        ↓
3) Выбрать scenario S1–S4
        ↓
4) Построить timeline spin-win на 10+10 спинов:
   - суммы сходятся к catTotal / dogTotal
   - знак победителя в конце = winner
   - mid-session gap / lead-changes по сценарию
        ↓
5) Эмитить duelSpin / duelBankUpdate согласованно с timeline
        ↓
6) duelEnd без изменения payout / winner
```

### Предпочтительный подход: **A-M3 / A-M1 hybrid**

1. **Capture finals** — после накопления (или сразу после settle) взять истинные `winner` + totals + payout.  
2. **Reshape path** — переразложить (или пересэмплить с rescale) per-spin wins так, чтобы:
   - `sum(cat spins) = catTotal`, `sum(dog spins) = dogTotal`;
   - кумулятивы следовали scenario curve;
   - крупные куски победителя (или «стилевого» лузера в S3) чаще лежали на спинах **8–10**.  
3. **Emit** — book events отражают новый путь; `duelEnd` = те же winner/payout.

Альтернатива полегче на старт: **post-pass only (A-M1)** — не трогать доски/символы глубоко, только:

- подтянуть банк лузера ближе (сохранить знак);
- сдвинуть крупные spin-win победителя к концу;
- при необходимости один mid lead-change через перестановку спинов.

Полный «сначала totals, потом генерация бордов под суммы» (чистый A-M3) — если post-pass недостаточно театрален.

### Где в коде (ориентир)

| Место | Роль |
|---|---|
| `gamestate.py` `run_duel` | точка после спинов / перед end — reshape path |
| `game_override.py` `settle_duel_payout` / helpers | зафиксировать finals; не менять payout логику B |
| `game_events.py` | убедиться, что bank updates = timeline |
| `tools/assert_duel_invariants.py` | расширить: path sums == end totals; winner; no tie |
| `tools/` (новый) | метрики интриги: median final gap, P(lead change), P(gap narrow mid) |

Web: **без** display-маппинга; только честный playback book.

---

## A.4 Метрики интриги (приёмка A)

Считать на publish LUT / sample books (cat и dog отдельно):

| Метрика | Цель (черновик) |
|---|---|
| Median `\|cat−dog\| / (cat+dog)` на спине 5 | узко (напр. **≤ 0.25**) |
| Median тот же gap на спине 10 (финал) | любой, лишь бы winner верный |
| P(хотя бы 1 lead-change за сессию) | **≥ ~40%** |
| P(ранний blowout: gap>0.5 уже к спину 4) | **≤ ~15%** |
| Доля S4 Blowout | ~10% (±5) |
| Регресс B | каскад %wins **и** %loses(victory) / P(<150) / RTP / P(win) в допуске B |

Точные числа gap — подкрутить после первого M5 с reshape.

---

## A.5 Шаги работ фазы A

- [ ] После Accept B — снять базлайн метрик интриги на текущих (уже SMOOTH) книгах  
- [ ] Спека scenario weights S1–S4 + curve (gap vs spinIndex)  
- [ ] Реализовать reshape path (post-pass v1)  
- [ ] Расширить `assert_duel_invariants`  
- [ ] M5 duel → метрики интриги + **регресс B**  
- [ ] Storybook: close / false lead / late steal / blowout  
- [ ] Accept A → M6 (+ resample), если ещё не делали финальный M6 после B+A вместе  

**Важно:** если B ещё не в M6, разумный путь — **M5 B → M5 A → один общий M6**.

---

## A.6 Риски фазы A

| Риск | Митигация |
|---|---|
| Reshape ломает согласованность board↔win | v1: переставлять/рескейлить spin-win amounts при валидных событиях; или упрощённый pad+reorder без смены бордов |
| Случайно сменить winner | assert sign(totals) и `duelEnd.winner` |
| Раздуть оба банка → уехать от SMOOTH | finals frozen **до** path reshape; не пересчитывать `payout` / `victoryAmount` заново с «красивых» банков |
| Слишком много late steals → ощущение скрипта | вес S3 ограничить; миксовать S1/S2 |
| Регресс гистограммы B | обязательный histogram check после A |

---

# Сводка пайплайна (B + A)

```
ФАЗА B                                      ФАЗА A
opt scaling/bias                            capture winner + totals + payout
     ↓                                           ↓
enforce win payout bands                    choose S1–S4
+ lose victoryAmount bands                       ↓
     ↓                                      reshape spin timeline
accept victory shape (win ↔ lose)           (оба банка копится)
     ↓                                           ↓
                                  assert path + regress B (win+lose)
                                                 ↓
                                    M6 + resample (финал к Stake)
```

---

## Риски общие / объём

| Работа | Оценка |
|---|---|
| B: histogram + TARGET json | малая |
| B: opt scaling/bias | средняя |
| B: enforce body | средняя–крупная |
| B: M5 циклы | 10–20 мин × итерация |
| A: path reshape + asserts | средняя–крупная |
| A: M5 + регресс B | как M5 |
| Финальный M6 | ~2–4 ч |

---

## Порядок коммитов (когда попросишь)

**B:** tools → opt → enforce/pipeline → publish notes  
**A:** path reshape + asserts → storybook scenarios → publish notes  

Не коммитить без явной просьбы.

---

## План доведения до TARGET (статус после M5+resample 2026-09-24)

### Что уже ок (не ломать)
- RTP ≈ 0.9601, P(win) cat~50% / dog~25%
- E[win|win] ≈ 288 / 576
- **Lose-зеркало** pot ≈ SMOOTH · VH (±1 п.п.)
- Assert path sums / duelEnd — зелёный
- Доли сценариев S1–S4 ≈ 45/25/20/10

### Что не ок
1. **Win-тело** — не SMOOTH: cat горб `220–350`, dog горб `450–550` (~58%); пик `150–180` пустой  
2. **Интрига пути** — ярлыки S1–S4 есть, но mid-gap ~0.9, early blowout ~75–80% (бой не близкий)

---

### Этап 1 — Win-тело (приоритет B)

**Цель:** каскад %wins = TARGET (± допуск плана B.5).

| # | Действие | Где |
|---|---|---|
| 1.1 | Enforce на **weighted** LUT (не publish equal-weight) | `library/publish_files_backup_pre_resample` |
| 1.2 | `match_duel_win_body.py` cat + dog (win bands; lose можно `--skip-lose` — уже ок) | tools |
| 1.3 | Histogram dry-check на backup | `duel_payout_histogram.py --lut-dir …backup…` |
| 1.4 | Если band coverage пустая (некуда двигать вес) — усилить opt scaling/bias и/или досеять books в пик `150–180`, повторить M5 duel-only | `game_optimization.py` |
| 1.5 | `resample_books.py --100k` → новый publish | tools |
| 1.6 | Accept B: histogram wins ≈ TARGET, lose регресс, RTP/P(win) | checklist B.5 |

Команды (из игры):
```bash
$PY tools/match_duel_win_body.py --mode bonus_duel_cat --lut-dir library/publish_files_backup_pre_resample
$PY tools/match_duel_win_body.py --mode bonus_duel_dog --lut-dir library/publish_files_backup_pre_resample
$PY tools/duel_payout_histogram.py --lut-dir library/publish_files_backup_pre_resample
# если ок → copy backup→publish или resample из backup
$PY tools/resample_books.py --100k
$PY tools/duel_payout_histogram.py --lut-dir library/publish_files
```

**Критерий выхода этапа 1:** пик `150–180` максимальный; монотонный спад; cat без горба `220–350`; dog без горба `450–550`; P(&lt;150|win)≈2%.

---

### Этап 2 — Интрига пути (фаза A, после Accept B или параллельно на копии)

**Цель:** mid-gap ≤ ~0.30, early blowout ≤ ~20%, lead-change ≥ ~40% (dog тоже).

| # | Действие | Суть |
|---|---|---|
| 2.1 | Починить `_progress_curves` / mid-lead fixes в `duel_intrigue.py` | S1: держать оба ~lockstep до спинов 8–10; S2: лузер ahead mid **абсолютно**; реже S4 |
| 2.2 | Учитывать **асимметрию финалов** (winner pot >> loser) | Нельзя «близко mid», если loser final крошечный — pad loser mid, крупные куски winner в конец (уже идея S3) |
| 2.3 | Юнит-тест метрик на 200–500 in-proc books | `duel_intrigue_metrics` mid_gap / early_bo |
| 2.4 | M5 duel-only (или post-pass reshape на существующих books, если finals frozen) | не откатить win-тело этапа 1 |
| 2.5 | Регресс B (histogram wins+loses) + Accept A | A.4 + B.5 |

**Критерий выхода этапа 2:** метрики A.4 зелёные; сценарии остаются ~45/25/20/10; payout/pot каскады не уехали.

---

### Этап 3 — Dev / sampler
- `run_storybook.py && sync_to_web_sdk.py` после Accept B (и снова после A)
- В sampler: win mid / peak / lose fat pot / close lose

### Этап 4 — M6 (когда B+A accepted)
- Один общий M6 + resample --1m перед Stake

---

### Порядок работ (рекомендуемый)

```
1) Enforce win-body на backup → histogram → resample     ← сейчас
2) Accept B (wins + lose регресс)
3) Fix intrigue curves → smoke metrics → M5 duel
4) Accept A + storybook
5) M6
```

Lose-зеркало и RTP **не пересобирать с нуля**, только регрессить после каждого шага.

---

## Следующий шаг (прямо сейчас)

1. Прогнать **этап 1** (enforce на `publish_files_backup_pre_resample`).  
2. Если enforce упирается в пустые бенды — чинить opt/seed, не resample вслепую.  
3. Потом этап 2 (кривые интриги).  
4. UI-фейк банков не делаем.
