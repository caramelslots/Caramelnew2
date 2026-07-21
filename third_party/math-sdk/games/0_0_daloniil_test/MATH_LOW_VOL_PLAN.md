# Wok Fury — Low Volatility / Hit ×2 Plan

Живой документ **Этап 3** после `MATH_RETENTION_PLAN.md` (Этапы 1–2 реализованы в коде + M5 sim).

> Дата начала: 2026-06-05  
> Статус: **🟢 реализовано в коде — pipeline (M5/opt/resample) вручную**

**Цель этапа:** понизить **волатильность base layer** и **удвоить line hit rate** (~19% → ~36–38%) для `base` и `bonus_boost`, сохранив **RTP 96%** и **FS profile** из retention-плана.

**Связанные файлы:** `game_config.py`, `game_optimization.py`, `generate_reels.py`, `game_cluster.py`, `MATH_RETENTION_PLAN.md`

---

## Контекст — что уже есть (после Этапов 1–2)

### Факт после M5 (pre-resample sim quotas)

| Режим         | Line hit (quota) | Dead (0+cluster)                        | FS quota | Base RTP budget |
| ------------- | ---------------- | --------------------------------------- | -------- | --------------- |
| `base`        | **19%**          | **70.9%** (42.5% plain + 28.4% cluster) | 10%      | 40%             |
| `bonus_boost` | **19%**          | **62.9%** (37.7% + 25.2%)               | 18%      | 30%             |

### Ощущение в demo (feedback команды)

- Hit ~18% **есть в math**, но **~71% спинов = 0 payout**
- **28%** всех спинов — **cluster dead** (живой экран, win = 0)
- Много wins **≤ 0.5×** — hit «технический», не заметный
- **Avg win на hit** выше цели retention (~5× fact vs ~2.1× plan) → base всё ещё **рваный**

### Hard constraints (наследуем из retention + Stake)

| #   | Constraint                                                                              |
| --- | --------------------------------------------------------------------------------------- |
| H1  | Total RTP = **96%** per mode (`base` cost×1, `bonus_boost` cost×2)                      |
| H2  | **FS quota + FS RTP share** — по умолчанию **не трогаем** (base 10%/55%, boost 18%/65%) |
| H3  | **Wincap** 2500×, quota 0.1% — без изменений                                            |
| H4  | Stake: payout **≥ 0.1×**, кратность **0.1×** (10 cents при cost=1)                      |
| H5  | Publish: books ↔ LUT match, `index.json`, resample pipeline                             |

### Математика ×2 hit (если FS fixed)

```
base_RTP = hit_rate × avg_win_per_hit

base:         40% = 37% × ~1.08×
bonus_boost:  30% = 37% × ~0.81×
```

**Variant A (quotas)** задаёт hit; **paytable + reels + optimizer** обязаны опустить avg win.

---

## Draft target (Variant A — для обсуждения, не финал)

| Criteria          | `base` сейчас | draft ×2   |
| ----------------- | ------------- | ---------- |
| `wincap`          | 0.1%          | 0.1%       |
| `freegame`        | 10%           | 10%        |
| `basegame`        | 19%           | **~37%**   |
| `0` + `0_cluster` | 70.9%         | **~52.9%** |

| Criteria          | `bonus_boost` сейчас | draft ×2   |
| ----------------- | -------------------- | ---------- |
| `wincap`          | 0.1%                 | 0.1%       |
| `freegame`        | 18%                  | 18%        |
| `basegame`        | 19%                  | **~37%**   |
| `0` + `0_cluster` | 62.9%                | **~44.9%** |

---

## Вопросы для решения

Обсуждаем **по порядку**. После каждого ответа — фиксируем ✅ в этом файле.

---

### Q1 — Подтверждаем цель hit rate?

**Вопрос:** Line hit target для `base` и `bonus_boost`?

| Option | Hit (line)                        | vs сейчас            |
| ------ | --------------------------------- | -------------------- |
| **A**  | **~37–38%**                       | ровно ×2 от ~19%     |
| B      | ~30%                              | +50%, мягче          |
| C      | ~25%                              | компромисс           |
| D      | Разный: base 37%, bonus_boost 30% | разный feel по modes |

**Draft recommendation:** **A** (×2) — согласовано с запросом «увеличить hit в 2 раза».

- [x] **Решение: A** — line hit **~37–38%** для `base` и `bonus_boost` (×2 от ~19%).

---

### Q2 — FS и wincap трогаем?

