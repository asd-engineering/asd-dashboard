import type { Service } from '../../src/types.js'

/**
 * Tunnel-based service fixtures mirroring hub-services-public.json structure.
 * All URLs use tunnel hostname instead of localhost.
 */
export const tunnelServices: Service[] = [
  {
    id: 'ttyd',
    name: 'ASD Terminal',
    url: 'https://hub-kelvin.eu1.tn.asd.engineer/asde/terminal',
    state: 'online',
    maxInstances: 10
  },
  {
    id: 'codeserver',
    name: 'ASD Code',
    url: 'https://hub-kelvin.eu1.tn.asd.engineer/asde/codeserver',
    state: 'offline',
    fallback: {
      name: 'Start Service',
      url: 'https://hub-kelvin.eu1.tn.asd.engineer/asde/terminal/?arg=asd&arg=code&arg=start',
      method: 'GET'
    },
    maxInstances: 10
  },
  {
    id: 'mitmproxy',
    name: 'ASD Inspect',
    url: 'https://hub-kelvin.eu1.tn.asd.engineer/asde/inspect',
    state: 'online',
    fallback: {
      name: 'Stop Service',
      url: 'https://hub-kelvin.eu1.tn.asd.engineer/asde/terminal/?arg=asd&arg=inspect&arg=stop',
      method: 'GET'
    },
    maxInstances: 10
  },
  {
    id: 'dbgate',
    name: 'ASD Database',
    url: 'https://hub-kelvin.eu1.tn.asd.engineer/asde/database',
    state: 'online',
    fallback: {
      name: 'Stop Service',
      url: 'https://hub-kelvin.eu1.tn.asd.engineer/asde/terminal/?arg=asd&arg=database&arg=stop',
      method: 'GET'
    },
    maxInstances: 10
  },
  {
    id: 'supabase:studio',
    name: 'Studio',
    url: 'https://studio-kelvin.eu1.tn.asd.engineer/project/default',
    state: 'online',
    maxInstances: 10
  },
  {
    id: 'supabase:mailpit',
    name: 'Mailpit',
    url: 'https://mail-kelvin.eu1.tn.asd.engineer/',
    state: 'online',
    maxInstances: 10
  }
]

/**
 * Same services but with ttyd offline (for widget offline guard tests).
 */
export const tunnelServicesWithTtydOffline: Service[] = tunnelServices.map(s =>
  s.id === 'ttyd' ? { ...s, state: 'offline' as const } : s
)

/**
 * Services without ttyd at all (for missing ttyd tests).
 */
export const tunnelServicesWithoutTtyd: Service[] = tunnelServices.filter(s => s.id !== 'ttyd')
