import {
  IconArchive,
  IconBraces,
  IconCheck,
  IconClipboard,
  IconCopy,
  IconDatabaseExport,
  IconDatabaseImport,
  IconDownload,
  IconFileCode,
  IconFilePlus,
  IconFolderOpen,
  IconHighlight,
  IconJson,
  IconLanguage,
  IconLink,
  IconPencil,
  IconPlus,
  IconReplace,
  IconSearch,
  IconTrash,
  IconUserCircle,
  IconVariable,
} from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { useLayoutEffect, useRef, useState } from 'react'

import { downloadBackup, pickBackup } from './backup'
import { newFile, newJsonFile } from './files'
import {
  askDeleteProfile,
  askRename,
  setArchiveOpen,
  setPaletteOpen,
  setProfileDialog,
  uiStore,
} from './ui-store'
import {
  applyDefaultsActive,
  copyActive,
  copyShareLink,
  downloadFile,
  highlightAtCursor,
  resolveVarsActive,
} from '#/components/editor/actions'
import { localeNames } from '#/components/LocaleSwitcher'
import {
  switchProfile,
  switchToNextProfile,
} from '#/components/profiles/actions'
import { ProfileTag } from '#/components/profiles/ProfileTag'
import { Button } from '#/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '#/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Kbd } from '#/components/ui/kbd'
import { useOpenFiles } from '#/hooks/use-files'
import { useHighlights } from '#/hooks/use-highlights'
import { useActiveProfile, useProfiles } from '#/hooks/use-profiles'
import { useTagCounts } from '#/hooks/use-tag-counts'
import { languageOf } from '#/lib/document'
import { profileShortcuts, shortcutLabel, shortcuts } from '#/lib/shortcuts'
import { setHighlight } from '#/lib/store/highlights'
import { setActive } from '#/lib/store/session'
import { m } from '#/paraglide/messages'
import { getLocale, locales, setLocale } from '#/paraglide/runtime'

