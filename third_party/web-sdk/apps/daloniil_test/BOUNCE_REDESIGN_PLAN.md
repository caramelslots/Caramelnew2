# Bounce / Landing — план редизайна

Цель: убрать «squash & stretch» (изменение размеров символа на лендинге) и
сделать стандартное слотовое приземление — **символ остаётся прежнего размера,
а ряд символов «падает с инерцией» по оси Y** (короткий перелёт за конечную
позицию + затухающее возвращение).

---

## 1. Текущее состояние (что происходит при приземлении сейчас)

В коде сейчас работают **два независимых слоя bounce**:

### 1.1. Reel-level bounce (правильный — оставляем как фундамент)

`third_party/web-sdk/packages/utils-slots/src/createReelForSpinning.svelte.ts`

```150:159:third_party/web-sdk/packages/utils-slots/src/createReelForSpinning.svelte.ts
const removePaddingAndBounceBack = async () => {
	reelState.symbols = [...targetSymbols];
	placeY(defaultY + reelOptions.symbolHeight * reelState.spinOptions().reelBounceSizeMulti);
	await slideY({
		reelY: defaultY,
		speed: reelState.spinOptions().reelBounceBackSpeed,
		easing: sineOut,
	});
	setSymbolsWithReelSymbols(targetSymbols);
};
```

Что делает:

1. Останавливает падение чуть **ниже** конечной позиции
   (`defaultY + 0.12 × symbolHeight` — см. `reelBounceSizeMulti: 0.12`).
2. Плавно поднимает колонку обратно к `defaultY` с easing `sineOut`.
3. Ставит `symbolState = 'land'` после возвращения.

Это и есть «инерциональное падение по Y», которое нужно пользователю.
Слой остаётся, но усилим его (см. §3).

Параметры в игре:

```102:112:third_party/web-sdk/apps/daloniil_test/src/game/constants.ts
const REEL_SPEED = 1.5;
const SPIN_OPTIONS_SHARED = {
	reelBounceBackSpeed: REEL_SPEED,
	reelSpinSpeedBeforeBounce: REEL_SPEED,
	reelPaddingMultiplierNormal: 1.2,
	reelPaddingMultiplierAnticipated: 10,
	reelSpinDelay: 100,
	reelPreSpinSpeed: REEL_SPEED,
	reelSpinSpeed: REEL_SPEED,
	reelBounceSizeMulti: 0.12,
};
```

### 1.2. Symbol-level squash spine (то что хотим убрать)

Когда символ переходит в `symbolState === 'land'`, рендерится spine
`H1Bounce..L4Bounce` (асет `symbolsBounce/<...>.json`), у которого
animation `bounce` меняет **scale** кости `scale`:

```text
0.0000  (1.00, 1.00)   старт
0.0667  (1.15, 0.85)   squash 1
0.1333  (1.00, 1.00)
0.2000  (0.85, 1.15)   stretch
0.2667  (1.00, 1.00)
0.3333  (1.10, 0.90)   squash 2
0.4000  (0.95, 1.05)
0.4667  (1.00, 1.00)
0.6167  (0.78, 0.78)   settle (подгонка под static-спрайт)
```

Файлы: `third_party/web-sdk/apps/daloniil_test/static/assets/spines/symbolsBounce/{High_1..4,Low_1..4}.json`.
Скрипты, которые их генерируют:

- `scripts/append_settle_to_bounce.mjs` — пересобирает таймлайн и settle-кадр.
- `apps/daloniil_test/scripts/tuneBounceScale.mjs` — масштабирует все кадры под BASE_SCALE.

Проблема: каждый символ при `land` физически меняет ширину/высоту —
это не «слотовая» инерция, а cartoon squash & stretch.

### 1.3. Где `land` подключается к рендеру

```217:350:third_party/web-sdk/apps/daloniil_test/src/game/constants.ts
H1: { ..., land: h1Bounce },
H2: { ..., land: h2Bounce },
...
L4: { ..., land: l4Bounce },
W:  { ..., land: wStatic   },
B:  { ..., land: bStatic   },
M:  { ..., land: mStatic   },
```

```13:39:third_party/web-sdk/apps/daloniil_test/src/components/ReelSymbol.svelte
const symbolInfo = $derived(
	getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: props.reelSymbol.symbolState }),
);
...
animating={symbolInfo.type === 'spine' &&
	(props.reelSymbol.symbolState === 'land' || ... )}
```

`Symbol.svelte` рендерит `SymbolSprite` если `symbolInfo.type === 'sprite'`
и `SymbolSpine` иначе. Когда `oncomplete` приходит в `land` — стейт
переключается на `'static'`.

Для спрайтов `oncomplete` срабатывает мгновенно (`onMount` + `$effect`),
поэтому визуальный pipeline не сломается, если `land` станет спрайтом —
переход `land → static` произойдёт мгновенно, без визуального скачка
(оба — одинаковые webp).

