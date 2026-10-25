import { IconMoon, IconSun } from '@tabler/icons-react'

import { ToolbarButton } from './ToolbarButton'
import { toggleTheme } from '#/lib/theme'
import { m } from '#/paraglide/messages'

/** Switches between light and dark. Both icons render so SSR needs no theme. */
export function ThemeToggle() {
  return (
    <ToolbarButton label={m.theme_toggle()} onClick={toggleTheme}>
      <IconMoon className="dark:hidden" />
      <IconSun className="hidden dark:block" />
    </ToolbarButton>
  )
}
