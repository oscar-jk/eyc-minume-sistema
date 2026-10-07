import { useEffect, useState } from 'react'

export type Tema = 'sistema' | 'light' | 'dark'
const CLAVE = 'eyc-tema'

function leer(): Tema {
  try {
    const t = localStorage.getItem(CLAVE)
    return t === 'light' || t === 'dark' ? t : 'sistema'
  } catch {
    return 'sistema'
  }
}

/** Preferencia de tema del navegador (único uso de localStorage en la app). */
export function useTema() {
  const [tema, setTema] = useState<Tema>(leer)
  useEffect(() => {
    const el = document.documentElement
    if (tema === 'sistema') delete el.dataset.theme
    else el.dataset.theme = tema
    try {
      if (tema === 'sistema') localStorage.removeItem(CLAVE)
      else localStorage.setItem(CLAVE, tema)
    } catch {
      /* almacenamiento no disponible: el tema igual se aplica en la sesión */
    }
  }, [tema])
  const siguiente = () => setTema((t) => (t === 'sistema' ? 'light' : t === 'light' ? 'dark' : 'sistema'))
  return { tema, siguiente }
}
