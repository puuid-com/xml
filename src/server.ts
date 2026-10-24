import handler from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from './paraglide/server'

// Resolves the locale for every request (URL prefix, then base locale) so
// server-rendered messages match the URL. See
// https://github.com/TanStack/router/tree/main/examples/react/start-i18n-paraglide
export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, () => handler.fetch(req))
  },
}
