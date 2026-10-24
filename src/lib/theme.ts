// Runs before first paint so the page never flashes the wrong theme.
// Follows the system preference and keeps following it while the page is open.
export const themeScript = `(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => document.documentElement.classList.toggle('dark', media.matches)
  apply()
  media.addEventListener('change', apply)
})()`
