# Cat Mafia — план: разнос пиков VRAM (Buy-bonus / входной тир / Stage E)

Дата: 2026-09-17  
Scope: `third_party/web-sdk/apps/cat_mafia`  
Статус: **внедрено в код** (п.1–3). Разнос пика на Press Continue — см. §0 (сделано ранее).

**Цель этого прохода — только три пункта:**

1. вход в Normal / Super / Duel через buy-bonus (полный размонт + remount в base);
2. первый тир → облако → FS intro → Tap to continue;
3. Stage E (тир в конце FS / extra spins) → intro extra.

Другие пики (outro `fsPopup`, staged duel boards и т.п.) **в этот план не входят** и сейчас не делаются.

**Связанный документ:** `CatMafia_iOS_Perf_Plan.md` (FPS / лишние WebGL / extract) — не дублировать; здесь только memory-peak sequencing для п.1–3.

---

## §0. Уже сделано (Press Continue) — не ломать

Разнесён пик на **Press to continue** в лоадере:

| Что | Поведение сейчас |
|---|---|
| Loader card WebGL | `destroyLoaderCardBonusPixi()` сразу на тап Continue |
| Batch 4 (`fsPopup`, tir keys, …) | после `liftComplete` + ~1.2 s |
| HUD HTML preload | на экране карточек / после skip-loading, не на тап Continue |
| Buy-bonus warm | после `liftComplete` + delay (phone ~4 s, desktop ~2.5 s), не на `showContent` |

Этот план **надстраивается** на то поведение: в бонусах buy-bonus должен уходить полностью; при возврате в base — снова аккуратно греться.

---

## Общий принцип

> В один момент на GPU не должны пересекаться: **buy-bonus WebGL**, **TIR (cabinet + flip atlas + bullet)**, **FS intro / fsCong**, **лишний warm, который в режиме недоступен**.

Правильный контракт (уже почти есть на Stage E extra):

```
тяжёлый слой уехал с экрана
  → unload / destroy GPU
  → (1–2 rAF или явный await)
  → следующий тяжёлый слой (intro / feature mount)
```

---

## Пункт 1 — Buy-bonus: полный размонт в Normal / Super / Duel

### Проблема

В Normal / Super / Duel **нет UI-пути** открыть buy-bonus. При этом:

- в basegame warm держит второй WebGL + до трёх ~4K атласов (~40–180 MB RGBA);
- pause main Pixi под меню **не освобождает** VRAM сцены;
- на старте фичи buy-bonus GL/атласы ещё могут жить или только начинать destroy, пока уже растёт тир / dual boards.

### Решение (продукт)

1. При входе в **Normal, Super или Duel** — **полностью** размонтировать buy-bonus:
   - destroy shared Pixi `Application`;
   - destroy все spine instances;
   - `PIXI.Assets.unload` атласов/скелетов всех трёх вариантов (`normal` / `super` / `duel`);
   - снять warm-hold (`shouldKeepBuyBonusWarm` → false на время фичи — уже так при FS intro / non-basegame, проверить duel).
2. При возврате в **basegame** — снова **вмонтировать** (отложенный warm), как после Continue: не в тот же кадр, что outro/`fsPopup`/смена маскота.

### Когда снимать (триггеры)

Снять **как можно раньше** после подтверждения входа в фичу, **до** роста TIR / dual boards:

| Вход | Момент destroy (желаемый) |
|---|---|
| Buy → Normal / Super | Сразу после confirm / старта book, **до** `freeSpinTargetPick` / `ensureTir*` |
| Natural trigger → Normal/Super | Как только ясно, что идём в FS (до или в начале `freeSpinTargetPick`) — buy-bonus и так может быть тёплым с base |
| Buy → Duel | **До** `stateDuel.active = true` и mount dual boards |
| Уже в FS / duel | Гарантировать cold: lifecycle effect + явный `releaseBuyBonusSharedStage()` |

Не полагаться только на «меню закрылось» + `DESTROY_IDLE_MS = 80`: нужен **синхронный/awaitable** teardown перед следующим GPU-шагом.

### Когда возвращать (remount)

| Событие | Поведение |
|---|---|
| Transition FS/Duel → `basegame` завершён | `shouldKeepBuyBonusWarm()` снова true |
| Warm | `ensureBuyBonusWarm()` после delay (phone длиннее), **не** на первом кадре после theme switch |
| После outro / cloud обратно в base | Warm buy-bonus только когда сцена уже base и delay прошёл (не в тот же кадр, что hide outro) |

Использовать уже существующие:

- `releaseBuyBonusSharedStage()` — `buyBonusSharedPixi.ts`
- `ensureBuyBonusWarm()` / `EnableBuyBonusWarmLifecycle.svelte`
- `shouldKeepBuyBonusWarm()` — basegame && !freeSpinIntroActive (проверить duel: при `stateDuel.active` warm должен быть false)

