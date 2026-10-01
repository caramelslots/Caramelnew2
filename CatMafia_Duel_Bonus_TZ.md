# Cat Mafia — Duel Bonus: полное ТЗ

Дата: 2026-08-18  
Scope: `third_party/web-sdk/apps/cat_mafia` (фронт) + `third_party/math-sdk/games/0_0_cat_mafia` (математика).  
Статус: **согласовано с заказчиком; старт с UI-прототипа на моках**, затем math-sdk.

Связанные документы: `NewGame.md`, `CatMafia_Modes.md`, `CatMafia_Prototype_Plan.md`.

---

## 0. Кратко

**Duel** — отдельный покупаемый бонусный режим (не Normal / Super FS).

Игрок покупает Duel → на экране появляются **две доски**:
- **собака** (слева на desktop / сверху на mobile);
- **кот** (справа на desktop / снизу на mobile).

Каждая сторона делает **10 спинов**. Спины идут **по очереди**: спин кота → спин собаки → …  
Режим **полностью автоматический**. В конце сравниваются суммы в деньгах:

| Исход | Выплата игроку |
|---|---|
| Кот набрал **больше** собаки | `dogBank + catBank` (оба банка) |
| Собака набрала **больше** кота | `0` |
| Ничья | **Невозможна** (гарантия math) |

---

## 1. Зафиксированные решения (закрытые вопросы)

| # | Вопрос | Решение |
|---|---|---|
| 1 | Цена | **50 × bet** |
| 2 | Вход | **Только Buy Bonus** (natural trigger нет) |
| 3 | Bonus Boost | При покупке Duel **отключается**, как при покупке любой другой бонуски |
| 4 | Ничья | **Невозможна** |
| 5 | Победа кота | Игрок получает **оба банка** (`dog + cat`) |
| 6 | Единица totals | **Деньги** (currency), не «голые» множители |
| 7 | Порядок спинов | По очереди: **1 кот → после завершения 1 собака → …** (10 пар) |
| 8 | Управление в режиме | **Авто**: нет Spin / + / − / Buy Bonus / Auto и т.п. Остаются элементы HUD: **музыка, инфо, турбо** (+ отображение balance/bet как информативные) |
| 9–10 | Wild / SW | Как в **base**: Super Wild **шторой**, гейт «участвовал в выигрышной линии» |
| 11 | Патроны / барабан / мишени / target pick | **Нет** — отдельный режим, без FS-цепочки |
| 12 | Big Win | Только если игрок **итогово победил собаку** и получает деньги |
| 13 | Арт собаки | Placeholder сейчас; финальный арт позже |
| 14 | Win UI | У каждой доски своё место под win; после выигрыша стороны банк **перетекает** в её накопитель |
| 15 | Mobile маскоты | Только **аватар-шарики**, без полноростовых |
| 16 | Счётчик спинов | В **левых верхних углах** каждой доски (`n/10`) |
| 17 | RTP | **~96%** |
| 18 | Max win | **×25 000** от ставки |
| 19 | Win-rate сессии | **~50%** (кот побеждает ≈ в половине покупок) |
| 20 | Название в UI | **Duel** |
| 21 | Порядок внедрения | Сначала **UI-прототип** (моки / DevButtons), потом math-sdk |

---

## 2. Продуктовое описание режима

### 2.1 Смысл для игрока

Покупка рискованной дуэли: две стороны крутят «за игрока» и «против».  
Если побеждает **кот** (маскот игрока) — оба банка выплачиваются.  
Если побеждает **собака** — игрок уходит с нулём по итогам бонуса (стоимость покупки уже списана).

### 2.2 Состав сессии

1. Игрок открывает Buy Bonus → выбирает карточку **Duel** (цена `50 × bet`).
2. Confirm → списывается стоимость → Bonus Boost (если был) сбрасывается.
3. Intro Duel (короткий).
4. Layout переключается на dual-board.
5. Автоматически проигрываются **20 спинов досок** = 10 пар `(cat, dog)`.
6. Compare totals → Win (оба банка) или Lose (0).
7. При Win — при необходимости Big Win / outro count-up.
8. Возврат в base game.

