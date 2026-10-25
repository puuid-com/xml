import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { CommandMenuButton } from './CommandMenu'
import { FormatButton, FormatOptions } from './FormatControls'
import { noticeStore } from './notice-store'
import { StatusNotice } from './StatusNotice'
import { ThemeToggle } from './ThemeToggle'
import { ToolbarButton } from './ToolbarButton'
import { editorStore } from '#/components/editor/editor-store'
import {
  DefaultsButton,
  DefaultsRules,
} from '#/components/defaults/DefaultsControls'
import { HighlightsBar } from '#/components/highlights/HighlightsBar'
import { ProfileMenu } from '#/components/profiles/ProfileMenu'
import { ProfileTag } from '#/components/profiles/ProfileTag'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Separator } from '#/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useActiveProfile } from '#/hooks/use-profiles'
import { m } from '#/paraglide/messages'

/** Bottom bar: notices and highlight chips on the left, editing tools, search and the theme toggle on the right. */
export function StatusBar() {
  const fileId = useSelector(editorStore, (s) => s.fileId)
  const hasNotice = useSelector(noticeStore, (n) => n !== null)

  return (
    <footer className="flex h-12 shrink-0 items-center gap-1 border-t px-1.5 text-[11px] whitespace-nowrap text-muted-foreground md:h-8">
      <StatusNotice />
      {fileId && hasNotice && (
        <Separator
          orientation="vertical"
          className="mx-1 data-vertical:h-4 data-vertical:self-center"
        />
      )}
      {fileId && <HighlightsBar />}
      <div className="flex-1" />
      {fileId && (
        <>
          <div className="flex items-center text-foreground">
            <ProfileMenu />
            <FormatButton />
            <DefaultsButton />
            <SettingsPopover />
          </div>
          <Separator
            orientation="vertical"
            className="mx-1 data-vertical:h-4 data-vertical:self-center"
          />
        </>
      )}
      <CommandMenuButton />
      <ThemeToggle />
    </footer>
  )
}

function SettingsPopover() {
  const profile = useActiveProfile()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton label={m.editor_settings()}>
          <IconAdjustmentsHorizontal />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-96 max-w-[calc(100vw-1rem)] gap-0 p-0"
      >
        {profile && (
          <div className="flex items-center justify-between gap-4 border-b px-3 py-2 text-muted-foreground">
            {m.profile_settings_scope()}
            <ProfileTag profile={profile} />
          </div>
        )}
        <Tabs defaultValue="format" className="gap-0">
          <TabsList variant="line" className="w-full justify-start px-2">
            <TabsTrigger value="format" className="flex-none px-2">
              {m.action_format()}
            </TabsTrigger>
            <TabsTrigger value="defaults" className="flex-none px-2">
              {m.defaults_tab()}
            </TabsTrigger>
          </TabsList>
          <Separator />
          <TabsContent value="format">
            <FormatOptions />
          </TabsContent>
          <TabsContent value="defaults">
            <DefaultsRules />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
