// Keeps one instance across hot module reloads. A recreated collection would
// detach live queries that are still mounted.
const registry = ((
  globalThis as Record<string, unknown>
).__xmlEditorSingletons ??= new Map<string, unknown>()) as Map<string, unknown>

export function singleton<T>(key: string, create: () => T): T {
  if (!registry.has(key)) registry.set(key, create())
  return registry.get(key) as T
}