**Вопрос:** Оставляем FS quota + FS RTP share + FS optimizer **без изменений**?

| Option | FS quota (base / boost) | FS RTP share | Комментарий                                    |
| ------ | ----------------------- | ------------ | ---------------------------------------------- |
| **A**  | 10% / 18%               | 55% / 65%    | как retention plan                             |
| B      | Поднять FS quota        | —            | больше «big moments», меньше room для base hit |
| C      | Снизить FS RTP share    | —            | освобождает budget, но меняет профиль игры     |

**Draft recommendation:** **A** — весь прирост hit только из dead ↔ basegame.

- [x] **Решение: A** — FS **не трогаем**: quota 10% / 18%, RTP share 55% / 65%, wincap 0.1% / 2500×, механики и FS optimizer без изменений.

---

### Q3 — Quota structure: Variant A?

**Вопрос:** Основной рычаг — поднять `basegame` quota и резать dead (при неизменных FS/wincap)?

| Option | Описание                                              |
| ------ | ----------------------------------------------------- |
| **A**  | Да — `basegame` ~37%, dead ~53% (base) / ~45% (boost) |
| B      | Частично — hit ~30%, меньше stress на avg win         |
| C      | Нет — квоты оставить, крутить только reels/paytable   |

**Draft recommendation:** **A** + обязательный пакет B+C+D (paytable, reels, optimizer).

- [x] **Решение: A** — `basegame` **37%**, dead **52.9%** (base) / **44.9%** (boost); FS 10%/18%, wincap 0.1%.

---

### Q4 — Cluster dead (Stage 2): что делаем при ×2 hit?

**Вопрос:** Сейчас **28%** всех base spins — cluster (0 pay). При 37% real hits это усиливает frustration.

| Option | Cluster share of **all spins** | Plain dead | Комментарий                      |
| ------ | ------------------------------ | ---------- | -------------------------------- |
| A1     | ~21% (40% of dead, как сейчас) | ~32%       | сохраняем Stage 2 пропорции      |
| **A2** | **~8–10%**                     | ~43–45%    | режем cluster, больше plain dead |
| A3     | **0%**                         | ~53%       | убираем cluster в base/boost     |
| A4     | Cluster только в FS dead       | —          | base plain dead only             |

**Draft recommendation:** **A2** — near-miss остаётся, но не каждый 5-й спин.

- [x] **Решение: A2** — cluster **~10%** всех спинов (base + boost), plain dead **~43%** / **~35%** (boost).

**Целевые quotas (base):**

| Criteria         | Quota     | % of dead |
| ---------------- | --------- | --------- |
| `0` (plain dead) | **42.9%** | 81%       |
| `0_cluster`      | **10.0%** | 19%       |
| dead total       | 52.9%     | 100%      |

**Целевые quotas (bonus_boost):**

| Criteria         | Quota     | % of dead |
| ---------------- | --------- | --------- |
| `0` (plain dead) | **34.9%** | 78%       |
| `0_cluster`      | **10.0%** | 22%       |
| dead total       | 44.9%     | 100%      |

**Почему A2, не A1:** при 37% real hit cluster 21% (A1) даёт ~1 «яркий 0» на 1.7 real win — всё ещё много tease. **10% cluster ≈ 1 на 3.7 real win** — ближе к low-vol «честному» feel. Stage 2 near-miss сохранён, но не доминирует.

**Код:** `dead_cluster_fraction` **0.40 → ~0.19** (base) / **~0.22** (boost) — или фиксированные quotas как выше.

---

### Q5 — Avg win per hit (размер выплат)

**Вопрос:** Целевой средний line win **на один hit** при 37% hit?

|           | `base` (40% RTP budget) | `bonus_boost` (30% budget) |
| --------- | ----------------------- | -------------------------- |
| @ 37% hit | **~1.08×**              | **~0.81×**                 |
| @ 30% hit | ~1.33×                  | ~1.00×                     |

**Подвопросы:**

| ID  | Вопрос                          | Options                    |
| --- | ------------------------------- | -------------------------- |
| Q5a | Accept много wins **< 1× bet**? | Да / Нет (тогда hit < 37%) |
| Q5b | Min «заметный» win              | 0.1× / 0.2× / 0.5×         |
| Q5c | Cap типичного base hit          | ≤1× / ≤1.5× / ≤2×          |

**Draft recommendation:** Q5a **Да**; Q5b **0.1×** micro + часть 0.2–0.5×; Q5c **≤1×** типичный, >2× редкость.

