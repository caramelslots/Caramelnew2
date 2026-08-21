import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@esotericsoftware/spine-pixi-v8'
import { catalogSourceFromId } from './catalog/assetPaths'
import { SYMBOL_CATALOG } from './catalog/symbolCatalog'
import { AppShell } from './components/layout/AppShell'
import { MetricsPanel } from './components/metrics/MetricsPanel'
import { AnimationControls } from './components/symbols/AnimationControls'
import { SymbolInfoCard } from './components/symbols/SymbolInfoCard'
import { SymbolListPanel } from './components/symbols/SymbolListPanel'
import { CustomUploadPanel } from './components/upload/CustomUploadPanel'
import type { ValidatedUpload } from './components/upload/UploadValidation'
import { SpinePreviewStage } from './pixi/SpinePreviewStage'
import { defaultAnimationName } from './pixi/animationRoles'
import type {
  AnimationRole,
  AnimationRoleMap,
  PlaybackState,
  SpineAssetSource,
  SpineMetrics,
  SymbolListEntry,
  UploadedSymbol,
} from './types'

const INITIAL_ID = SYMBOL_CATALOG[0]?.id ?? null

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_ID)
  const [source, setSource] = useState<SpineAssetSource | null>(() =>
    INITIAL_ID ? catalogSourceFromId(INITIAL_ID) : null,
  )
  const [uploads, setUploads] = useState<UploadedSymbol[]>([])
  const uploadsRef = useRef(uploads)
  uploadsRef.current = uploads

  const [animationNames, setAnimationNames] = useState<string[]>([])
  const [roles, setRoles] = useState<AnimationRoleMap>({
    idle: null,
    bounce: null,
    win: null,
  })
  const [playback, setPlayback] = useState<PlaybackState>({
    animationName: null,
    loop: true,
    speed: 1,
    playNonce: 0,
  })
  const [metrics, setMetrics] = useState<SpineMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () => () => {
      for (const item of uploadsRef.current) {
        item.revoke()
      }
    },
    [],
  )

  const listEntries = useMemo<SymbolListEntry[]>(
    () => [
      ...SYMBOL_CATALOG.map((symbol) => ({
        id: symbol.id,
        label: symbol.label,
        meta: symbol.folder,
        kind: 'catalog' as const,
      })),
      ...uploads.map((item) => ({
        id: item.id,
        label: item.label,
        meta: 'upload',
        kind: 'upload' as const,
      })),
    ],
    [uploads],
  )

  const selectSymbol = (id: string) => {
    const catalog = catalogSourceFromId(id)
    if (catalog) {
      setSelectedId(id)
      setSource(catalog)
      setPlayback((prev) => ({ ...prev, animationName: null, playNonce: prev.playNonce + 1 }))
      setError(null)
      return
    }

    const uploaded = uploads.find((item) => item.id === id)
    if (!uploaded) return
    setSelectedId(uploaded.id)
    setSource(uploaded.source)
    setPlayback((prev) => ({ ...prev, animationName: null, playNonce: prev.playNonce + 1 }))
    setError(null)
  }

  const handleUpload = (payload: ValidatedUpload) => {
    const id = `upload-${Date.now()}`
    const sourceUpload: Extract<SpineAssetSource, { kind: 'upload' }> = {
      kind: 'upload',
      id,
      label: payload.label,
      skeletonUrl: payload.skeletonUrl,
      atlasUrl: payload.atlasUrl,
      textureUrl: payload.textureUrl,
      textureFileName: payload.textureFileName,
      atlasTextureName: payload.atlasTextureName,
    }

    const entry: UploadedSymbol = {
      id,
      label: payload.label,
      source: sourceUpload,
      revoke: payload.revoke,
    }

    setUploads((prev) => [...prev, entry])
    setSelectedId(id)
    setSource(sourceUpload)
    setPlayback((prev) => ({ ...prev, animationName: null, playNonce: prev.playNonce + 1 }))
    setError(null)
  }

  const handleAnimationsChange = useCallback((names: string[], nextRoles: AnimationRoleMap) => {
    setAnimationNames(names)
    setRoles(nextRoles)
    setPlayback((prev) => ({
      ...prev,
      animationName: defaultAnimationName(nextRoles, names),
      playNonce: prev.playNonce + 1,
    }))
  }, [])

  const playClip = (animationName: string) => {
    setPlayback((prev) => ({
      ...prev,
      animationName,
      playNonce: prev.playNonce + 1,
    }))
  }

  const customActive = source?.kind === 'upload'

  return (
    <AppShell
      left={
        <>
          <SymbolListPanel
            entries={listEntries}
            selectedId={selectedId}
            onSelect={selectSymbol}
          />
          <CustomUploadPanel onUpload={handleUpload} />
        </>
      }
      center={
        <div className="stage-frame">
          <div className="stage-frame__bar">
            <span>{loading ? 'Loading…' : source ? 'Live preview' : 'No symbol'}</span>
            {customActive ? <span className="chip">Custom</span> : null}
          </div>
          <SpinePreviewStage
            playback={playback}
            source={source}
            onAnimationsChange={handleAnimationsChange}
            onError={setError}
            onLoadingChange={setLoading}
            onMetricsChange={setMetrics}
          />
        </div>
      }
      right={
        <>
          <SymbolInfoCard error={error} source={source} />
          <AnimationControls
            activeAnimation={playback.animationName}
            animationNames={animationNames}
            disabled={loading || !source || Boolean(error)}
            loop={playback.loop}
            roles={roles}
            speed={playback.speed}
            onLoopChange={(loop) => setPlayback((prev) => ({ ...prev, loop }))}
            onPlayRole={(role: AnimationRole) => {
              const clip = roles[role]
              if (!clip) return
              playClip(clip)
            }}
            onSelectAnimation={playClip}
            onSpeedChange={(speed) => setPlayback((prev) => ({ ...prev, speed }))}
          />
          <MetricsPanel loading={loading} metrics={metrics} />
        </>
      }
    />
  )
}
