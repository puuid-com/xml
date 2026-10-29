import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'

import { ActionBar } from './ActionBar'
import { CommandMenuButton } from './CommandMenu'
import { FormatOptions } from './FormatControls'
import { ThemeToggle } from './ThemeToggle'
import { editorStore } from '#/components/editor/editor-store'
import { DefaultsRules } from '#/components/defaults/DefaultsControls'
import { HighlightsBar } from '#/components/highlights/HighlightsBar'
import { VariablesList } from '#/components/variables/VariablesControls'
import { ProfilesPanel } from '#/components/profiles/ProfilesPanel'
import { ProfileTag } from '#/components/profiles/ProfileTag'
import { Button } from '#/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Separator } from '#/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useActiveProfile } from '#/hooks/use-profiles'
import { appVersion } from '#/lib/version'
import { m } from '#/paraglide/messages'

/** Bottom bar: highlight chips on the left; the file's setup and actions, search, the theme toggle and the app version on the right. */
export function StatusBar() {
  const fileId = useSelector(editorStore, (s) => s.fileId)

  return (
    <footer className="flex h-12 shrink-0 items-center gap-1 border-t px-1.5 text-[11px] whitespace-nowrap text-muted-foreground md:h-8">
      {fileId && <HighlightsBar />}
      <div className="flex-1" />
      {fileId && (
        <>
          <ActionBar />
          <SettingsPopover />
          <Separator
            orientation="vertical"
            className="mx-1 data-vertical:h-4 data-vertical:self-center"
          />
        </>
      )}
      <CommandMenuButton />
      <ThemeToggle />
      <Button
        asChild
        variant="ghost"
        size="xs"
        className="px-1.5 font-mono text-[11px] font-normal tabular-nums max-md:hidden"
      >
        <Link
          to="/changelog"
          aria-label={m.app_version_label({ version: appVersion })}
        >
          {m.app_version({ version: appVersion })}
        </Link>
      </Button>
    </footer>
  )
}

function SettingsPopover() {
  const profile = useActiveProfile()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="gap-1 px-1.5 text-[11px] font-normal text-foreground max-md:h-11"
        >
          <IconAdjustmentsHorizontal />
          {m.editor_settings()}
        </Button>
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
            <TabsTrigger value="variables" className="flex-none px-2">
              {m.variables_tab()}
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex-none px-2">
              {m.profiles_title()}
            </TabsTrigger>
          </TabsList>
          <Separator />
          <TabsContent value="format">
            <FormatOptions />
          </TabsContent>
          <TabsContent value="defaults">
            <DefaultsRules />
          </TabsContent>
          <TabsContent value="variables">
            <VariablesList />
          </TabsContent>
          <TabsContent value="profiles">
            <ProfilesPanel />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
