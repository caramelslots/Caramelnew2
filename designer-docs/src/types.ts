export type AnimationRole = 'idle' | 'bounce' | 'win'

export type SymbolFiles = {
  skeleton: string
  atlas: string
  texture: string
}

export type CatalogSymbol = {
  id: string
  label: string
  folder: string
  files: SymbolFiles
}

export type SpineAssetSource =
  | {
      kind: 'catalog'
      symbolId: string
      skeletonUrl: string
      atlasUrl: string
      textureUrl: string
      textureFileName: string
    }
  | {
      kind: 'upload'
      id: string
      label: string
      skeletonUrl: string
      atlasUrl: string
      textureUrl: string
      textureFileName: string
      atlasTextureName: string
    }

export type AnimationRoleMap = Record<AnimationRole, string | null>

export type SpineMetrics = {
  animationName: string | null
  durationSec: number
  framesAt30: number
  framesAt60: number
  timelineKeys: number
  boneCount: number
  slotCount: number
  attachmentCount: number
  atlasRegionCount: number
  textureWidth: number
  textureHeight: number
  textureApproxBytes: number
  textureFormat: string
  warnings: string[]
}

export type PlaybackState = {
  animationName: string | null
  loop: boolean
  speed: number
  /** Bumps on each play request so re-clicking the same clip restarts it. */
  playNonce: number
}

export type UploadedSymbol = {
  id: string
  label: string
  source: Extract<SpineAssetSource, { kind: 'upload' }>
  revoke: () => void
}

export type SymbolListEntry = {
  id: string
  label: string
  meta: string
  kind: 'catalog' | 'upload'
}

