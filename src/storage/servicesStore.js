const STORAGE_KEY = 'services'

export function load () {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    console.error('Failed to parse services from localStorage:', e)
    return []
  }
}

export function save (services) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services))
}
