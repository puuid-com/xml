import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react'
import { useSelector } from '@tanstack/react-store'

import { dismissNotice, noticeStore } from './notice-store'
import { ToolbarButton } from './ToolbarButton'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { m } from '#/paraglide/messages'

/**
 * Latest notice, at the right of the top bar. It floats over the end of the
 * tabs instead of holding space, and stays mounted as a live region, so
 * notices never move the bar.
 */
export function StatusNotice() {
  const notice = useSelector(noticeStore, (n) => n)
  const error = notice?.tone === 'error'

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative w-0 shrink-0 self-stretch text-[11px] whitespace-nowrap text-muted-foreground"
    >
      {notice && (
        <div className="absolute inset-y-0 right-0 z-20 flex w-max max-w-40 items-center overflow-hidden bg-[color-mix(in_oklab,var(--foreground)_5%,var(--background))] shadow-[inset_0_-1px_var(--border)] md:max-w-72">
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
        </div>
      )}
    </div>
  )
}