- [x] **Q5a: Да** — accept много wins **< 1× bet** (иначе avg win/hit > ~1.08× и hit quota 37% не сходится с base RTP 40%).
- [x] **Q5b: 0.1×** — min payout / micro-win floor; часть hits 0.2–0.5× через paytable + reels.
- [x] **Q5c: ≤1×** — типичный base hit ≤ ставки; wins **>2×** редкость (optimizer penalize).

---

### Q6 — Paytable (micro-wins)

**Вопрос:** Как расширяем paytable для micro-hits?

| Option | Изменение                                   |
| ------ | ------------------------------------------- |
| **A**  | Добавить **3-OAK L1/L2 @ 0.1×** (как L3/L4) |
| B      | Только L3/L4 0.1× (уже есть), крутим reels  |
| C      | Поднять 3-OAK L3/L4 до **0.2×**             |
| D      | A + C комбо                                 |

**Stake:** только кратность 0.1× (0.15× нельзя).

**Draft recommendation:** **A** для плотности hit; **не** C без снижения hit quota.

- [x] **Решение: A** — добавить **3-OAK L1/L2 @ 0.1×** (как L3/L4); L3/L4 0.1× оставляем.

---

### Q7 — Reelstrips BR0 / BR1

**Вопрос:** Направление tuning лент?

**Modified full draft** — W↓ + L1/L2/L3/L4↑ (не minimal diff): режет avg win, поддерживает Q6 (L1/L2 @ 0.1×).

| Параметр | BR0 сейчас | **BR0 цель**  | BR1 сейчас | **BR1 цель**  |
| -------- | ---------- | ------------- | ---------- | ------------- |
| W        | 28         | **20**        | 22         | **17**        |
| L1       | 30         | **34**        | 37         | **40**        |
| L2       | 30         | **34**        | 36         | **39**        |
| L3       | 34         | **38**        | 38         | **40**        |
| L4       | 35         | **40**        | 38         | **40**        |
| B        | 4          | **4**         | 6          | **6**         |
| H1–H4    | —          | без изменений | —          | без изменений |

Сдвиг веса: **W → L1/L2/L3/L4**. Bonus не трогаем (FS quota fixed). BR0_ZW / BR1_ZW — mirror shift (W остаётся низким).

- [x] **Решение: modified full draft** — таблица выше.

---

### Q8 — Optimizer

**Вопрос:** Как сдвигаем optimizer под low-vol?

| Параметр               | Retention (сейчас) | Draft             |
| ---------------------- | ------------------ | ----------------- |
| `basegame` HR          | 5.5                | **3.0–3.5**       |
| Scaling boost          | 1–2× range         | **0.1–1×**        |
| Scaling penalize       | 5–50×              | **>1.5×**         |
| `distribution_bias` FS | near-wincap        | **без изменений** |

- [x] **Решение: draft as-is** — HR **3.2**, boost **0.1–1×**, penalize **>1.5×**, FS optimizer без изменений.

---

### Q9 — bonus_boost: тот же hit что base?

**Вопрос:** `bonus_boost` line hit = `base` или ниже?

| Option | boost hit          | avg win/hit @ 30% RTP | Feel                      |
| ------ | ------------------ | --------------------- | ------------------------- |
| **A**  | **37%** (как base) | ~0.81×                | max frequency, micro wins |
| B      | 30%                | ~1.0×                 | чуть крупнее base wins    |
| C      | 25%                | ~1.2×                 | ближе к «ощутимому» win   |

**Draft recommendation:** **A** если parity modes; **B** если boost должен feel «чуть щедрее per hit».

- [x] **Решение: A** — `bonus_boost` line hit **37%** (как base); avg ~0.81× @ 30% RTP budget.

---

### Q10 — UI / feel (не math, но влияет на восприятие)

**Вопрос:** Усиливаем feedback на micro-wins (levels 1–2)?

| Option | Описание                          |
| ------ | --------------------------------- |
| A      | Math only — UI позже              |
| B      | Параллельно: SFX/ticker на 0.1–1× |
| C      | Поднять win level 2 threshold     |

**Draft recommendation:** **A** для math этапа; **B** отдельным web-sdk тикетом.

- [x] **Решение: A** — math only; UI feedback (SFX/ticker micro-wins) — отдельный web-sdk тикет.

---

**Вопрос:** Какие bet modes входят в этот этап?