### 2.3 Что запрещено в Duel

На обеих досках **никогда** не выпадают:

- scatter / bonus letter **`B`** (нет триггера обычной бонуски);
- paw **`P` / `PB` / `PS` / `PG`** (нет `pawCoinResolve`);
- bullet **`BT`** и вся FS-механика (target pick, drum, shoot, sticky FS-профиль Normal/Super).

### 2.4 Что разрешено

- Обычные символы + line pays (как base, доска 5×4, те же paylines).
- Обычный Wild **`W`** (если он предусмотрен текущей base-логикой лент).
- Super Wild **`SW`** по **base-правилам**: штора колонки + множитель **только если SW в выигрышной линии**; без sticky между спинами Duel.
- XOR-правила base (лапа vs SW) на практике не нужны: лапы в режиме нет.

---

## 3. UI / UX

### 3.1 Buy Bonus меню

В `BuyBonusOverlay` добавляется третья карточка:

| Карточка | Mode key | Cost |
|---|---|---|
| Normal Bonus | `bonus_normal` | 100× |
| Super Bonus | `bonus_super` | 200× |
| **Duel** | `bonus_duel` | **50×** |

Поведение:

- При выборе Duel → confirm modal (как у Normal/Super).
- На confirm: `clearActiveFeature()` (Boost off), `selectedBetModeKey = 'bonus_duel'`.
- Короткое описание на карточке: кот vs собака, 10+10, победа кота = оба банка.

### 3.2 Desktop layout

Как на концепт-скрине:

```
[ dog mascot placeholder ]   [ DOG BOARD ] [ CAT BOARD ]   [ cat mascot ]
                                      ↑ win meters / flow
                                 HUD: info · music · turbo · balance/bet
```

- Две доски **бок о бок**.
- Слева — полноростовый placeholder собаки.
- Справа — существующий маскот-кот.
- На каждой доске:
  - **левый верх** — счётчик спинов стороны (`1/10` … `10/10`);
  - зона win / bank стороны (существующий слот win у доски).

### 3.3 Mobile / Portrait layout

```
        [ DOG BOARD ]  · avatar dog (top-right bubble)
             win / bank dog
        [ CAT BOARD ]  · avatar cat (bottom-left bubble)
             win / bank cat
        HUD: info · music · turbo · balance/bet
```

- Доски **друг под другом**: сверху собака, снизу кот.
- Полноростовые маскоты **не показываются**.
- Аватарки:
  - собака — **правый верх** верхней доски;
  - кот — **левый низ** нижней доски.
- Счётчики спинов — в **левых верхних** углах обеих досок.

### 3.4 HUD в режиме Duel (locked controls)

**Скрыть / отключить:**

- Spin
- Bet + / −
- Buy Bonus
- Autoplay
- любые другие bet-changing controls

**Оставить:**

- Info (`i`)
- Music / sound
- Turbo / fast mode
- Информативные Balance / Bet (без изменения ставки)
- Меню / game info по необходимости (как в FS, если уже так принято)

Спины стартуют и продолжаются **автоматически** после входа в режим (turbo влияет на скорость, как в обычной игре).

### 3.5 Win meters и «перетекание» банка

У каждой доски свой визуальный win/bank:

1. Сторона выигрывает на спине → сумма показывается на её доске.
2. Затем анимация **перетока** в накопительный банк этой стороны (dogBank / catBank).
3. Накопители видны игроку на протяжении всей дуэли.
4. В конце — compare двух банков.

Детали анимации (частицы / полоса / fly-to-meter) — на этапе UI-прототипа; важно сохранить ощущение «два отдельных счёта».

### 3.6 Intro / Outro

**Intro (прототип):**

