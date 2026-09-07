# Designer Docs — Symbol Preview

React + PixiJS + Spine tool for reviewing slot symbol exports.

## Setup

```bash
cd designer-docs
pnpm install
pnpm dev
```

Opens at [http://localhost:3010](http://localhost:3010).

## What it does

- Lists catalog symbols from [`../designer_assets`](../designer_assets)
- Previews Spine skeletons in a Pixi canvas
- Plays role-mapped clips: **Idle** (`idle`), **Bounce** (`bounce` / `stop`), **Win** (`win` / `activation`)
- Shows duration, estimated frames @30/60fps, bones/slots, atlas regions, texture size
- Lets designers upload their own `.json` + `.atlas` + texture and preview locally (no upload server)

## Add a catalog symbol

1. Put files in `designer_assets/<name>/`:
   - `<name>.json`
   - `<name>.atlas`
   - `<name>.webp` (or `.png`)
2. Add an entry in [`src/catalog/symbolCatalog.ts`](src/catalog/symbolCatalog.ts)

## Stack

- React 19 + Vite 8 + TypeScript
- `pixi.js@8.8.1`
- `@esotericsoftware/spine-pixi-v8@4.2.74` (Spine 4.2, matches game apps)
