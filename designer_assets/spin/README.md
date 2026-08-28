# Spin (кнопка спина)

Эталонная папка для сдачи spin HUD — Spine press + две static WebP.

## Структура

```
spin/
├── spin_button.json      # Spine skeleton (bounds 950×950)
├── spin_button.atlas     # Atlas — страница spin_button.webp
├── spin_button.webp      # Текстура атласа (2048×1024)
├── spin_1.webp           # Static — обычный спин (950×950)
├── spin_2.webp           # Static — автоигра со счётчиком (1000×1000, legacy)
└── README.md
```

## Формат

- Все растры — **WebP**
- Spine 4.2 · JSON + atlas
- Skeleton bounds: **950×950** (центр 0,0; x/y от −475)

## Анимация

- Press (one-shot): **`animation`** — вращение стрелок + glow при нажатии
- В HTML HUD обычный спин рендерится **только через Spine**, не через `spin_1.webp`

## Две статики

| Файл | Размер | Где в cat_mafia |
|------|--------|-----------------|
| `spin_1.webp` | 950×950 | Pixi fallback, game info; still того же bounds, что Spine |
| `spin_2.webp` | 1000×1000 | Автоигра с счётчиком раундов (`SpinHudButton` hasCounter) |

На экране кнопка ≈ **162–172 CSS px** — это layout, не размер исходника.

## Размеры: art vs экран

| | Значение |
|--|----------|
| **На экране (cat_mafia)** | Desktop **162 CSS px**, portrait **172 CSS px** |
| **Art bounds (Spine / spin_1)** | **950×950** — холст с glow / halo + запас под press (scale ~1.1) |
| **Минимум sharp 2× (opaque core)** | ~**368×368** — только «металл» без широкого glow |
| **spin_2 (автоигра)** | **1000×1000** — legacy, лучше привести к 950×950 |

950² **не обязателен как UI-размер** — это текущий экспорт с большим glow. Можно уменьшить static до ~368–400², если убрать широкий halo, но Spine press всё равно нуждается в bounds ≥ visible кнопки + анимация стрелок.

## Деплой в игру

После сдачи файлы копируются в:

- Spine → `cat_mafia/static/assets/spines/spinButton/`
- Static → `cat_mafia/static/assets/sprites/ui/spin/`

Источник: экспорт `spin_button_new` + UI sprites из cat_mafia.
