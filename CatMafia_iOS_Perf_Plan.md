# Cat Mafia — план: FPS-кап + лишние WebGL + без extract (п.1, 2, 6)

Дата: 2026-09-14  
Scope: `third_party/web-sdk/apps/cat_mafia` (+ точечно `packages/pixi-svelte`, если кап FPS нельзя повесить только в игре).

**Цель:** снизить жар в простое и пик GPU на iPhone Safari (вылеты в Super / extra spins). Реализовать пункты **1, 2 и 6** из приоритетного списка. Остальное (штора Super, living idle по типам, BoardMask, stencil) — не в этом проходе.

**Уже сделано (не повторять):** buy-bonus WebGL уничтожается, когда меню не видно (`buyBonusSharedPixi.ts`).

---

## Пункт 1 — кап FPS главного Pixi на телефоне

### Проблема

Главный `PIXI.Application` не ставит `ticker.maxFPS`. На iPhone с ProMotion `requestAnimationFrame` идёт на **120 Гц**. В простое и в Super это удваивает: living idle, 3× BoardFrame, маскот, прокрутку, шторы.

`maxFPS` уже есть только у оверлеев (`buyBonusSharedPixi`, `loaderCardBonusPixi` = 30).

### Решение

Кап **только телефон**. Десктоп / планшет без тача оставить без лимита (или 60, если тикер сам прёт выше).

| Платформа | `ticker.maxFPS` |
|---|---|
| iPhone / iPod / Android phone | **45** |
| Остальное | без капа (как сейчас) |

45 — компромисс: заметно холоднее 120, без «мультфильма» на 30. Если после замера на устройстве всё ещё жарко — опустить до 30 тем же рычагом.

Детект телефона — тот же, что уже есть, не плодить третий:

- `isPhoneForAtlasDownscale()` в `phoneSpineAtlasDownscale.ts`, **или**
- `isPhoneCanvasSizeType(canvasSizeType)` (`mobile` / `smallMobile`).

Для init канваса `canvasSizeType` ещё может быть неизвестен — надёжнее UA/touch (`isPhoneForAtlasDownscale`). Не использовать узкий `innerWidth <= 480 && portrait` из `InitialiseApplication` (ломается landscape / iPhone Plus).

### Куда писать

1. `packages/pixi-svelte/.../InitialiseApplication.svelte`  
   После `init` приложения: если передан лимит — `ticker.maxFPS = N`.  
   Новый опциональный проп, например `maxFps?: number`. Не хардкодить cat_mafia внутри пакета.

2. `apps/cat_mafia/src/components/GameApp.svelte`  
   Прокинуть `maxFps` с `Game.svelte`.

3. `apps/cat_mafia/src/components/Game.svelte`  
   Сейчас: `<GameApp maxResolution={3} tuneForMobilePortrait webglOnIosAndroid>`.  
   Добавить `maxFps={phone ? 45 : undefined}`.

Константу вынести рядом с другими phone-капами (`duelPhoneDpr.ts` или маленький `phoneTicker.ts`), чтобы не размазать магическое `45`.

### Не делать в п.1

- Не трогать `maxResolution` / antialias (уже есть portrait-кап 2.5).
- Не капать HTML `SpinePlayer` через Pixi ticker — это пункт 2 (`paused`).
- Не менять `EnableLivingIdle` / bounce RAF в этом проходе (п.13 списка).

### Проверка п.1

- Десктоп: анимации как раньше, без ощущения 45 FPS.
- Телефон (Safari, лучше ProMotion): в DevTools / Instruments кадры главного канваса ≤ 45.
- Простой 1–2 мин: слот заметно холоднее, idle маскота / символов живой, не «через кадр».
- Один спин + Super FS: прокрутка и штора не выглядят сломанными из‑за капа.

---

## Пункт 2 — не держать лишний WebGL, если его не видно

### Проблема

iOS делит GPU между контекстами. Второй/третий canvas в фоне + основной слот = Jetsam / context lost. Buy-bonus уже отпускается. Остаются:

| Источник | Когда живёт | Нужно |
|---|---|---|
| `SpinButtonHtmlSpine` (`SpinePlayer`) | Весь простой, `paused` только на win overlay / cloud | Пауза в idle; контекст не крутить на пустом треке |
| `loaderCardBonusPixi` | `warmLoaderCardBonusPixi()` в лоадере и в `GameAssetsLoader` | Не греть WebGL заранее; уничтожать после Continue |
| `BootstrapLoader` SpinePlayer | Сплэш, потом `{#if showYourLoader}` снимается | Убедиться, что `dispose()` на unmount (уже должно быть) |
| `TargetBoardOverlay` / DEV SpinePlayer | Только `devPreview.forceShowTargetBoard` | Не трогать прод, если оверлей не смонтирован без флага |
| `DuelPickMascot` | Только экраны pick | Ок, пока панель закрыта |

