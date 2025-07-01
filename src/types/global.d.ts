export {}

declare global {
  interface Window {
    widgetCacheDebug?: {
      getStats(): { size: number; keys: string[] }
      clear(): void
      getKeys(): string[]
    }
    sessionId?: string
  }

  interface ImportMeta {
    readonly env?: Record<string, string>
  }
}
