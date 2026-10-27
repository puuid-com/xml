const formatters = new Map<string, Intl.DateTimeFormat>()

/** Workspace timestamps, formatted in the app locale and browser time zone. */
export function formatDateTime(date: number | string, locale: string) {
  let formatter = formatters.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    formatters.set(locale, formatter)
  }
  return formatter.format(new Date(date))
}
