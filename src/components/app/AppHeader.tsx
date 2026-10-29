import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { ArchiveButton } from './ArchiveDialog'
import { ShareButton } from './ShareDialog'
import { StatusNotice } from './StatusNotice'
import { ToolbarButton } from './ToolbarButton'
import { shortcuts } from '#/lib/shortcuts'
import { sessionStore, setPanelOpen } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

/** Slim top bar: the tabs, then a fixed notice slot, share, archive and the panel toggle. */
export function AppHeader({ children }: { children?: React.ReactNode }) {
  const panelOpen = useSelector(sessionStore, (s) => s.panelOpen)
  const hasActive = useSelector(sessionStore, (s) => s.activeId !== null)

  return (
    <header className="flex h-12 shrink-0 items-center bg-foreground/5 shadow-[inset_0_-1px_var(--border)] md:h-10">
      <div className="flex min-w-0 flex-1 self-stretch">{children}</div>

      <StatusNotice />

      {hasActive && <ShareButton />}
      <ArchiveButton />
      <ToolbarButton
        label={m.action_toggle_panel()}
        shortcut={shortcuts.togglePanel}
        size="icon-sm"
        className="mx-1 hidden md:inline-flex"
        aria-pressed={panelOpen}
        onClick={() => setPanelOpen(!panelOpen)}
      >
        {panelOpen ? (
          <IconLayoutSidebarRightFilled />
        ) : (
          <IconLayoutSidebarRight />
        )}
      </ToolbarButton>
    </header>
  )
}
