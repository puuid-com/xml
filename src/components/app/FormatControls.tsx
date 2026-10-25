import { IconChevronDown, IconWand } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { formatActive } from '#/components/editor/actions'
import { Button } from '#/components/ui/button'
import { ButtonGroup } from '#/components/ui/button-group'
import { Kbd, KbdGroup } from '#/components/ui/kbd'
import { Label } from '#/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import {
  formatSettingsStore,
  setFormatSetting,
} from '#/lib/store/format-settings'
import { alt, mod } from '#/lib/platform'
import { m } from '#/paraglide/messages'
import type { SortOrder } from '#/lib/xml/format'

/** "Format" in the bottom bar, with a popover for the format settings. */
export function FormatControls() {
  const settings = useSelector(formatSettingsStore, (s) => s)

  return (
    <ButtonGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="xs" onClick={formatActive}>
            <IconWand />
            <span className="hidden md:inline">{m.action_format()}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <KbdGroup>
            <Kbd>⇧</Kbd>
            <Kbd>{alt}</Kbd>
            <Kbd>F</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={m.format_options()}
          >
            <IconChevronDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-72 gap-0 p-0">
          <PopoverHeader className="px-3 py-2.5">
            <PopoverTitle>{m.format_options()}</PopoverTitle>
          </PopoverHeader>
          <Separator />
          <div className="flex flex-col py-1">
            <SettingSwitch
              id="format-on-save"
              checked={settings.formatOnSave}
              onCheckedChange={(v) => setFormatSetting('formatOnSave', v)}
            >
              {m.format_on_save()}
              <KbdGroup>
                <Kbd>{mod}</Kbd>
                <Kbd>S</Kbd>
              </KbdGroup>
            </SettingSwitch>
            <SettingSwitch
              id="format-remove-empty-lines"
              checked={settings.removeEmptyLines}
              onCheckedChange={(v) => setFormatSetting('removeEmptyLines', v)}
            >
              {m.format_remove_empty_lines()}
            </SettingSwitch>
            <SettingSwitch
              id="format-trim-vars"
              checked={settings.trimVars}
              onCheckedChange={(v) => setFormatSetting('trimVars', v)}
            >
              {m.format_trim_vars()}
            </SettingSwitch>
            <SettingSwitch
              id="format-highlighted-first"
              checked={settings.highlightedFirst}
              onCheckedChange={(v) => setFormatSetting('highlightedFirst', v)}
            >
              {m.format_highlighted_first()}
            </SettingSwitch>
          </div>
          <Separator />
          <div className="flex flex-col gap-2 px-3 py-2.5">
            <span className="text-muted-foreground">{m.format_sort()}</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full"
              value={settings.sort}
              onValueChange={(v) => {
                if (v) setFormatSetting('sort', v as SortOrder)
              }}
            >
              <ToggleGroupItem value="none" className="flex-1">
                {m.format_sort_none()}
              </ToggleGroupItem>
              <ToggleGroupItem value="asc" className="flex-1">
                {m.format_sort_asc()}
              </ToggleGroupItem>
              <ToggleGroupItem value="desc" className="flex-1">
                {m.format_sort_desc()}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  )
}

function SettingSwitch({
  id,
  checked,
  onCheckedChange,
  children,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Label
      htmlFor={id}
      className="justify-between gap-4 px-3 py-2 leading-normal hover:bg-muted"
    >
      <span className="flex items-center gap-2">{children}</span>
      <Switch
        id={id}
        size="sm"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </Label>
  )
}
