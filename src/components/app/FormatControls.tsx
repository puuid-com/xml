import { ShortcutKeys } from './ShortcutKeys'
import { SortOrderEditor } from './SortOrderEditor'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { shortcuts } from '#/lib/shortcuts'
import { useFormatSettings } from '#/hooks/use-profiles'
import { setFormatSetting } from '#/lib/store/profiles'
import { m } from '#/paraglide/messages'
import type { SortOrder } from '#/lib/xml/format'

const SHORTEN_AT = [80, 200, 500, 1000]

/** Format settings, shown in the bottom bar's settings popover. */
export function FormatOptions() {
  const settings = useFormatSettings()

  return (
    <>
      <div className="flex flex-col py-1">
        <SettingSwitch
          id="format-on-save"
          checked={settings.formatOnSave}
          onCheckedChange={(v) => setFormatSetting('formatOnSave', v)}
        >
          {m.format_on_save()}
          <ShortcutKeys shortcut={shortcuts.save} />
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
          id="format-strip-prefixes"
          checked={settings.stripPrefixes}
          onCheckedChange={(v) => setFormatSetting('stripPrefixes', v)}
        >
          {m.format_strip_prefixes()}
        </SettingSwitch>
        <SettingSwitch
          id="format-highlighted-first"
          checked={settings.highlightedFirst}
          onCheckedChange={(v) => setFormatSetting('highlightedFirst', v)}
        >
          {m.format_highlighted_first()}
        </SettingSwitch>
        <SettingSwitch
          id="format-shorten-values"
          checked={settings.shortenValues}
          onCheckedChange={(v) => setFormatSetting('shortenValues', v)}
        >
          {m.format_shorten_values()}
        </SettingSwitch>
        {settings.shortenValues && (
          <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-2 text-muted-foreground">
            <span>{m.format_shorten_at()}</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={String(settings.shortenAt)}
              onValueChange={(v) => {
                if (v) setFormatSetting('shortenAt', Number(v))
              }}
            >
              {SHORTEN_AT.map((length) => (
                <ToggleGroupItem
                  key={length}
                  value={String(length)}
                  className="tabular-nums"
                >
                  {length}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span>{m.format_shorten_chars()}</span>
          </div>
        )}
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
          <ToggleGroupItem value="custom" className="flex-1">
            {m.format_sort_custom()}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {settings.sort === 'custom' && (
        <SortOrderEditor order={settings.customOrder} />
      )}
    </>
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
