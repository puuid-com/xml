const storageKey = 'theme'

// Runs before first paint so the page never flashes the wrong theme.
// Uses the stored choice when there is one, otherwise follows the system
// preference and keeps following it while the page is open.
export const themeScript = `(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => {
    const stored = localStorage.getItem('${storageKey}')
    const dark = stored ? stored === 'dark' : media.matches
    document.documentElement.classList.toggle('dark', dark)
  }
  apply()
  media.addEventListener('change', apply)
})()`

/** Flips between light and dark and remembers the choice. */
export function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark')
  localStorage.setItem(storageKey, dark ? 'dark' : 'light')
}
