import type { ReactNode } from 'react'
import type { AppTheme } from '../../theme/useTheme'

export type WorkspaceMode = 'docs' | 'symbol' | 'reel'

type AppShellProps = {
  mode: WorkspaceMode
  theme: AppTheme
  onModeChange: (mode: WorkspaceMode) => void
  onToggleTheme: () => void
  docs: ReactNode
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

export function AppShell({
  mode,
  theme,
  onModeChange,
  onToggleTheme,
  docs,
  left,
  center,
  right,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Caramel · Designer Docs</p>
          <h1>Symbol & Reel Lab</h1>
        </div>
        <div className="app-header__controls">
          <nav className="workspace-tabs" role="tablist" aria-label="Workspace">
            <button
              aria-selected={mode === 'docs'}
              className={mode === 'docs' ? 'workspace-tab is-active' : 'workspace-tab'}
              role="tab"
              type="button"
              onClick={() => onModeChange('docs')}
            >
              Docs
            </button>
            <button
              aria-selected={mode === 'symbol'}
              className={mode === 'symbol' ? 'workspace-tab is-active' : 'workspace-tab'}
              role="tab"
              type="button"
              onClick={() => onModeChange('symbol')}
            >
              Symbol
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
          </nav>
          <button
            aria-pressed={theme === 'dark'}
            className="theme-toggle"
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            type="button"
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      {mode === 'docs' ? (
        <div className="docs-pane">{docs}</div>
      ) : (
        <div className={mode === 'reel' ? 'workspace workspace--reel' : 'workspace'}>
          <aside className="rail rail--left" aria-label="Library">
            {left}
          </aside>
          <main
            className="stage"
            aria-label={mode === 'reel' ? 'Reel Lab' : 'Symbol stage'}
          >
            {center}
          </main>
          <aside className="rail rail--right" aria-label="Inspect">
            {right}
          </aside>
        </div>
      )}
    </div>
  )
}
