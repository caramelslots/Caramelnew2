import type { ReactNode } from 'react'
import { DesignerGuideAccordion } from '../docs/DesignerGuideAccordion'

export type WorkspaceMode = 'symbol' | 'reel'

type AppShellProps = {
  mode: WorkspaceMode
  onModeChange: (mode: WorkspaceMode) => void
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

export function AppShell({ mode, onModeChange, left, center, right }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Caramel · Designer Docs</p>
          <h1>Symbol & Reel Lab</h1>
        </div>
        <p className="app-header__note">
          Загрузите ассеты и проверьте вид в слоте: превью клипа, барабан, device и
          качество.
        </p>
      </header>

      <DesignerGuideAccordion />

      <div className="workspace-tabs" role="tablist" aria-label="Workspace">
        <button
          aria-selected={mode === 'symbol'}
          className={mode === 'symbol' ? 'workspace-tab is-active' : 'workspace-tab'}
          role="tab"
          type="button"
          onClick={() => onModeChange('symbol')}
        >
          Symbol Preview
        </button>
        <button
          aria-selected={mode === 'reel'}
          className={mode === 'reel' ? 'workspace-tab is-active' : 'workspace-tab'}
          role="tab"
          type="button"
          onClick={() => onModeChange('reel')}
        >
          Reel Lab
        </button>
      </div>

      <div className="workspace">
        <aside className="rail rail--left" aria-label="Library">
          {left}
        </aside>
        <main className="stage" aria-label={mode === 'reel' ? 'Reel Lab' : 'Symbol stage'}>
          {center}
        </main>
        <aside className="rail rail--right" aria-label="Inspect">
          {right}
        </aside>
      </div>
    </div>
  )
}
