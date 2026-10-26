import { useEffect, useState } from 'react'

import { notify } from './notice-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { decodeShare, isShareHash, ShareError } from '#/lib/share'
import type { SharedFile } from '#/lib/share'
import { createFile } from '#/lib/store/files'
import { setActive } from '#/lib/store/session'
import { m } from '#/paraglide/messages'

/** Drops the fragment so a reload doesn't ask again. */
function clearHash() {
  const { pathname, search } = window.location
  history.replaceState(history.state, '', pathname + search)
}

/** Asks before opening a file carried in a `#share=` link. */
export function ShareDialog() {
  const [shared, setShared] = useState<SharedFile | null>(null)

  useEffect(() => {
    const read = () => {
      const { hash } = window.location
      if (!isShareHash(hash)) return
      decodeShare(hash)
        .then(setShared)
        .catch((error: unknown) => {
          clearHash()
          notify.error(
            error instanceof ShareError && error.reason === 'too-long'
              ? m.share_open_too_large()
              : m.share_open_invalid(),
          )
        })
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  const close = () => {
    clearHash()
    setShared(null)
  }

  return (
    <AlertDialog
      open={!!shared}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.share_open_title({ name: shared?.name ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.share_open_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.share_open_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (shared) {
                const file = createFile(shared.name, shared.content)
                setActive(file.id)
                notify.success(m.share_opened({ name: file.name }))
              }
              close()
            }}
          >
            {m.share_open_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
