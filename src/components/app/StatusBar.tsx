import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { CommandMenuButton } from './CommandMenu'
import { FormatButton, FormatOptions } from './FormatControls'
import { editorStore } from '#/components/editor/editor-store'
import {
  DefaultsButton,
  DefaultsRules,
} from '#/components/defaults/DefaultsControls'
import { HighlightsBar } from '#/components/highlights/HighlightsBar'
import { Button } from '#/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Separator } from '#/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { m } from '#/paraglide/messages'

/** Bottom bar: highlight chips on the left, editing tools and search on the right. */
export function StatusBar() {
  const fileId = useSelector(editorStore, (s) => s.fileId)

  return (
    <footer className="flex h-8 shrink-0 items-center gap-1 border-t px-1.5 text-[11px] whitespace-nowrap text-muted-foreground">
      {fileId && <HighlightsBar />}
      <div className="flex-1" />
      {fileId && (
        <>
          <div className="flex items-center text-foreground">
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
    </footer>
  )
}

function SettingsPopover() {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={m.editor_settings()}
            >
              <IconAdjustmentsHorizontal />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{m.editor_settings()}</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="end" className="w-96 gap-0 p-0">
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