- Заголовок **Duel**.
- Кратко: Cat vs Dog · 10 spins each · Cat wins → both banks.

**Outro:**

- Показать `dogTotal` vs `catTotal`.
- Ветка **Cat wins** → payout = сумма → count-up / Big Win (если уровень позволяет) → collect.
- Ветка **Dog wins** → payout `0` → проигрышный outro без Big Win.
- Возврат в base layout (одна доска, полный HUD).

### 3.7 Big Win

- Big Win / win-level презентация **только на финальной выплате**, когда `catTotal > dogTotal` и `payout > 0`.
- Промежуточные спиновые выигрыши сторон **не** триггерят Big Win игроку.
- Пороги win-level — переиспользовать существующую карту (`winLevelMap`), но применять к **финальному payout** сессии Duel.

### 3.8 Placeholder собаки

Временный ассет (силуэт / простой спрайт / грубый рисунок).  
Якоря layout (desktop full-body + mobile avatar bubble) стабильны, чтобы потом заменить арт без перестройки UI.

---

## 4. Порядок спинов (клиент + math)

Фиксированный порядок одной сессии:

```
pair 1:  cat spin #1  →  dog spin #1
pair 2:  cat spin #2  →  dog spin #2
…
pair 10: cat spin #10 →  dog spin #10
compare → payout
```

Всего **20** board-spins.  
Между спинами — паузы под анимации win/flow; turbo сокращает тайминги.

Счётчики:

- на доске кота: `catSpinIndex / 10`;
- на доске собаки: `dogSpinIndex / 10`;
- обновляются после завершения соответствующего спина.

---

## 5. Математика / RGS

> Этап после UI-прототипа. Ниже — целевое ТЗ для math-sdk.

### 5.1 Bet mode

```text
name:            bonus_duel
cost:            50.0
rtp:             0.96
max_win:         25_000.0   # × bet
is_buybonus:     True
natural trigger: нет
```

Новые артефакты (по аналогии с существующими):

- симуляция / books: `books_bonus_duel.*`
- sync в web-sdk: `books_bonus_duel.ts` (или эквивалент)
- storybook fixtures / DevButtons: `MODE_BONUS_DUEL`

### 5.2 Модель одной книги Duel

Книга описывает всю купленную сессию:

1. `duelStart`
2. Последовательность 20 спинов в порядке §4, каждый с board + wins + (опц.) SW expand
3. Накопление `dogTotal`, `catTotal` в **деньгах** (относительно bet единицы симуляции)
4. Гарантия `dogTotal != catTotal`
5. `duelEnd` с `winner`, `payout`

**Payout rule:**

```text
if catTotal > dogTotal:
    payout = dogTotal + catTotal
else:  # dogTotal > catTotal
    payout = 0
```

### 5.3 Инварианты лент / фич

Для всех спинов Duel:

| Символ / фича | Статус |
|---|---|
| `B` (scatter) | запрещён |
| Paw / `pawCoinResolve` | запрещён |
| `BT` / bullets / shoot / target pick | запрещён |
| Sticky SW между спинами | нет |
| SW curtain | да, **base-правила** |
| Line pays | да |

Отдельные reel strips или фильтрация base-strips — решение реализации; важно enforcement в `draw_board` / acceptance tools.

### 5.4 Ничья невозможна

Math **обязан** исключить `dogTotal == catTotal`.

Допустимые подходы (выбрать при реализации, зафиксировать в коде одним):

1. Rejection sampling книги при равенстве totals.
2. Детерминированный tie-break: минимальная корректировка последнего спина проигравшей/выигравшей стороны (предпочтительно без заметного RTP-дрейфа).
3. Форс-условие на этапе оптимизации/кластеризации.

Acceptance: `0` книг с `dogTotal == catTotal`.

### 5.5 Целевые метрики

