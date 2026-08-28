# Background (задний фон)

Эталонная папка для сдачи animated street background — по той же схеме, что символы (`H1/`).

## Файлы

```
background/
├── background.json           # Spine skeleton
├── background.atlas          # Atlas (имена страниц = имена .webp)
├── background.webp           # Atlas page 1 (2048×2048)
├── background_2.webp         # Atlas page 2 (2048×2048)
├── background_3.webp         # Atlas page 3 (2048×1024)
└── background_static.webp    # Still fallback (1920×1080)
```

## Формат

- Все растры — **WebP**
- Spine 4.2 · JSON + atlas

## Анимация

- Idle loop: `idle_final_delay2` (или alias: `idle_final`, `idle`, `day_idle`, `loop`)

## Preview

В designer-docs → Documentation → **Background** → «Посмотреть пример фона».

Источник: экспорт из `cat_mafia` street background (переименован под конвенцию `background/*`).