---

## 2. Целевое поведение

- Символ во всех состояниях (`spin → land → static`) сохраняет **один и тот же
  визуальный размер** — никаких scale-изменений.
- При остановке колонка как единое целое **проскакивает чуть ниже** финальной
  позиции и затухающе возвращается к `defaultY` (затухающие колебания по Y).
- Длительность всего landing’а — ~150–250 мс (ощущение «упало и легло»,
  без долгого пружинения).
- Звук приземления / `onSymbolLand` фиксируется как сейчас — в момент,
  когда `removePaddingAndBounceBack` завершён и стейт стал `'land'`.

---

## 3. Реализация

### Шаг 1. Снять squash со всех символов (только `constants.ts`)

В `SYMBOL_INFO_MAP` для H1..H4 и L1..L4 поменять:

```ts
land: h1Bounce  →  land: h1Static
...
land: l4Bounce  →  land: l4Static
```

Эффект:

- `Symbol.svelte` для `state === 'land'` отрисует `SymbolSprite` (тот же
  `h1.webp`, что и в `static` / `spin`) — никаких изменений размера.
- `oncomplete` сработает мгновенно (онмаунт), `ReelSymbol` переключит
  `state` в `'static'` без визуального дрожания (контент идентичен).
- `animating` станет `false` для `land` (тип уже не `spine`) —
  `SymbolWrap` корректно отрисует символ в неанимационном `BoardContext`.

Спайны `H1Bounce..L4Bounce` и файлы `symbolsBounce/*.json` становятся
неиспользуемыми. **Удаляем** только в Шаге 5 (cleanup), чтобы при
необходимости легко откатиться.

`W`, `B`, `M` уже на спрайтах в `land` — их не трогаем.

### Шаг 2. Усилить инерционный «дроп» колонки

Цель: вместо одного-разового `sineOut` перелёта дать ощущение «упало,
коротко спружинило и легло».

**Вариант A (минимальная правка, рекомендуется первой итерацией)**

Только изменение констант в `apps/daloniil_test/src/game/constants.ts`:

```ts
// было
reelBounceSizeMulti: 0.12,
reelBounceBackSpeed: REEL_SPEED,           // 1.5 px/ms

// стало (предложение, тюним по ощущениям)
reelBounceSizeMulti: 0.18,                 // увеличить overshoot ~50%
reelBounceBackSpeed: REEL_SPEED * 0.6,     // 0.9 px/ms — чуть медленнее settle
```

Easing менять не обязательно — `sineOut` уже даёт затухание.

**Вариант B (больше «слотовости» — двухстадийная damped-осцилляция)**

Правка в `third_party/web-sdk/packages/utils-slots/src/createReelForSpinning.svelte.ts`
функция `removePaddingAndBounceBack`:

```ts
import { sineOut, cubicOut } from 'svelte/easing';
// ...
const removePaddingAndBounceBack = async () => {
	reelState.symbols = [...targetSymbols];
	const opts = reelState.spinOptions();
	const overshoot = reelOptions.symbolHeight * opts.reelBounceSizeMulti;
	const secondaryOvershoot = overshoot * 0.25; // обратное мини-колебание

	// 1) колонка ушла ниже финальной точки — поднимаем выше неё
	placeY(defaultY + overshoot);
	await slideY({
		reelY: defaultY - secondaryOvershoot,
		speed: opts.reelBounceBackSpeed,
		easing: sineOut,
	});
	// 2) затухающее возвращение к финальной позиции
	await slideY({
		reelY: defaultY,
		speed: opts.reelBounceBackSpeed * 1.5, // короче, чтобы общая длительность ~200мс
		easing: cubicOut,
	});

	setSymbolsWithReelSymbols(targetSymbols);
};
```

Альтернативный easing для одностадийного варианта — `bounceOut` из
`svelte/easing` (даёт характерные «слотовые» отскоки), но он часто
выглядит избыточно — выбирать после визуальной проверки.

⚠️ Это файл shared package’а. Менять можно (это наш форк), но желательно
сохранять backward-compat для других игр: новое поведение можно гейтить
по новой опции `reelSettleStyle: 'damped' | 'simple'` в `spinOptions`,
default = `'simple'` (текущее поведение). В нашей игре включить `'damped'`.

**Рекомендуемый порядок**: сначала **Вариант A** (1 файл, 2 числа).
Если визуально мало — переключаемся на **Вариант B**.

### Шаг 3. Убедиться, что таймингы не разъехались

`bookEventHandlerMap.ts → winInfo` ждёт `WIN_INFO_PRE_DELAY_MS = 100ms`
после приземления перед стартом win-целебрации. Сейчас это с запасом
покрывало 0.6с спайн-bounce — после редизайна анимация лендинга стала
короче, так что оставляем `WIN_INFO_PRE_DELAY_MS` как есть (с запасом
покрывает damped settle).

