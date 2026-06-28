# Social mode — замена текстов (Wok Fury / `daloniil_test`)

Документ для согласования перед реализацией.

## Как работает режим

- Stake передаёт в URL: `?social=true` (на stake.us всегда так).
- В коде: `stateUrlDerived.social()` из `state-shared`.
- При `social=true` показываем **social-тексты**, иначе — текущие (real-money).
- **Math, RGS, логика игры, ассеты не меняются.**

### Проверка локально

```
http://localhost:3007/?social=true&demo=true
```

---

## Что Stake требует явно (из SDK docs)

| Real money | Social mode | Где используется |
|---|---|---|
| BET | **SPIN** | HUD, buy menu, SDK |
| BUY BONUS | **PLAY BONUS** | SDK (если вызвать `i18nDerived.buyBonus()`) |

Источник: `packages/components-ui-pixi/src/i18n/i18nDerived.ts`

---

## Баг, который нужно исправить при реализации

В `src/i18n/i18nDerived.ts` spread из `components-ui-html` **перезаписывает** social-aware `bet()` из pixi.  
Сейчас HUD всегда показывает «BET», даже при `social=true`.

---

## Таблица замен — HUD и кнопки

| Ключ / функция | Сейчас (EN) | Предложение social (EN) | Где в UI | Статус |
|---|---|---|---|---|
| `bet()` (SDK) | BET | **SPIN** | `CashStacksDesktopHudOverlay`, `CashStacksPortraitHudOverlay`, `BuyBonusOverlay` | ☐ |
| `win()` (SDK) | WIN | **PRIZE** | `UiCashStacksLayout`, `UiCashStacksPortraitLayout` | ☐ |
| `buyBonus()` (SDK) | BUY BONUS | **PLAY BONUS** | не используется напрямую | ☐ |
| `BUY_BONUS_PANEL_BUTTON` | Buy bonus | **Play bonus** | `CashStacksBuyBonusPanel` | ☐ |
| `BUY_CONFIRM` | BUY | **PLAY** | `BuyBonusOverlay`, `BuyBonusConfirmOverlay` | ☐ |
| `BUY_BONUS_TITLE` | BUY FEATURE | **PLAY FEATURE** | зарезервировано в i18n (пока не в UI) | ☐ |
| `AUTO_BET` | Autobet | **Autoplay** | зарезервировано в i18n | ☐ |
| `MAX_WIN` | MAX WIN | **MAX PRIZE** | зарезервировано в i18n | ☐ |

---

## Таблица замен — Autoplay overlay

| Ключ | Сейчас (EN) | Предложение social (EN) | Где | Статус |
|---|---|---|---|---|
| `AUTOPLAY_MSG_INSUFFICIENT_FUNDS_BODY` | Top up your balance or decrease the bet to continue the game. | Top up your balance or **lower the spin amount** to continue the game. | `AutoplayMessageOverlay` | ☐ |
| `AUTOPLAY_MSG_LOSS_LIMIT_TITLE` | Loss limit reached | **Stop limit reached** | `AutoplayMessageOverlay` | ☐ |
| `AUTOPLAY_MSG_LOSS_LIMIT_BODY` | Auto play has stopped because the loss limit was reached. | Autoplay has stopped because the **stop limit** was reached. | `AutoplayMessageOverlay` | ☐ |
| `AUTOPLAY_MSG_SINGLE_WIN_LIMIT_TITLE` | Single win limit reached | **Single prize limit reached** | `AutoplayMessageOverlay` | ☐ |
| `AUTOPLAY_MSG_SINGLE_WIN_LIMIT_BODY` | Auto play has stopped because the single win limit was reached. | Autoplay has stopped because the **single prize limit** was reached. | `AutoplayMessageOverlay` | ☐ |

---

## Таблица замен — Game rules (`ModalGameRules`)

| Ключ | Сейчас (EN) | Предложение social (EN) | Статус |
|---|---|---|---|
| `GAME_INFO_ABOUT_BODY` | …Wins are paid… Only the highest **win** per line is paid. | …**Prizes are awarded**… Only the highest **prize** per line is awarded. | ☐ |
| `GAME_INFO_PAYLINES_NOTE` | …**Wins** are paid from left to right… | …**Prizes** are awarded from left to right… | ☐ |
| `GAME_INFO_WILD_BODY` | …Wild pays 225× **bet** for 5 of a kind. | …Wild pays 225× **spin** for 5 of a kind. | ☐ |
| `GAME_INFO_BET_MODES_TITLE` | BET MODES | **PLAY MODES** | ☐ |
| `GAME_INFO_BET_MODES_BODY` | Base mode RTP is 96.01%. Bonus Boost costs 2× the **bet**… **Buy** Normal Bonus costs 100× the **bet**. **Buy** Super Bonus costs 200× the **bet**. Maximum **win** is 2,500× the **bet** in every **bet mode**. | Base mode RTP is 96.01%. Bonus Boost costs 2× the **spin**… **Play** Normal Bonus costs 100× the **spin**. **Play** Super Bonus costs 200× the **spin**. Maximum **prize** is 2,500× the **spin** in every **play mode**. | ☐ |
| `GAME_INFO_PAYTABLE_TITLE` | PAYTABLE (× BET) | **PAYTABLE (× SPIN)** | ☐ |
| `GAME_INFO_PAYTABLE_NOTE` | All payout values are multiples of the total **bet**. | All payout values are multiples of the total **spin**. | ☐ |
| `GAME_INFO_LEGAL_BODY` | Malfunction voids all **wins** and plays. … **Winnings** are settled… | Malfunction voids all **prizes** and plays. … **Rewards** are settled… | ☐ |

### Полные social-версии длинных текстов (EN) — для проверки

