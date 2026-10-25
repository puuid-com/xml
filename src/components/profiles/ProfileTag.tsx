import { hlStyle } from '#/components/highlights/hl-style'
import { profileCss } from '#/lib/store/profiles'
import { cn } from '#/lib/utils'
import type { Profile } from '#/lib/store/profiles'

/** A profile's name on a wash of its colour, styled like a highlighted tag. */
export function ProfileTag({
  profile,
  className,
  ...props
}: {
  profile: Pick<Profile, 'name' | 'color'>
} & React.ComponentProps<'span'>) {
  return (
    <span
      style={hlStyle(profileCss(profile))}
      className={cn(
        'hl-tag hl-ink inline-flex max-w-32 min-w-0 shrink-0 items-center px-1 text-[11px] leading-4 font-medium',
        className,
      )}
      {...props}
    >
      <span className="truncate">{profile.name}</span>
    </span>
  )
}
