import { useSyncExternalStore } from 'react'

export type Tema = 'light' | 'dark'
const CLAVE = 'eyc-tema'
const oyentes = new Set<() => void>()

function leer(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function fijar(t: Tema) {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(CLAVE, t)
  } catch {
    /* almacenamiento no disponible: el tema igual se aplica en la sesión */
  }
  oyentes.forEach((f) => f())
}

/** Tema claro por defecto (index.html lo fija antes del primer pintado); compartido por toda la app. */
export function useTema() {
  const tema = useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    leer,
    () => 'light' as Tema,
  )
  return { tema, siguiente: () => fijar(tema === 'light' ? 'dark' : 'light') }
}