| Mode                        | В scope?                      |
| --------------------------- | ----------------------------- |
| `base`                      | ?                             |
| `bonus_boost`               | ?                             |
| buy modes                   | только если меняем cluster FS |

**Draft recommendation:** только **base + bonus_boost** (как retention Stage 1).

- [x] **Решение: draft** — только **`base` + `bonus_boost`**; buy modes вне scope.

---

**Вопрос:** Подтверждаем workflow?

1. `generate_reels.py` → regen CSV
2. `run.py` M5 (1e5)
3. optimization all modes
4. resample → storybook sync

- [x] **Подтверждено** — pipeline тот же; **запуск выполняет команда вручную** (не в scope агента).

---

## Stake compliance checklist

| Проверка            | Риск при low-vol ×2 hit     |
| ------------------- | --------------------------- |
| RTP 96% ± tolerance | ⚠️ нужен optimization rerun |
| payout ≥ 10 (0.1×)  | ✅ micro-wins OK            |
| payout % 10 == 0    | ✅ только 0.1× шаг          |
| max_win достижим    | ✅ wincap books сохраняем   |
| mode RTP diff < 5%  | ⚠️ следить base vs boost    |
| Hit rate 37%        | ✅ не ограничено Stake      |

---

## Журнал решений

| Дата       | #   | Тема             | Решение                                                               |
| ---------- | --- | ---------------- | --------------------------------------------------------------------- |
| 2026-06-05 | Q1  | Hit target       | **A** — ~37–38% line hit (base + bonus_boost), ×2 от ~19%             |
| 2026-06-05 | Q2  | FS / wincap      | **A** — FS и wincap **не трогаем** (quota + RTP share + optimizer)    |
| 2026-06-05 | Q3  | Quotas Variant A | **A** — basegame **37%**, dead **52.9%** / **44.9%** (boost)          |
| 2026-06-05 | Q4  | Cluster dead     | **A2** — cluster **~10%** all spins; plain dead **42.9%** / **34.9%** |
| 2026-06-05 | Q5a | Wins < 1× bet    | **Да** — micro-wins OK для avg ~1.08× @ 37% hit                       |
| 2026-06-05 | Q5b | Min win          | **0.1×** micro + часть 0.2–0.5×                                       |
| 2026-06-05 | Q5c | Typical hit cap  | **≤1×** типичный; >2× редкость                                        |
| 2026-06-05 | Q6  | Paytable         | **A** — 3-OAK L1/L2 @ **0.1×**                                        |
| 2026-06-05 | Q7  | Reels BR0/BR1    | **Modified full draft** — W↓, L1–L4↑, B fixed                         |
| 2026-06-05 | Q8  | Optimizer        | **Draft as-is** — HR 3.2, boost 0.1–1×, penalize >1.5×                |
| 2026-06-05 | Q9  | bonus_boost hit  | **A** — 37% (parity с base)                                           |
| 2026-06-05 | Q10 | UI / feel        | **A** — math only, UI позже                                           |
| 2026-06-05 | Q11 | Scope            | **base + bonus_boost** only                                           |
| 2026-06-05 | Q12 | Pipeline         | **Подтверждён** — запуск вручную (команда)                            |

---

## Summary

**Этап 3 — Low Vol / Hit ×2** (все вопросы ✅):

| Область     | Решение                                                          |
| ----------- | ---------------------------------------------------------------- |
| Hit rate    | **37%** line hit — `base` + `bonus_boost` (×2 от ~19%)           |
| FS / wincap | **Без изменений** — 10%/18% quota, 55%/65% RTP share             |
| Quotas      | `basegame` **37%**; dead **52.9%** / **44.9%** (boost)           |
| Cluster     | **A2** — **10%** all spins; plain **42.9%** / **34.9%**          |
| Win profile | Micro **0.1×** OK; типичный **≤1×**; avg **~1.08×** / **~0.81×** |
| Paytable    | **3-OAK L1/L2 @ 0.1×** (+ L3/L4 0.1×)                            |
| Reels       | **Modified full draft** — W↓ (20/17), L1–L4↑, B fixed            |
| Optimizer   | HR **3.2**, boost **0.1–1×**, penalize **>1.5×**; FS unchanged   |
| Scope       | **base + bonus_boost** only                                      |
| UI          | Math only — UI отдельно                                          |
| Pipeline    | `generate_reels` → M5 → opt → resample → sync (**вручную**)      |

**Следующий шаг:** реализация в `game_config.py`, `game_optimization.py`, `generate_reels.py`, web-sdk `config.ts`.
