/**
 * Modo demostración (ligero): decide si la pestaña está en demo y arma un «fetch» que nunca sale a la red.
 * El motor pesado (base en memoria) se carga recién cuando hace falta.
 *
 *   /?demo=eyc    →  vista de un miembro de EyC
 *   /?demo=subse  →  vista de la Subsecretaría
 *   /?demo=salir  →  vuelve a la app normal
 *
 * El estado vive solo en esta pestaña (sessionStorage): no toca la sesión real ni a otros usuarios.
 */
import { DEMO_USUARIOS, sesionDemo, type RolDemo } from './sesion'

const CLAVE = 'eyc-demo'

const ROLES: RolDemo[] = ['eyc', 'subse', 'sg', 'admin']
const esRol = (v: string | null): v is RolDemo => !!v && (ROLES as string[]).includes(v)

function leerRol(): RolDemo | null {
  try {
    const url = new URL(window.location.href)
    const p = url.searchParams.get('demo')
    if (esRol(p)) sessionStorage.setItem(CLAVE, p)
    if (p === 'salir') sessionStorage.removeItem(CLAVE)
    if (p) {
      url.searchParams.delete('demo')
      window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash)
    }
    const r = sessionStorage.getItem(CLAVE)
    return esRol(r) ? r : null
  } catch {
    return null
  }
}

export const rolDemo: RolDemo | null = typeof window === 'undefined' ? null : leerRol()
export const modoDemo = rolDemo !== null

/** Dirección que no existe: aunque algo se saltara el fetch de la demostración, no habría a dónde llegar. */
export const URL_DEMO = 'https://demostracion.invalid'

export function fetchDemo(entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return import('./motor').then((m) => m.manejar(entrada, init))
}

/** Almacenamiento en memoria con la sesión de demostración ya puesta (no usa localStorage). */
export function almacenDemo() {
  const datos = new Map<string, string>()
  if (rolDemo) datos.set('sb-demo-auth-token', JSON.stringify(sesionDemo(rolDemo)))
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  }
}

/** Los demás perfiles de la demostración, para cambiar de uno a otro. */
export const otrosRoles = (): RolDemo[] => ROLES.filter((r) => r !== rolDemo)
export const NOMBRE_ROL: Record<RolDemo, string> = { eyc: 'Equipo de EyC', subse: 'Subsecretaría', sg: 'Secretaría General', admin: 'Administración' }
export { DEMO_USUARIOS }
