import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { LogoButton } from './CommandMenu'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
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

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="mx-1"
            aria-pressed={panelOpen}
            aria-label={m.action_toggle_panel()}
            onClick={() => setPanelOpen(!panelOpen)}
          >
            {panelOpen ? (
              <IconLayoutSidebarRightFilled />
            ) : (
              <IconLayoutSidebarRight />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{m.action_toggle_panel()}</TooltipContent>
      </Tooltip>
    </header>
  )
}