| Метрика | Цель |
|---|---|
| RTP (норм. на cost 50) | **≈ 0.9601** (± допуск как у других buy-режимов) |
| Session win-rate (кот победил, payout > 0) | **≈ 50%** |
| Max win | **×25 000** |
| Hit-rate отдельных спинов | настраивается; не обязан совпадать с base |

Следствие для математики при ~50% win-rate и payout = сумма обоих банков: средний выигрыш в победных сессиях должен быть откалиброван так, чтобы  
`0.5 × E[dog+cat | cat wins] / 50 ≈ 0.96`  
(точные веса — этап оптимизации).

### 5.6 Черновик book events

```ts
// Старт
{ type: 'duelStart', totalSpinsPerSide: 10 }

// Один спин стороны (повторяется 20 раз в порядке cat→dog)
{
  type: 'duelSpin',
  side: 'cat' | 'dog',
  index: 1..10,          // номер спина стороны
  board: ...,            // 5×4 (+ padding как принято)
  wins?: ...,
  // далее существующие совместимые события спина:
  // winInfo, superWildExpand, ...
}

// Обновление банков (можно вшивать в duelSpin)
{
  type: 'duelBankUpdate',
  side: 'cat' | 'dog',
  spinWin: number,       // деньги этого спина
  sideTotal: number,     // накопитель стороны
  dogTotal: number,
  catTotal: number
}

// Финал
{
  type: 'duelEnd',
  dogTotal: number,
  catTotal: number,
  winner: 'cat' | 'dog',
  payout: number,        // dog+cat или 0
  winLevel?: number      // только если payout > 0
}
```

Клиент мапит эти события в dual-board state + анимации.  
Точные имена полей можно слегка унифицировать со стилем текущих `freeSpin*` events при реализации.

---

## 6. Клиентская архитектура (план)

### 6.1 State

Расширить `stateGame` (или отдельный `stateDuel`):

- `duelActive: boolean`
- `dogBoard` / `catBoard` (или dual board refs)
- `dogTotal`, `catTotal`
- `dogSpinIndex`, `catSpinIndex`
- `duelWinner`, `duelPayout`

Layout flags: desktop dual side-by-side / portrait stacked.

### 6.2 Рендер досок

Сейчас одна доска. Для Duel:

- либо два инстанса существующего board-компонента;
- либо dual-mode в layout с двумя viewport’ами.

Прототип: переиспользовать текущую доску (символы, spin, win spotlight), смонтировать ×2.

### 6.3 Event handlers

Новые handlers в `bookEventHandlerMap`:

- `duelStart` → layout switch, intro, hide controls
- `duelSpin` → крутить нужную доску, wins, bank flow
- `duelBankUpdate` → обновить meters / переток
- `duelEnd` → compare, payout/Big Win или lose outro, restore base

### 6.4 Buy / balance

- `BUY_DUEL_COST_MULT = 50`
- `buyDuelCostMultiplier()`, `canAffordBuyBonusForModeKey('bonus_duel')`
- config `betModes.bonus_duel.buyBonus: true`, `costMultiplier: 50`

### 6.5 i18n

Ключи минимум:

- название карточки `Duel`
- описание режима
- intro / outro win / outro lose

EN + существующие локали по принятому в проекте процессу (прототип может начать с EN/RU).

---

## 7. Этапы внедрения

### Этап A — UI-прототип — **готово**

Реализовано в `apps/cat_mafia`:
- dual-board HTML overlay (desktop side-by-side / portrait stacked + VS / race header);
- placeholder собаки + avatar bubbles;
- счётчики `n/10`, bank meters + переток после выигрыша спина;
- intro / outro (compare totals);
- Big Win при победе кота (если winLevel big);
- locked HUD (spin/bet/buy/auto скрыты; info/music/turbo остаются);
- карточка **Duel ×50** в Buy Bonus + confirm → мок-сессия;
- DevButtons: `Duel Cat Wins` / `Duel Dog Wins`;
- scramble символов во время спина; turbo ускоряет тайминги.