### Куда писать

1. `src/game/buyBonusSharedPixi.ts`  
   - Убедиться, что `releaseBuyBonusSharedStage` реально unload’ит все atlas/skeleton URL.  
   - При необходимости: `await releaseBuyBonusSharedStageAsync()` для барьера «сначала destroy, потом тир».

2. `src/components/EnableBuyBonusWarmLifecycle.svelte`  
   - Учитывать duel / freegame / intro: при любом не-base — release.  
   - Remount только когда снова base + entrance settled (delay).

3. Точки входа фичи (явный вызов release **до** TIR/duel GPU):  
   - `src/game/bookEventHandlerMap.ts` — начало `freeSpinTargetPick` / `freeSpinTrigger` / `duelStart` (или общий helper `evictBuyBonusForFeature()`).  
   - Confirm overlay / bet path, если book стартует с задержкой — destroy на confirm, не ждать первого book event.

4. Не трогать HTTP preload картинок меню (`startBuyBonusFlowPreload`) — дешёвый cache; опасен только **GPU** path.

### Проверка п.1

- [ ] Base → открыть buy-bonus → confirm Normal/Super: после confirm в DOM **нет** canvas buy-bonus; `Assets` не держит WILD_F_1 / mascot_cat buy atlases.
- [ ] То же для Duel.
- [ ] Natural FS trigger: warm с base снимается до/на старте тира.
- [ ] После outro → base: через delay buy-bonus снова открывается без долгого «пустого» первого раза (warm отработал).
- [ ] Во время FS/Duel повторное открытие buy-bonus из UI невозможно (как сейчас) и GPU buy-bonus пуст.

---

## Пункт 2 — Входной тир → облако → FS intro → Tap to continue

### Проблема

На **входе** в Normal/Super порядок хуже, чем на Stage E:

- тир (cabinet + flip atlas + bullet) ещё в GPU;
- параллельно cloud (`transition`), decode `fsCong`, mount `FreeSpinIntro`, смена скина маскота;
- Tap to continue сам по себе легче — вылет чаще на **стыке тир ↔ облако ↔ intro**.

Stage E extra уже делает правильно: тир уехал → unload → потом intro.

### Решение (продукт)

**Убирать тир с GPU, когда он уезжает вверх**, до тяжёлого intro:

```
тир уехал (slide out / dismiss)
  → targetPickOpen = false
  → unloadTirPixiGpu (phone; на desktop — хотя бы снять display + по возможности unload)
  → 1–2 rAF (или await unload)
  → только потом: fsCong preload (если ещё не) + freeSpinIntroShow + Press to continue
```

Облако может идти поверх; под паром не держать TIR+intro одновременно.

### Текущие якоря в коде

| Кусок | Файл | Сейчас |
|---|---|---|
| Входной тир | `TargetPickOverlay.svelte` | gallery; dismiss по `targetPickDismiss` |
| Unload TIR | `tirGpuMemory.ts`, `EnableTirGpuMemory.svelte` | phone unload после gallery/Stage E |
| Trigger FS | `bookEventHandlerMap.ts` → `freeSpinTrigger` | cloud + `targetPickDismiss` + intro path |
| Intro | `FreeSpinIntro.svelte` | congrats + Press to continue |
| fsCong | `uiHtmlAssetManifest` / preload в trigger | может стартовать рано |

### Куда писать

1. **Единый helper** (чтобы п.2 и п.3 совпадали), например в `tirGpuMemory.ts`:  
   `await dismissTirAndUnloadGpu()` = slide/hide finished → `targetPickOpen=false` → unload → 2 rAF.

2. `TargetPickOverlay.svelte`  
   - На уезд вверх: не оставлять hosts/WebGL-связанное в «полуживом» виде.  
   - После анимации уезда — сигнал «GPU free» (event или promise).

3. `bookEventHandlerMap.ts` (`freeSpinTrigger`)  
   - Переставить: не показывать/не декодить полный intro stack, пока тир не unloaded.  
   - `targetPickDismiss` → await unload barrier → затем intro/fsCong.  
   - Preload `fsCong` можно начинать **после** unload (или очень лёгкий fetch-only до, без decode — если API разделяет; иначе после).

4. `FreeSpinIntro.svelte`  
   - Не монтировать тяжёлые слои до barrier.  
   - Bake `PressToContinueHtml` только на fade-in.

5. `EnableMascotCatSkinMemory.svelte`  
   - Swap gray→white не должен держать **оба** скина внахлёст с ещё живым TIR; порядок: unload TIR → (под облаком) swap.

### Проверка п.2

- [ ] Buy/natural → тир выехал → до intro: TIR atlas/sprites сняты с `loadedAssets` (phone).
- [ ] FS intro + Tap to continue появляются только после уезда тира (визуально под/после облака — ок).
- [ ] Нет регрессии: выбранный awarded FS / анимация пуль на тире до уезда как раньше.
- [ ] iPhone: несколько холодных заходов Normal/Super без вылета на стыке тир→intro.