**GAME_INFO_ABOUT_BODY**
```
Wok Fury is a 5-reel, 5-row slot with 25 paylines. Prizes are awarded from left to right on adjacent reels, starting from the leftmost reel. Only the highest prize per line is awarded.
```

**GAME_INFO_PAYLINES_NOTE**
```
All 25 paylines are always active. Prizes are awarded from left to right on adjacent reels, starting from the leftmost reel.
```

**GAME_INFO_WILD_BODY**
```
The Wild symbol substitutes for all paying symbols except the Bonus symbol. Wild pays 225× spin for 5 of a kind.
```

**GAME_INFO_BET_MODES_BODY**
```
Base mode RTP is 96.01%. Bonus Boost costs 2× the spin and increases the chance of triggering free spins. Special Spins costs 30× the spin. Play Normal Bonus costs 100× the spin. Play Super Bonus costs 200× the spin. Maximum prize is 2,500× the spin in every play mode.
```

**GAME_INFO_LEGAL_BODY**
```
Malfunction voids all prizes and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Rewards are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Stake Engine.
```

---

## Таблица замен — SDK shared UI (`ui-translations.mjs`)

Файл: `scripts/i18n/data/ui-translations.mjs`  
Используется для ключей pixi/html (`BET`, `WIN`, `BUY BONUS` и т.д.).

| Ключ | Сейчас (EN) | Предложение social (EN) | Статус |
|---|---|---|---|
| BET | BET | **SPIN** | ☐ |
| WIN | WIN | **PRIZE** | ☐ |
| BUY BONUS | BUY BONUS | **PLAY BONUS** | ☐ |
| BET MENU | BET MENU | **SPIN MENU** | ☐ |
| SELECT YOUR BET | SELECT YOUR BET | **SELECT YOUR SPIN** | ☐ |
| SINGLE WIN LIMIT | SINGLE WIN LIMIT | **SINGLE PRIZE LIMIT** | ☐ |
| LOSS LIMIT | LOSS LIMIT | **STOP LIMIT** | ☐ |
| INSUFFICIENT FUNDS TO PLACE THIS BET… | …PLACE THIS BET…LOWER THE BET LEVEL. | …**CONTINUE PLAYING**…**LOWER THE SPIN AMOUNT**. | ☐ |
| LOSS LIMIT REACHED | LOSS LIMIT REACHED | **STOP LIMIT REACHED** | ☐ |
| SINGLE WIN LIMIT REACHED | SINGLE WIN LIMIT REACHED | **SINGLE PRIZE LIMIT REACHED** | ☐ |

> Эти ключи из `components-ui-html` сейчас почти не видны в кастомном UI, но лучше покрыть для полноты.

---

## Hardcoded строки (не через i18n)

| Файл | Сейчас | Предложение social | Статус |
|---|---|---|---|
| `CashStacksDesktopHudOverlay.svelte` | `aria-label="decrease bet"` | `decrease spin` | ☐ |
| `CashStacksDesktopHudOverlay.svelte` | `aria-label="increase bet"` | `increase spin` | ☐ |
| `CashStacksPortraitHudOverlay.svelte` | `aria-label="decrease bet"` | `decrease spin` | ☐ |
| `CashStacksPortraitHudOverlay.svelte` | `aria-label="increase bet"` | `increase spin` | ☐ |
| `BuyBonusOverlay.svelte` | `aria-label="decrease bet"` | `decrease spin` | ☐ |
| `BuyBonusOverlay.svelte` | `aria-label="increase bet"` | `increase spin` | ☐ |

---

## Что **не** меняем

| Элемент | Причина |
|---|---|
| `FREE SPINS`, `BONUS`, `WILD`, `RTP`, `BALANCE` | Не gambling-термины в контексте Stake social |
| Loader cards (`LOADER_CARD_*`) | Нет bet/buy/win |
| `PER_SPIN_SUFFIX` / «per spin» | Уже social-safe |
| `stateBet`, event `'bet'`, xstate | Внутренний API, не UI |
| Math / RGS / books | Не относится к social UI |
| Валюты XGC → GC, XSC → SC | Уже в `utils-shared/amount.ts` |

---

## Как будем реализовать (после вашего OK)

1. **`src/i18n/i18nDerived.ts`** — helper `isSocial()`, social-ветки для всех кастомных функций; переопределить `bet()` после spread.
2. **`scripts/i18n/data/game/en.mjs`** — добавить параллельные ключи `*_SOCIAL` **или** держать social-тексты только в `i18nDerived` (для EN достаточно второго варианта).
3. **16 языков** — для social: либо отдельные `*_SOCIAL` ключи в `.mjs` + regenerate, либо social-only для EN + fallback на EN social для остальных на первом этапе.
4. **aria-labels** — через i18n или inline `stateUrlDerived.social()`.
5. **Проверка** — прогон с `?social=true` по HUD → buy bonus → autoplay → game info.

---

## Чеклист перед сдачей на Stake

- [ ] HUD: нет «BET», «WIN»
- [ ] Buy bonus: нет «BUY», «Buy bonus»
- [ ] Autoplay messages: нет «bet», «loss», «win limit»
- [ ] Game rules: нет «bet», «buy», «win», «winnings»
- [ ] aria-labels: нет «bet»
- [ ] Без `?social=true` — всё как сейчас (real-money тексты)

---

## Вопросы на согласование

1. **WIN → PRIZE** — ок, или предпочитаете другой вариант (AWARD, PAYOUT)?
2. **LOSS LIMIT → STOP LIMIT** — ок, или **PLAY LIMIT**?
3. **Social-тексты для 16 языков** — переводим все сразу или сначала только EN?
4. Строки в таблицах выше — подтвердите галочками / правки в «Предложение social».

После вашего OK переходим к реализации.
