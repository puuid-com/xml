// Locale switcher refs:
// - Paraglide docs: https://inlang.com/m/gerre34r/library-inlang-paraglideJs
// - Router example: https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#switching-locale
import { getLocale, locales, setLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

import type { Locale } from '#/paraglide/runtime'

const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
}

export function LocaleSwitcher() {
  const currentLocale = getLocale()

  return (
    <Select
      value={currentLocale}
      onValueChange={(locale) => setLocale(locale as Locale)}
    >
      <SelectTrigger size="sm" aria-label={m.language_label()}>
        <SelectValue>{localeNames[currentLocale]}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale} lang={locale}>
            {localeNames[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