**Не входит в A:** финальный RTP, publish LUT, настоящие dual Pixi boards / math-sdk.

### Этап B — Math-sdk — **в работе**

1. BetMode `bonus_duel` cost 50, max 25000 — **есть**
2. Симуляция dual spins, запрет B/Paw/BT — **есть** (`run_duel`, `enforce_duel_symbol_rules`)
3. SW base-rules — **есть**
4. Tie impossibility — **есть** (reject + payout rule)
5. Калибровка RTP ~96%, win-rate ~50% — **после M5 + opt** (`run_bonus_duel.py`)
6. Books → sync → storybook → acceptance — **частично** (`assert_duel_invariants.py`, sync mapping)

Команды:
```bash
cd third_party/math-sdk/games/0_0_cat_mafia
export PYTHONPATH=../..:. PATH="$HOME/.cargo/bin:$PATH"
# smoke
NUM_SIMS=200 RUN_OPT=0 /tmp/csmath_venv/bin/python run_bonus_duel.py
/tmp/csmath_venv/bin/python tools/assert_duel_invariants.py
# M5 + opt
/tmp/csmath_venv/bin/python run_bonus_duel.py
```

### Этап C — Сшивка — **в работе**

1. Клиент на реальных books (amounts в **cents**) — **есть** (handlers + DEV + storybook `MODE_BONUS_DUEL`)
2. Buy Duel → RGS `bet` (как Normal/Super) — **есть**; локально: DEV Duel buttons
3. QA инвариантов и layout — UI polish отдельно
4. Подмена арта собаки (когда будет)
5. Полировка таймингов / перетока / outro

---

## 8. Acceptance criteria

### Продукт / UX

- [ ] В Buy Bonus есть **Duel** за **50×**.
- [ ] Покупка Duel сбрасывает Bonus Boost.
- [ ] Duel недоступен натуральным триггером.
- [ ] Desktop: две доски рядом; собака слева, кот справа.
- [ ] Portrait: доски столбиком; только avatar bubbles; счётчики слева сверху.
- [ ] В режиме нет Spin / bet± / Buy Bonus / Auto; есть info / music / turbo.
- [ ] Спины авто: кот → собака ×10.
- [ ] У сторон отдельные win/bank; виден переток.
- [ ] Big Win только при финальной победе кота.
- [ ] При победе собаки payout 0, без Big Win.

### Math (этап B)

- [ ] Нет `B`, paw, `BT` ни на одном спине Duel.
- [ ] `dogTotal != catTotal` всегда.
- [ ] `cat > dog` → payout = sum; иначе 0.
- [ ] RTP ≈ 96%, session win-rate ≈ 50%, max ≤ ×25000.
- [ ] SW только по base curtain rules.

---

## 9. Вне скоупа

- Натуральный вход в Duel.
- Sticky SW / FS revolver fantasy внутри Duel.
- Финальный персонаж собаки (только placeholder).
- Изменение RTP/цен Normal/Super.
- Одновременный spin обеих досок (отклонён: только очередь cat→dog).

---

## 10. Открытые мелочи на прототип (не блокируют старт)

Их можно решить по ходу UI, без смены продуктовых правил:

1. Точный тайминг паузы между cat-spin и dog-spin.
2. Визуальный язык перетока денег (частицы / fly-text / meter pulse).
3. Нужен ли отдельный BGM для Duel или тот же bonus track.
4. Текст проигрышного outro (тон: насмешка собаки / нейтрально).
5. Показывать ли во время авто-сессии общий «potential payout if cat wins» (= текущая сумма банков) — **рекомендация: да, как подсказку**, но не обязательно в первой итерации.

---

## 11. Следующий шаг

После подтверждения этого MD:

1. **Этап A** — UI-прототип dual-board + мок-сессия Duel + карточка в Buy Bonus.  
2. Ревью визуала на desktop и portrait.  
3. Затем **Этап B** — math-sdk `bonus_duel`.