`onSymbolLand` колбек срабатывает в `updateAllReelSymbolState('land')`,
который вызывается **после** `removePaddingAndBounceBack`. Логика
звуков скаттеров и пр. не ломается.

### Шаг 4. Проверка (вручную)

`pnpm run dev --filter=daloniil_test`. Прогнать:

- Обычный спин (normal).
- Турбо/fast.
- Anticipated (длинный спин).
- Free spins (особенно повторные приземления).
- `mysteryReveal → land` (через DevCheats forced book’и) — там тоже идёт
  переход `land → static`, нужно убедиться что нет визуального снапа.
- Win-анимация: символ-победитель (`state = 'win'`) должен корректно
  стартовать — он уходит в спайн `H1` для победы, не `H1Bounce`.

Чек-лист:

- [ ] Символ не «дышит» по размеру при остановке.
- [ ] Колонка ощущается «упавшей с инерцией» (короткий overshoot).
- [ ] Нет визуального снапа `land → static` (одинаковый спрайт).
- [ ] Звук `sfx_scatter_stop_*` совпадает с моментом фактической остановки.
- [ ] Турбо не растягивает landing.

### Шаг 5. Cleanup (после приёмки UX)

Только когда новая анимация утверждена:

1. Удалить из `assets.ts` ключи `H1Bounce..L4Bounce` (8 ключей).
2. Удалить файлы `static/assets/spines/symbolsBounce/{High_*,Low_*}.json`
   (8 файлов). Атлас и `.png` остаются если используются `Special_*`
   (проверить — судя по grep’у, `Special_1.json`/`Special_2.json` всё
   ещё ссылаются на них; сейчас они в `SYMBOL_INFO_MAP` не используются,
   но удалять файлы стоит после grep’а по всему репо).
3. Удалить (или пометить deprecated):
   - `scripts/append_settle_to_bounce.mjs`
   - `apps/daloniil_test/scripts/tuneBounceScale.mjs`
4. Обновить комментарии в `constants.ts`:
   - В `SPIN_OPTIONS_SHARED` про «bounce and bounce-back» — переписать
     под новое поведение.
   - Убрать описание `bounce` в `bounce()`-фабрике, если spine больше
     нигде не используется.
5. Удалить переменную `Bounce`-фабрику из `constants.ts` (`const bounce =
   (assetKey) => ...`) если ни один `*Bounce` спайн не остался в карте.

---

## 4. Какие файлы будем менять

**Шаг 1 (обязательный):**

- `third_party/web-sdk/apps/daloniil_test/src/game/constants.ts`
  - 8 строк `land: hXBounce / lXBounce` → `land: hXStatic / lXStatic`.

**Шаг 2 — Вариант A (рекомендуется начать с него):**

- `third_party/web-sdk/apps/daloniil_test/src/game/constants.ts`
  - `reelBounceSizeMulti`, `reelBounceBackSpeed` (тюним до нужного ощущения).

**Шаг 2 — Вариант B (если A мало):**

- `third_party/web-sdk/packages/utils-slots/src/createReelForSpinning.svelte.ts`
  - Переписать `removePaddingAndBounceBack` (двухстадийный damped settle),
    или ввести флаг `reelSettleStyle` в `spinOptions`.

**Шаг 5 (cleanup, отдельный коммит после ОК):**

- `third_party/web-sdk/apps/daloniil_test/src/game/assets.ts`
- `third_party/web-sdk/apps/daloniil_test/static/assets/spines/symbolsBounce/*.json`
- `scripts/append_settle_to_bounce.mjs`
- `apps/daloniil_test/scripts/tuneBounceScale.mjs`

---

## 5. Открытые вопросы (нужны ответы перед реализацией)

1. **Сила overshoot’а**: 0.18 ок, или хочется ярче (0.22–0.30) / тише (0.14)?
2. **Двухстадийная settle** (Вариант B) сразу или подождать визуальную
   проверку Варианта A?
3. **Турбо**: оставить тот же overshoot, или в турбо его уменьшить
   до ~0.08 (быстрее «прибивать» landing)?
4. **Special символы** (`W`, `B`, `M`): они уже на спрайтах в `land`
   — оставляем без изменений?
5. **Удалять ли asset’ы** после первой итерации, или держать в коде на
   случай отката?

---

## 6. Резюме

Минимальный путь:

1. Поменять 8 строк в `constants.ts` (`*Bounce` → `*Static`).
2. Подкрутить 2 числа (`reelBounceSizeMulti`, `reelBounceBackSpeed`).
3. Прогнать визуальный тест — если мало инерции, переходим на Вариант B
   (правка `createReelForSpinning.svelte.ts`).
4. Cleanup отдельным коммитом.

Это даёт:

- Никаких изменений размера символа на лендинге.
- Чистый Y-инерционный «дроп» колонки, как в обычных слотах.
- Минимальный риск регрессий (1–2 файла, без правок game-state и
  bookEventHandlerMap).
