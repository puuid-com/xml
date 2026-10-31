import { IconCopy, IconPlus } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'
import { useRef, useState } from 'react'

import { FILE_TYPES, canReadAs } from './file-type'
import { applyPasteChoice } from './paste'
import {
  setPasteChoice,
  setProfileDialog,
  uiStore,
  updatePasteChoice,
} from './ui-store'
import { ProfileTag } from '#/components/profiles/ProfileTag'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useProfiles } from '#/hooks/use-profiles'
import { filesCollection } from '#/lib/store/files'
import { m } from '#/paraglide/messages'
import type { DocLanguage } from '#/lib/document'

/** Asks for the type and profile of content pasted into an empty file. */
export function PasteDialog() {
  const choice = useSelector(uiStore, (s) => s.pasteChoice)
  const profiles = useProfiles()
  const [saving, setSaving] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)
  const file = choice ? filesCollection.get(choice.fileId) : undefined
  const open = !!choice && !!file
  const content = file?.content ?? ''
  const label =
    FILE_TYPES.find((t) => t.value === choice?.language)?.label() ?? ''

  const confirm = async () => {
    if (!choice || saving) return
    setSaving(true)
    await applyPasteChoice(choice).finally(() => setSaving(false))
    setPasteChoice(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) setPasteChoice(null)
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        // Start on the button, so Enter accepts what was detected.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          submitRef.current?.focus()
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void confirm()
          }}
        >
          <DialogHeader>
            <DialogTitle>{m.paste_title()}</DialogTitle>
            <DialogDescription>
              {m.paste_description({ name: file?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <FieldHeading
              id="paste-type"
              hint={choice?.detected.language ? m.paste_detected() : null}
            >
              {m.paste_type()}
            </FieldHeading>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              aria-labelledby="paste-type"
              value={choice?.language ?? ''}
              onValueChange={(value) => {
                if (value) updatePasteChoice({ language: value as DocLanguage })
              }}
              className="w-full"
            >
              {FILE_TYPES.map((type) => (
                <ToggleGroupItem
                  key={type.value}
                  value={type.value}
                  disabled={!canReadAs(content, type.value)}
                  className="flex-1"
                >
                  {type.label()}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="grid gap-2">
            <FieldHeading
              id="paste-profile"
              hint={choice?.detected.profileId ? m.paste_detected() : null}
            >
              {m.paste_profile()}
            </FieldHeading>
            <div className="border">
              <RadioGroup
                aria-labelledby="paste-profile"
                value={choice?.profileId ?? ''}
                onValueChange={(profileId) => updatePasteChoice({ profileId })}
                className="max-h-56 gap-0 overflow-y-auto"
              >
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-2 border-b pr-2 has-data-[state=checked]:bg-muted"
                  >
                    <Label
                      htmlFor={`paste-profile-${profile.id}`}
                      className="min-w-0 flex-1 gap-2 py-2 pl-3 leading-normal"
                    >
                      <RadioGroupItem
                        id={`paste-profile-${profile.id}`}
                        value={profile.id}
                      />
                      <ProfileTag profile={profile} className="max-w-56" />
                      {profile.id === choice?.detected.profileId && (
                        <span className="ml-auto text-[11px] font-normal text-muted-foreground">
                          {m.paste_best_match()}
                        </span>
                      )}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={m.profile_clone({ name: profile.name })}
                      title={m.profile_clone({ name: profile.name })}
                      onClick={() =>
                        setProfileDialog({
                          mode: 'clone',
                          profileId: profile.id,
                        })
                      }
                    >
                      <IconCopy />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start px-3 font-normal text-muted-foreground"
                onClick={() => setProfileDialog({ mode: 'create' })}
              >
                <IconPlus />
                {m.profile_new()}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setPasteChoice(null)}
            >
              {m.cancel()}
            </Button>
            <Button ref={submitRef} type="submit" disabled={saving}>
              {m.paste_open({ type: label })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldHeading({
  id,
  hint,
  children,
}: {
  id: string
  hint: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span id={id} className="text-xs font-medium">
        {children}
      </span>
      {hint && (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {hint}
        </Badge>
      )}
    </div>
  )
}