### 2a. Spin button

Файл: `SpinButtonHtmlSpine.svelte` + `htmlWebglPause.ts`.

Сейчас:

- idle-трек пустой (`setEmptyAnimation`), но `player.paused = isHtmlWebglPaused()` — пауза только при `winOverlayActive` / `transitionActive`;
- свой canvas живёт всегда рядом с `spin1.webp`.

Сделать:

1. В простое (`paused = true`), когда не играет клип нажатия.
2. На `playPress()`: `paused = false` → `animation` → по `complete` снова `setEmptyAnimation` и `paused = true`.
3. Покрытые оверлеи (win / cloud) по-прежнему пауза — не ломать `isHtmlWebglPaused()`.
4. Не `dispose()` на каждый idle: следующий press должен быть мгновенным. Цель — **не рендерить** второй WebGL 60/120 раз в секунду.

Если окажется, что пустой `SpinePlayer` всё равно держит GPU даже на `paused` — тогда создавать плеер только на press и `dispose` после клипа (хуже по отзывчивости кнопки, лучше по VRAM). Сначала вариант с `paused`.

### 2b. Loader-card Pixi

Файлы: `loaderCardBonusPixi.ts`, `LoaderCardsHtmlOverlay.svelte`, `GameAssetsLoader.svelte`.

Сейчас:

- `warmLoaderCardBonusPixi()` поднимает отдельный `PIXI.Application` + Spine B **до** экрана карточек и ещё раз из `GameAssetsLoader`;
- `destroyIfIdle` срабатывает только если `views.size === 0` и не идёт load; после warm spine уже есть, views может не быть — контекст остаётся;
- после Continue оверлей карточек должен уйти и `unregister` → destroy. Проверить, что так и есть; если оверлей остаётся в DOM со views — контекст живёт всю сессию.

Сделать по тому же правилу, что buy-bonus:

1. **Не вызывать `warmLoaderCardBonusPixi()`** из `GameAssetsLoader` (игра уже идёт, лоадер не нужен).
2. В оверлее карточек: HTTP-preload ассетов как сейчас; WebGL создавать **только когда карточка с Bonus видна** (`registerLoaderCardBonusSpine`).
3. `destroyIfIdle`: если нет displayed views — уничтожить app + spine (не держать «прогретый» Spine).
4. На Continue / unmount оверлея — явный destroy, не ждать гонки unregister.

`allowEmpty` / `loadSpine(true)` без views — убрать или сразу destroy после warm, если warm оставят только для первого кадра карусели.

### 2c. Аудит остальных canvas (без рефакторинга DEV)

После правок в простое базы (меню закрыто, лоадер пройден):

```js
document.querySelectorAll('canvas').length
```

Ожидание: **1** (главный Pixi). Допустимо 2 только на кадр press spin (если плеер не disposed).

Если находится третий — найти `SpinePlayer` / `PIXI.Application` и либо `paused`, либо unmount.

`BootstrapLoader`: после `ondismissed` `showYourLoader = false` — проверить cleanup `player?.dispose()`.

### Не делать в п.2

- Не переносить spin button в Pixi-слот (больше объём, не этот проход).
- Не трогать маскота / улицу / штору Super.
- Не выгружать атласы главного слота.

---

## Пункт 6 — не читать GPU главного слота (`extract` + `toDataURL`)

### Проблема

HTML-надписи «PRESS TO CONTINUE» и «YOU WON» рисуют **Pixi-текстом на игровом рендерере**, потом снимают пиксели в `<img>`:

1. `PIXI.RenderTexture.create`
2. `renderer.render({ container, target: rt })` — тот же `pixiApplication`, что барабаны
3. `renderer.extract.canvas(rt)` — синхронный **GPU → CPU**
4. `canvas.toDataURL('image/png')` — PNG в память + `img.src`

На iOS Safari extract с WebGL (особенно если на контексте stencil-маски шторы / W / клип борда) — типичный нативный краш, не JS-ошибка.

Худший момент: extra spins. `TargetShootOverlay.closeBoard` параллельно уезжает тир и монтирует `FreeSpinIntro`. На маунте **два extract** подряд (`FsIntroBannerLabel` + `PressToContinueHtml`), пока в GPU ещё шторы Super, атлас тира, маскот, барабан. Тап Continue размонтирует intro (`rt.destroy`) и сразу стартует extra FS — второй удар.

Первый FS-intro (после облака) тоже extract, но пик ниже. Лоадер — ещё ниже (слота почти нет).

