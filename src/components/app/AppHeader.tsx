import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { LogoButton } from './CommandMenu'
import { ToolbarButton } from './ToolbarButton'
import { sessionStore, setPanelOpen } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

/** Slim top bar: the logo opens the command menu, then the tabs, then the panel toggle. */
export function AppHeader({ children }: { children?: React.ReactNode }) {
  const panelOpen = useSelector(sessionStore, (s) => s.panelOpen)

  return (
    <header className="flex h-9 shrink-0 items-center border-b">
      <LogoButton />

      <div className="flex min-w-0 flex-1 self-stretch border-x">
        {children}
      </div>

      <ToolbarButton
        label={m.action_toggle_panel()}
        size="icon-sm"
        className="mx-1"
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
