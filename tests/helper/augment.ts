export {}

declare global {
  interface Window {
    widgetCacheDebug?: {
      getStats(): { size: number; keys: string[] }
      clear(): void
      getKeys(): string[]
    }
  }
}
