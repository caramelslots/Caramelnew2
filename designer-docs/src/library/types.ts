import { STATIC_SPRITE_SPEC, SYMBOL_TEXTURE_NATIVE_PX } from '../catalog/symbolSpecs'
import type { AnimationRoleMap } from '../types'

export type LibraryReadiness = 'ready' | 'partial' | 'blocked'

export type StaticSpriteInfo = {
  url: string
  fileName: string
  width: number
  height: number
  format: string
  approxBytes: number
}

export type LibrarySymbolStatus = {
  readiness: LibraryReadiness
  spineOk: boolean
  staticOk: boolean
  sizeOk: boolean
  formatOk: boolean
  warnings: string[]
}

export type LibrarySymbol = {
  id: string
  label: string
  kind: 'catalog' | 'upload'
  /** Spine pack for idle / land / win. */
  spine: {
    skeletonUrl: string
    atlasUrl: string
    textureUrl: string
    textureFileName: string
    atlasTextureName?: string
  }
  /** Reel static sprite (required for reel-ready). */
  staticSprite: StaticSpriteInfo | null
  /** Filled after first Spine load in preview. */
  roles: AnimationRoleMap | null
  animationNames: string[]
  status: LibrarySymbolStatus
  thumbUrl: string | null
  revoke: () => void
}

export function computeLibraryStatus(args: {
  hasSpine: boolean
  staticSprite: StaticSpriteInfo | null
  roles?: AnimationRoleMap | null
}): LibrarySymbolStatus {
  const warnings: string[] = []
  const spineOk = args.hasSpine
  if (!spineOk) warnings.push('Нет Spine-пакета (.json + .atlas + текстура).')

  const staticSprite = args.staticSprite
  const staticOk = Boolean(staticSprite)
  if (!staticOk) {
    warnings.push('Нет static-спрайта для барабана (нужен отдельный WebP).')
  }

  let formatOk = true
  let sizeOk = true
  if (staticSprite) {
    formatOk = staticSprite.format === STATIC_SPRITE_SPEC.format
    if (!formatOk) {
      warnings.push(
        `Static формат «${staticSprite.format}» — нужен ${STATIC_SPRITE_SPEC.format}.`,
      )
    }
    sizeOk =
      staticSprite.width === SYMBOL_TEXTURE_NATIVE_PX &&
      staticSprite.height === SYMBOL_TEXTURE_NATIVE_PX
    if (!sizeOk) {
      warnings.push(
        `Static ${staticSprite.width}×${staticSprite.height} — идеал ${SYMBOL_TEXTURE_NATIVE_PX}×${SYMBOL_TEXTURE_NATIVE_PX}.`,
      )
    }
  }

  if (args.roles) {
    if (!args.roles.idle) warnings.push('Нет клипа idle.')
    if (!args.roles.bounce) warnings.push('Нет клипа stop/bounce (посадка).')
    if (!args.roles.win) warnings.push('Нет клипа win/activation.')
  }

  let readiness: LibraryReadiness = 'blocked'
  if (spineOk && staticOk) {
    readiness = formatOk && sizeOk ? 'ready' : 'partial'
  } else if (spineOk || staticOk) {
    readiness = 'partial'
  }

  return {
    readiness,
    spineOk,
    staticOk,
    sizeOk: staticOk ? sizeOk : false,
    formatOk: staticOk ? formatOk : false,
    warnings,
  }
}

export function readinessLabel(readiness: LibraryReadiness): string {
  switch (readiness) {
    case 'ready':
      return 'Ready'
    case 'partial':
      return 'Partial'
    case 'blocked':
      return 'Blocked'
  }
}