`$effect` переснимает картинку при смене локали, шрифта, `mainLayout` (поворот). Cleanup `destroy(true)` на живом рендерере — отдельный риск.

### Где сейчас

| Файл | Что рисует | Когда бьёт |
|---|---|---|
| `PressToContinueHtml.svelte` | PRESS TO CONTINUE | лоадер, FS intro, extra intro, duel intro |
| `FsIntroBannerLabel.svelte` | YOU WON (и др. баннеры) | FS / extra congrats |
| `DuelBankTotalBitmapHtml.svelte` | сумма банка дуэли | пик дуэли |

`usePixiRender` = bitmap-шрифт **или** арабский. Английский PRESS TO CONTINUE идёт через extract (есть bitmap).

### Решение

Не снимать пиксели с **игрового** WebGL. Надпись остаётся HTML.

Порядок предпочтения:

1. **Системный / веб-шрифт в DOM** — ветка `press-label--system` / `label--system` уже есть для части локалей. Расширить на bitmap-локали: тот же `proxima-nova` / Prostoi, fill, letter-spacing, uppercase. Визуально чуть иначе, чем baked bitmap — допустимо ради стабильности.
2. Если нужен именно вид bitmap — один заранее сделанный PNG в ассетах, не runtime extract.
3. Крайний случай: отдельный `canvas.getContext('2d')` + шрифт. **Не** `renderer.extract`.

Не делать: «extract в rAF», «меньший PNG», «extract только на десктопе» (телефон как раз падает). Не переносить текст в Pixi-stage (другой z-index / облако).

### Куда писать

1. `PressToContinueHtml.svelte`  
   Убрать `$effect` с `RenderTexture` / `extract` / `toDataURL`. Всегда DOM-текст (или статичный img). Оставить `contained`, позицию, i18n, RTL.

2. `FsIntroBannerLabel.svelte`  
   То же: арка и fit-width уже есть в DOM-ветке (`label--arch`, `refitSystemLabel`). Pixi-ветку (`usePixiRender`) снять.

3. `DuelBankTotalBitmapHtml.svelte`  
   Тот же приём, иначе дуэль повторит вылет на своём пике.

Проверить, что после удаления нет импорта `pixi.js` только ради extract.

### Не делать в п.6

- Не трогать `BoardMask` / `createBoardFeatherMaskTexture` (это п.7, другой canvas 2D).
- Не менять шрифты слота на барабанах (BitmapText в Pixi на символах остаётся).
- Не чинить штору Super и W на ленде (п.3).

### Проверка п.6

- Лоадер и первый FS intro: «PRESS TO CONTINUE» / «YOU WON» читаются, позиция как раньше.
- Extra после тира: показать плашку и нажать Continue — слот не умирает (главный критерий).
- Поворот телефона на плашке — без вылета, текст не уезжает.
- Арабский / CJK / RU — без кракозябр, RTL ок.
- Дуэль: сумма банка без extract, без регрессии вёрстки.
- В коде cat_mafia не осталось `renderer.extract` / `toDataURL` на игровом renderer (кроме заведомого не-прод DEV, если есть).

---

## Порядок работ

1. Пункт 1 — кап 45 на телефоне (быстро, сразу снимает 120 Гц).
2. Пункт 2a — пауза Spin SpinePlayer в idle.
3. Пункт 2b — loader Pixi только пока видны карточки, destroy после Continue.
4. Пункт 2c — посчитать canvas в простое, добить хвосты.
5. Пункт 6 — убрать extract с главного рендерера (extra Continue / intro).

---

## Приёмка (п.1 + п.2 + п.6)

- [ ] Десктоп визуально без регрессий (спин, idle, HUD).
- [ ] iPhone Safari, простой 2 мин: один основной canvas, spin player на паузе, телефон заметно холоднее.
- [ ] Press spin: клип кнопки играет, затем снова пауза.
- [ ] Лоадер → карточки → Continue: loader WebGL исчезает, в игре его canvas нет.
- [ ] Buy Super → закрыть меню → FS: по-прежнему один игровой WebGL (buy-bonus не вернулся).
- [ ] Extra spins: плашка «YOU WON / +N / PRESS TO CONTINUE» без extract; тап Continue не роняет вкладку.
- [ ] Super FS прокрутки — п.3 не в этом проходе; зафиксировать, остался ли вылет на спинах после п.1+2+6.

---

## Вне скоупа (следующие проходы)

3. Штора Super + даунскейл `WILD_F_1` + кап W в FS-паддинге  
4. Living idle по одному типу  
5. Заморозка BoardFrame  
7. BoardMask без пересоздания текстуры каждый спин  
