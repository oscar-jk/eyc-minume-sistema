import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Perfil } from '@/lib/tipos'
import { escucharSesion, obtenerPerfil, obtenerSesion } from './api'

interface Estado {
  sesion: Session | null
  perfil: Perfil | null
  cargando: boolean
  recuperando: boolean
  errorPerfil: unknown
}

const Ctx = createContext<Estado>({ sesion: null, perfil: null, cargando: true, recuperando: false, errorPerfil: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [sesion, setSesion] = useState<Session | null>(null)
  const [listo, setListo] = useState(false)
  const [recuperando, setRecuperando] = useState(false)

  useEffect(() => {
    obtenerSesion().then((s) => {
      setSesion(s)
      setListo(true)
    })
    return escucharSesion((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      if (evento === 'SIGNED_OUT') {
        setRecuperando(false)
        qc.clear()
      }
      setSesion(s)
    })
  }, [qc])

  const uid = sesion?.user.id
  const perfil = useQuery({
    queryKey: ['perfil', uid],
    queryFn: () => obtenerPerfil(uid!),
    enabled: !!uid,
    staleTime: 5 * 60_000,
  })

  const valor: Estado = {
    sesion,
    perfil: perfil.data ?? null,
    cargando: !listo || (!!uid && perfil.isPending),
    recuperando,
    errorPerfil: perfil.error,
  }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSesion = () => useContext(Ctx)