/** Centered palette of files and actions, opened with ⌘K or the logo. */
export function CommandMenu({
  activeId,
  onOpenFromDisk,
}: {
  activeId: string | null
  onOpenFromDisk: () => void
}) {
  const open = useSelector(uiStore, (s) => s.paletteOpen)
  const returnFocus = useRef<HTMLElement | null>(null)

  // Runs before Radix moves focus into the dialog, so ⌘K then Escape lands
  // back in the editor instead of on the page.
  useLayoutEffect(() => {
    if (!open) return
    const el = document.activeElement
    returnFocus.current =
      el instanceof HTMLElement && el !== document.body ? el : null
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setPaletteOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-1/2 -translate-y-1/2 overflow-hidden rounded-none p-0 sm:max-w-xl"
        onCloseAutoFocus={(e) => {
          if (!returnFocus.current?.isConnected) return
          e.preventDefault()
          returnFocus.current.focus()
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{m.palette_title()}</DialogTitle>
          <DialogDescription>{m.palette_description()}</DialogDescription>
        </DialogHeader>
        <FileCommands activeId={activeId} onOpenFromDisk={onOpenFromDisk} />
      </DialogContent>
    </Dialog>
  )
}

/** The logo in the top bar; opens the command menu. */
export function LogoButton() {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="mx-1 max-md:size-11"
      aria-label={m.palette_open()}
      onClick={() => setPaletteOpen(true)}
    >
      <span className="grid size-5 place-items-center bg-foreground text-background">
        <IconBraces className="size-3" />
      </span>
    </Button>
  )
}

/** Bottom bar control that opens the command menu and shows its shortcut. */
export function CommandMenuButton() {
  return (
    <Button
      variant="ghost"
      size="xs"
      aria-label={m.palette_open()}
      title={m.palette_open()}
      className="gap-1.5 px-1.5 text-[11px] font-normal text-muted-foreground hover:text-foreground max-md:h-11 max-md:min-w-11"
      onClick={() => setPaletteOpen(true)}
    >
      <IconSearch className="size-3.5" />
      <Kbd className="h-4 min-w-4 bg-transparent px-0 text-[11px] font-normal">
        {shortcutLabel(shortcuts.palette)}
      </Kbd>
    </Button>
  )
}

// Mounted only while the dialog is open, so the search resets each time.
function FileCommands({
  activeId,
  onOpenFromDisk,
}: {
  activeId: string | null
  onOpenFromDisk: () => void
}) {
  const files = useOpenFiles()
  const profiles = useProfiles()
  const activeProfile = useActiveProfile()
  const counts = useTagCounts()
  const highlighted = new Set(useHighlights().map((r) => r.tag))
  const [search, setSearch] = useState('')
  // Tags only show once you type, so they don't bury files and actions.
  const tags = search.trim()
    ? [...counts.keys()].filter((t) => !highlighted.has(t)).sort()
    : []

  const run = (fn: () => void) => {
    setPaletteOpen(false)
    // Let the dialog hand focus back to the editor before fn moves it.
    requestAnimationFrame(fn)
  }

  return (
    <Command>
      <CommandInput
        placeholder={m.palette_placeholder()}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="h-[min(26rem,60vh)] max-h-none">
        <CommandEmpty>{m.palette_empty()}</CommandEmpty>
        {files.length > 0 && (
          <CommandGroup heading={m.palette_files()}>
            {files.map((file) => (
              <CommandItem
                key={file.id}
                value={`${file.name} ${file.id}`}
                onSelect={() => run(() => setActive(file.id))}
              >
                {languageOf(file.name, '') === 'json' ? (
                  <IconJson />
                ) : (
                  <IconFileCode />
                )}
                <span className="truncate font-mono">{file.name}</span>
                {file.id === activeId && (
                  <IconCheck className="size-3 text-muted-foreground" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {activeId && (
          <>
            <CommandSeparator />
            <CommandGroup heading={m.palette_current()}>
              <CommandItem onSelect={() => run(() => askRename(activeId))}>
                <IconPencil />
                {m.file_rename()}
                <CommandShortcut>
                  {shortcutLabel(shortcuts.rename)}
                </CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(() => downloadFile(activeId))}>
                <IconDownload />
                {m.file_download()}
              </CommandItem>
              <CommandItem onSelect={() => run(() => void copyActive())}>
                <IconClipboard />
                {m.file_copy()}
              </CommandItem>
              <CommandItem
                keywords={[m.share_keywords()]}
                onSelect={() => run(() => void copyShareLink())}
              >
                <IconLink />
                <div className="flex flex-col">
                  {m.share_copy()}
                  <span className="text-xs text-muted-foreground">
                    {m.share_copy_hint()}
                  </span>
                </div>
              </CommandItem>
            </CommandGroup>
          </>
        )}
        {activeId && activeProfile && (
          <>
            <CommandSeparator />
            <CommandGroup heading={m.profiles_title()}>
              {profiles.map((profile, index) => (
                <CommandItem
                  key={profile.id}
                  value={`profile ${profile.name} ${profile.id}`}
                  onSelect={() => run(() => void switchProfile(profile.id))}
                >
                  <IconUserCircle />
                  <ProfileTag profile={profile} className="max-w-60" />
                  {profile.id === activeProfile.id && (
                    <IconCheck className="size-3 text-muted-foreground" />
                  )}
                  {profileShortcuts[index] && (
                    <CommandShortcut>
                      {shortcutLabel(profileShortcuts[index])}
                    </CommandShortcut>
                  )}
                </CommandItem>
              ))}
              {profiles.length > 1 && (
                <CommandItem onSelect={() => run(switchToNextProfile)}>
                  <IconUserCircle />
                  {m.profile_next()}
                  <CommandShortcut>
                    {shortcutLabel(shortcuts.nextProfile)}
                  </CommandShortcut>
                </CommandItem>
              )}
              <CommandItem
                onSelect={() => run(() => setProfileDialog({ mode: 'create' }))}
              >
                <IconPlus />
                {m.profile_new()}
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  run(() =>
                    setProfileDialog({
                      mode: 'clone',
                      profileId: activeProfile.id,
                    }),
                  )
                }
              >
                <IconCopy />
                <span className="truncate">
                  {m.profile_clone({ name: activeProfile.name })}
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  run(() =>
                    setProfileDialog({
                      mode: 'edit',
                      profileId: activeProfile.id,
                    }),
                  )
                }
              >
                <IconPencil />
                <span className="truncate">
                  {m.profile_edit({ name: activeProfile.name })}
                </span>
              </CommandItem>
              {profiles.length > 1 && (
                <CommandItem
                  onSelect={() => run(() => askDeleteProfile(activeProfile.id))}
                >
                  <IconTrash />
                  <span className="truncate">
                    {m.profile_delete({ name: activeProfile.name })}
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading={m.palette_actions()}>
          <CommandItem onSelect={() => run(() => setArchiveOpen(true))}>
            <IconArchive />
            {m.archive_title()}
          </CommandItem>
          <CommandItem onSelect={() => run(newFile)}>
            <IconFilePlus />
            {m.file_new()}
            <CommandShortcut>
              {shortcutLabel(shortcuts.newFile)}
            </CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(newJsonFile)}>
            <IconFilePlus />
            {m.file_new_json()}
          </CommandItem>
          <CommandItem onSelect={() => run(onOpenFromDisk)}>
            <IconFolderOpen />
            {m.file_open_disk()}
            <CommandShortcut>
              {shortcutLabel(shortcuts.openFile)}
            </CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => void highlightAtCursor())}>
            <IconHighlight />
            {m.highlight_at_cursor()}
            <CommandShortcut>
              {shortcutLabel(shortcuts.highlight)}
            </CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => void applyDefaultsActive())}>
            <IconReplace />
            {m.defaults_apply()}
            <CommandShortcut>
              {shortcutLabel(shortcuts.applyDefaults)}
            </CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(resolveVarsActive)}>
            <IconVariable />
            {m.vars_resolve()}
            <CommandShortcut>
              {shortcutLabel(shortcuts.resolveVars)}
            </CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(downloadBackup)}>
            <IconDatabaseExport />
            {m.backup_create()}
          </CommandItem>
          <CommandItem onSelect={() => run(pickBackup)}>
            <IconDatabaseImport />
            {m.backup_restore()}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={m.language_label()}>
          {locales.map((locale) => (
            <CommandItem
              key={locale}
              value={`language ${localeNames[locale]}`}
              lang={locale}
              onSelect={() => run(() => void setLocale(locale))}
            >
              <IconLanguage />
              {localeNames[locale]}
              {locale === getLocale() && (
                <IconCheck className="size-3 text-muted-foreground" />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        {tags.length > 0 && (
          <CommandGroup heading={m.highlights_title()}>
            {tags.map((tag) => (
              <CommandItem
                key={tag}
                value={`highlight ${tag}`}
                onSelect={() => run(() => setHighlight(tag))}
              >
                <IconHighlight />
                <span className="truncate">
                  {m.highlight_tag({ name: tag })}
                </span>
                <CommandShortcut className="text-[11px] tracking-normal tabular-nums">
                  {counts.get(tag)}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex items-center gap-4 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          {m.palette_hint_navigate()}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          {m.palette_hint_select()}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Kbd>Esc</Kbd>
          {m.palette_hint_close()}
        </span>
      </div>
    </Command>
  )
}
