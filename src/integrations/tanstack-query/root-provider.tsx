import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, data fetched on the server would otherwise be refetched
        // immediately on the client.
        staleTime: 60 * 1000,
      },
    },
  })

  return {
    queryClient,
  }
}
