import { useSelector } from '@tanstack/react-store'
import { useMemo } from 'react'

import { ShortcutKeys } from './ShortcutKeys'
import {
  applyDefaultsActive,
  convertVarsActive,
  formatActive,
  resolveVarsActive,
} from '#/components/editor/actions'
import { editorStore, getText } from '#/components/editor/editor-store'
import { switchToNextProfile } from '#/components/profiles/actions'
import { ProfileTag } from '#/components/profiles/ProfileTag'
import { Button } from '#/components/ui/button'
import { Toggle } from '#/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { useEnabledDefaults } from '#/hooks/use-defaults'
import {
  useActiveProfile,
  useFormatSettings,
  useProfiles,
} from '#/hooks/use-profiles'
import { profileShortcuts, shortcuts } from '#/lib/shortcuts'
import { setFormatSetting } from '#/lib/store/profiles'
import { defaultSummary } from '#/lib/xml/defaults'
import { varStyles, writeVar } from '#/lib/xml/vars'
import { m } from '#/paraglide/messages'
import type { Shortcut } from '#/lib/shortcuts'
import type { VarStyle } from '#/lib/xml/vars'

const VAR_STYLES: Array<VarStyle> = ['curly', 'angle', 'dollar']

let lastVars = { revision: -1, value: varStyles('') }

/** Variables of the active text, read again only after a new parse. */
function varsAt(revision: number) {
  if (lastVars.revision !== revision)
    lastVars = { revision, value: varStyles(getText()) }
  return lastVars.value
}

/**
 * Bottom bar summary of how the active file is set up, read as a sentence
 * (profile, variable style, format on save), then the actions that use it.
 */
export function ActionBar() {
  const doc = useSelector(editorStore, (s) => s.doc)
  const vars = useSelector(editorStore, (s) => varsAt(s.revision))
  const rules = useEnabledDefaults()
  const defaults = useMemo(
    () =>
      defaultSummary(doc.nodes, rules).reduce((n, rule) => n + rule.count, 0),
    [doc, rules],
  )

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
      <ProfileSwitch />
      {vars.count > 0 && (
        <>
          <span className="-ml-1.5 max-lg:hidden">, {m.status_vars_as()}</span>
          <VarStyleSwitch style={vars.style} />
        </>
      )}
      <FormatOnSave />
      <span
        aria-hidden
        className="mx-1 h-4 w-px shrink-0 self-center bg-border"
      />
      <div className="flex items-center text-foreground">
        <ActionButton
          label={m.action_format()}
          shortcut={shortcuts.format}
          onClick={formatActive}
        >
          {m.action_format()}
        </ActionButton>
        <ActionButton
          label={m.defaults_apply()}
          detail={
            defaults > 0 ? m.status_defaults_count({ count: defaults }) : null
          }
          shortcut={shortcuts.applyDefaults}
          onClick={applyDefaultsActive}
        >
          {m.defaults_apply()}
          <Count value={defaults} />
        </ActionButton>
        <ActionButton
          label={m.vars_resolve()}
          detail={
            vars.count > 0 ? m.status_vars_count({ count: vars.count }) : null
          }
          shortcut={shortcuts.resolveVars}
          onClick={resolveVarsActive}
        >
          {m.vars_resolve_short()}
          <Count value={vars.count} />
        </ActionButton>
      </div>
    </div>
  )
}

/** The active profile, named as one; a click moves the file to the next. */
function ProfileSwitch() {
  const profiles = useProfiles()
  const active = useActiveProfile()
  if (!active) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={switchToNextProfile}
          aria-label={`${m.profile_label({ name: active.name })}. ${m.status_profile_hint()}`}
          className="flex shrink-0 items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 max-md:h-11"
        >
          <span>{m.status_profile()}</span>
          <ProfileTag
            profile={active}
            className="decoration-dotted underline-offset-2 hover:underline"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent className="flex-col items-stretch gap-1 py-2">
        {profiles.map((profile, index) => (
          <span
            key={profile.id}
            className="flex items-center justify-between gap-4 data-[active=true]:font-semibold"
            data-active={profile.id === active.id}
          >
            {profile.name}
            {profileShortcuts[index] && (
              <ShortcutKeys shortcut={profileShortcuts[index]} />
            )}
          </span>
        ))}
        <span className="mt-1 flex items-center justify-between gap-4 opacity-70">
          {m.status_profile_hint()}
          <ShortcutKeys shortcut={shortcuts.nextProfile} />
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

/** The bracket style the file's variables share; picking one rewrites them all. */
function VarStyleSwitch({ style }: { style: VarStyle | null }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      aria-label={m.vars_convert()}
      value={style ?? ''}
      onValueChange={(value) => {
        if (value) convertVarsActive(value as VarStyle)
      }}
      className="shrink-0"
    >
      {VAR_STYLES.map((option) => (
        <ToggleGroupItem
          key={option}
          value={option}
          aria-label={m.status_vars_switch({ style: writeVar('x', option) })}
          title={m.status_vars_switch({ style: writeVar('x', option) })}
          className="h-5 min-w-0 px-1.5 font-mono text-[10.5px] font-normal text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:text-background max-md:h-8"
        >
          {writeVar('x', option)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function FormatOnSave() {
  const { formatOnSave } = useFormatSettings()
  return (
    <span className="flex shrink-0 items-center gap-1 max-lg:hidden">
      <span className="-ml-1.5">, {m.status_format_on_save()}</span>
      <Toggle
        size="sm"
        pressed={formatOnSave}
        onPressedChange={(v) => setFormatSetting('formatOnSave', v)}
        aria-label={m.format_on_save()}
        className="h-5 min-w-0 px-1 text-[11px] font-normal text-foreground underline decoration-muted-foreground decoration-dotted underline-offset-3 aria-pressed:bg-transparent data-[state=on]:bg-transparent"
      >
        {formatOnSave ? m.status_on() : m.status_off()}
      </Toggle>
    </span>
  )
}

/** Muted count after an action's label; nothing when zero. */
function Count({ value }: { value: number }) {
  if (value === 0) return null
  return (
    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
      {value}
    </span>
  )
}

/** Text button whose tooltip spells out the action and its shortcut. */
function ActionButton({
  label,
  detail,
  shortcut,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string
  detail?: string | null
  shortcut: Shortcut
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="gap-1.5 px-1.5 text-[11px] font-normal max-md:h-11"
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        <span className="flex flex-col">
          {label}
          {detail && <span className="opacity-70">{detail}</span>}
        </span>
        <ShortcutKeys shortcut={shortcut} />
      </TooltipContent>
    </Tooltip>
  )
}
