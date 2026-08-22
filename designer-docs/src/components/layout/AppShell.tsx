import type { ReactNode } from 'react'
import { DesignerGuideAccordion } from '../docs/DesignerGuideAccordion'

type AppShellProps = {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

export function AppShell({ left, center, right }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Caramel · Designer Docs</p>
          <h1>Symbol Preview</h1>
        </div>
        <p className="app-header__note">
          Pixi + Spine 4.2 preview for catalog symbols and local uploads
        </p>
      </header>

      <DesignerGuideAccordion />

      <div className="workspace">
        <aside className="rail rail--left">{left}</aside>
        <main className="stage">{center}</main>
        <aside className="rail rail--right">{right}</aside>
      </div>
    </div>
  )
}
