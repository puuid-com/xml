import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { dismissNotice, noticeStore } from './notice-store'
import { ToolbarButton } from './ToolbarButton'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

/** Latest notice, on the left of the status bar. Stays mounted as a live region. */
export function StatusNotice() {
  const notice = useSelector(noticeStore, (n) => n)
  const error = notice?.tone === 'error'

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex max-w-[min(32rem,50%)] min-w-0 shrink items-center"
    >
      {notice && (
        <>
          <span
            title={[notice.message, notice.detail].filter(Boolean).join(': ')}
            className={cn(
              'flex min-w-0 items-center gap-1.5 px-1.5 text-foreground',
              error && 'text-destructive',
            )}
          >
            {notice.tone === 'success' && <IconCheck className="size-3" />}
            {error && <IconAlertCircle className="size-3" />}
            <span className="truncate">
              {notice.message}
              {notice.detail && (
                <span className={cn(!error && 'text-muted-foreground')}>
                  {': '}
                  {notice.detail}
                </span>
              )}
            </span>
          </span>
          {notice.action && (
            <Button
              variant="link"
              size="xs"
              className="h-auto px-1 text-[11px] text-foreground underline max-md:h-11"
              onClick={() => {
                notice.action?.run()
                dismissNotice(notice.id)
              }}
            >
              {notice.action.label}
            </Button>
          )}
          {(error || notice.sticky) && (
            <ToolbarButton
              label={m.notice_dismiss()}
              className="text-muted-foreground"
              onClick={() => dismissNotice(notice.id)}
            >
              <IconX />
            </ToolbarButton>
          )}
        </>
      )}
    </div>
  )
}