---

## Пункт 3 — Stage E (тир в конце FS / extra spins)

### Проблема

Тот же класс пика, что п.2, но поверх **уже тяжёлого FS**:

- полный борд + sticky Super Wild шторы (особенно Super / extra);
- тир reload после phone unload (decode 4K → downscale);
- параллельные флипы + пуля + барабан + маскот с пистолетом.

**Хорошая новость:** `TargetShootOverlay.closeBoard` уже почти правильный:

```
wait flips → gun end → slide out → targetPickOpen=false
  → 2 rAF → (EnableTirGpuMemory unload)
  → freeSpinIntroShow mode:'extra'
```

Нужно **закрепить и усилить** тот же контракт, что в п.2: тир уехал вверх → GPU тира пуст → только потом intro / следующий тяжёлый шаг. Плюс снизить пик **во время** стрельбы, если просто.

### Решение (продукт)

1. **Обязательный barrier** (как п.2): не слать `freeSpinIntroShow` / не монтировать extra intro, пока `unloadTirPixiGpu` не завершён (сейчас unload в effect по `targetPickOpen` — сделать явным await, без гонки effect vs broadcast).
2. Использовать **тот же** `dismissTirAndUnloadGpu()` из п.2 в `closeBoard`.
3. Дополнительно (желательно в том же проходе, если не раздувает PR):
   - лимит параллельных flip spine (1–2 одновременно);
   - не декодить полный 4K при каждом reload: либо keep downscaled park, либо гарантировать downscale до первого paint Stage E.
4. Не выгружать sticky SW (они нужны для FS) — только TIR-набор, как сейчас в `tirGpuMemory.ts`.

### Куда писать

1. `src/components/TargetShootOverlay.svelte` — `closeBoard`:  
   `await dismissTirAndUnloadGpu()` **перед** `freeSpinIntroShow` / `freeSpinIntroUpdate` mode:`extra`.

2. `src/game/tirGpuMemory.ts` / `EnableTirGpuMemory.svelte`  
   - Export awaitable unload (не только sync patch `loadedAssets`).  
   - Effect оставить как safety net; primary path — явный await из overlay.

3. `src/components/TargetFlipPixiLayer.svelte` + shoot overlay  
   - Опционально: очередь флипов (cap concurrency).

4. `phoneSpineAtlasDownscale.ts`  
   - Убедиться, что после `ensureTirPixiInApp` downscale вызывается **до** показа стрельбы (уже есть вызов в ensure path — проверить extra reload).

### Проверка п.3

- [ ] Stage E: после уезда тира вверх intro extra не стартует, пока TIR GPU unloaded (phone).
- [ ] Extra spins: повторный тир → снова unload → intro; нет вылета на стыке.
- [ ] Super + много sticky штор + Stage E: стрельба тяжелее, но после уезда тира память падает до intro.
- [ ] Регрессии анимации выстрелов / drum / awarded extra FS нет.

---

## Порядок внедрения (рекомендуемый)

| Шаг | Что | Зависимости |
|---|---|---|
| **A** | П.1 — полный release buy-bonus до TIR/duel + remount в base | можно сразу |
| **B** | Общий `dismissTirAndUnloadGpu()` | нужно для C и D |
| **C** | П.2 — входной тир → barrier → intro | после B |
| **D** | П.3 — Stage E `closeBoard` на тот же barrier (+ optional flip cap) | после B |

A параллельно с B. C и D — один PR или два мелких после helper.

---

## Критерий успеха прохода (п.1–3)

На реальном iPhone Safari (холодные заходы):

1. Buy → Normal / Super / Duel — нет вылета на confirm→облако→тир/duel.  
2. Первый тир уехал → intro → Tap to continue — стабильно.  
3. Конец FS → Stage E тир → extra intro — стабильно.  
4. После возврата в base buy-bonus снова открывается (после delay warm).  
5. DevTools/Instruments: после уезда тира нет роста/удержания TIR atlas page; в FS/Duel нет buy-bonus canvas.

---

## Чеклист перед merge

- [x] П.1 destroy синхронно/awaitable до feature GPU (`evictBuyBonusForFeature`)
- [x] П.1 remount только в base + delay (`clearBuyBonusFeatureEvictLock` на base theme / duel end)
- [x] П.2 и П.3 используют один dismiss+unload helper (`dismissTirAndUnloadGpu`)
- [x] Intro/extra intro только после unload TIR
- [x] Не сломан Continue-peak fix (§0)
- [x] Не выгружены SW curtains вместе с TIR
- [ ] Прогнаны: natural FS, buy normal, buy super, buy duel, Stage E extra, возврат в base + open buy-bonus
